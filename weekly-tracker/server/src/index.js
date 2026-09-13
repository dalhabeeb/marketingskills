import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { db, getMeta, setMeta } from './db.js';
import { parseQuickAdd } from './parse.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());

const VALID_DEADLINES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function normalizeDeadline(d) {
  return VALID_DEADLINES.includes(d) ? d : 'Thu';
}

function cardDone(card, subtasks) {
  if (subtasks.length > 0) return subtasks.every((s) => !!s.done);
  return !!card.done;
}

function serializeState() {
  const domains = db.prepare('SELECT * FROM domains ORDER BY sort_order').all();
  const cards = db.prepare('SELECT * FROM cards ORDER BY sort_order, id').all();
  const subtasksAll = db.prepare('SELECT * FROM subtasks ORDER BY sort_order, id').all();
  const habits = db.prepare('SELECT * FROM habits ORDER BY id').all();
  const history = db
    .prepare('SELECT * FROM history ORDER BY week_number DESC, id DESC')
    .all();

  const subtasksByCard = {};
  for (const st of subtasksAll) {
    if (!subtasksByCard[st.card_id]) subtasksByCard[st.card_id] = [];
    subtasksByCard[st.card_id].push({ id: st.id, label: st.label, done: !!st.done });
  }

  const cardsByDomain = {};
  for (const c of cards) {
    const subtasks = subtasksByCard[c.id] || [];
    const card = {
      id: c.id,
      title: c.title,
      deadline: c.deadline,
      done: cardDone(c, subtasks),
      subtasks,
    };
    if (!cardsByDomain[c.domain_id]) cardsByDomain[c.domain_id] = [];
    cardsByDomain[c.domain_id].push(card);
  }

  const domainList = domains.map((d) => ({
    id: d.id,
    key: d.key,
    name: d.name,
    color: d.color,
    cards: cardsByDomain[d.id] || [],
  }));

  const totalCards = cards.length;
  const doneCards = domainList.reduce(
    (sum, d) => sum + d.cards.filter((c) => c.done).length,
    0
  );
  const percentage = totalCards === 0 ? 0 : Math.round((doneCards / totalCards) * 100);

  return {
    week: {
      number: Number(getMeta('week_number', 1)),
      startDate: getMeta('start_date', new Date().toISOString().slice(0, 10)),
    },
    domains: domainList,
    habits: habits.map((h) => ({
      key: h.key,
      label: h.label,
      unit: h.unit,
      target: h.target,
      step: h.step,
      value: h.value,
    })),
    completion: { done: doneCards, total: totalCards, percentage },
    history: history.map((h) => ({
      id: h.id,
      weekNumber: h.week_number,
      startDate: h.start_date,
      percentage: h.percentage,
      notes: h.notes,
      closedAt: h.closed_at,
    })),
  };
}

app.get('/api/state', (req, res) => {
  res.json(serializeState());
});

// ---- Cards ----

app.post('/api/cards', (req, res) => {
  const { domainId, title, deadline, subtasks } = req.body;
  if (!domainId || !title || !String(title).trim()) {
    return res.status(400).json({ error: 'domainId and title are required' });
  }
  const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(domainId);
  if (!domain) return res.status(400).json({ error: 'invalid domainId' });

  const maxOrder =
    db
      .prepare('SELECT COALESCE(MAX(sort_order), -1) m FROM cards WHERE domain_id = ?')
      .get(domainId).m + 1;

  const insertCard = db.prepare(
    'INSERT INTO cards (domain_id, title, deadline, done, sort_order) VALUES (?, ?, ?, 0, ?)'
  );
  const insertSubtask = db.prepare(
    'INSERT INTO subtasks (card_id, label, done, sort_order) VALUES (?, ?, 0, ?)'
  );
  const insertTerm = db.prepare('INSERT INTO classifier_terms (domain_id, text) VALUES (?, ?)');

  const trimmedTitle = String(title).trim();
  const info = insertCard.run(domainId, trimmedTitle, normalizeDeadline(deadline), maxOrder);
  const cardId = info.lastInsertRowid;
  insertTerm.run(domainId, trimmedTitle);

  const subtaskLabels = Array.isArray(subtasks)
    ? subtasks.map((s) => String(s).trim()).filter(Boolean)
    : [];
  subtaskLabels.forEach((label, i) => {
    insertSubtask.run(cardId, label, i);
    insertTerm.run(domainId, label);
  });

  res.status(201).json(serializeState());
});

app.delete('/api/cards/:id', (req, res) => {
  const id = Number(req.params.id);
  db.prepare('DELETE FROM cards WHERE id = ?').run(id);
  res.json(serializeState());
});

app.patch('/api/cards/:id/toggle', (req, res) => {
  const id = Number(req.params.id);
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
  if (!card) return res.status(404).json({ error: 'not found' });
  const subtaskCount = db.prepare('SELECT COUNT(*) c FROM subtasks WHERE card_id = ?').get(id).c;
  if (subtaskCount > 0) {
    return res.status(400).json({ error: 'toggle subtasks instead; card done state is derived' });
  }
  db.prepare('UPDATE cards SET done = ? WHERE id = ?').run(card.done ? 0 : 1, id);
  res.json(serializeState());
});

// ---- Subtasks ----

app.patch('/api/subtasks/:id/toggle', (req, res) => {
  const id = Number(req.params.id);
  const subtask = db.prepare('SELECT * FROM subtasks WHERE id = ?').get(id);
  if (!subtask) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE subtasks SET done = ? WHERE id = ?').run(subtask.done ? 0 : 1, id);
  res.json(serializeState());
});

// ---- Habits ----

app.patch('/api/habits/:key', (req, res) => {
  const key = req.params.key;
  const habit = db.prepare('SELECT * FROM habits WHERE key = ?').get(key);
  if (!habit) return res.status(404).json({ error: 'not found' });
  const delta = Number(req.body.delta);
  if (!Number.isFinite(delta)) return res.status(400).json({ error: 'delta must be a number' });
  const next = Math.max(0, habit.value + delta);
  db.prepare('UPDATE habits SET value = ? WHERE key = ?').run(next, key);
  res.json(serializeState());
});

// ---- Quick add ----

app.post('/api/quickadd/parse', (req, res) => {
  const text = String(req.body.text || '');
  if (!text.trim()) return res.status(400).json({ error: 'text is required' });
  const items = parseQuickAdd(text);
  res.json({ items });
});

app.post('/api/quickadd/confirm', (req, res) => {
  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'items array is required' });
  }
  const insertCard = db.prepare(
    'INSERT INTO cards (domain_id, title, deadline, done, sort_order) VALUES (?, ?, ?, 0, ?)'
  );
  const insertTerm = db.prepare('INSERT INTO classifier_terms (domain_id, text) VALUES (?, ?)');
  const maxOrderStmt = db.prepare(
    'SELECT COALESCE(MAX(sort_order), -1) m FROM cards WHERE domain_id = ?'
  );

  const tx = db.transaction((rows) => {
    for (const row of rows) {
      const domain = db.prepare('SELECT * FROM domains WHERE id = ?').get(row.domainId);
      if (!domain || !row.title || !String(row.title).trim()) continue;
      const order = maxOrderStmt.get(row.domainId).m + 1;
      const title = String(row.title).trim();
      insertCard.run(domain.id, title, normalizeDeadline(row.deadline), order);
      insertTerm.run(domain.id, title);
    }
  });
  tx(items);

  res.status(201).json(serializeState());
});

// ---- Review / week close ----

app.post('/api/review/close', (req, res) => {
  const notes = req.body.notes ? String(req.body.notes) : null;

  const cards = db.prepare('SELECT * FROM cards').all();
  const subtasksAll = db.prepare('SELECT * FROM subtasks').all();
  const subtasksByCard = {};
  for (const st of subtasksAll) {
    if (!subtasksByCard[st.card_id]) subtasksByCard[st.card_id] = [];
    subtasksByCard[st.card_id].push(st);
  }
  const totalCards = cards.length;
  const doneCards = cards.filter((c) => cardDone(c, subtasksByCard[c.id] || [])).length;
  const percentage = totalCards === 0 ? 0 : Math.round((doneCards / totalCards) * 100);

  const weekNumber = Number(getMeta('week_number', 1));
  const startDate = getMeta('start_date', new Date().toISOString().slice(0, 10));

  const unfinished = cards.filter((c) => !cardDone(c, subtasksByCard[c.id] || []));

  const insertHistory = db.prepare(
    'INSERT INTO history (week_number, start_date, percentage, notes) VALUES (?, ?, ?, ?)'
  );
  const insertCard = db.prepare(
    'INSERT INTO cards (domain_id, title, deadline, done, sort_order) VALUES (?, ?, ?, 0, ?)'
  );
  const insertSubtask = db.prepare(
    'INSERT INTO subtasks (card_id, label, done, sort_order) VALUES (?, ?, 0, ?)'
  );
  const deleteAllCards = db.prepare('DELETE FROM cards');
  const resetHabits = db.prepare('UPDATE habits SET value = 0');

  const tx = db.transaction(() => {
    insertHistory.run(weekNumber, startDate, percentage, notes);

    // Carry over unfinished cards with fresh IDs, resetting subtask progress
    // is NOT desired -- keep subtask done state, only the card identity is new.
    const carried = unfinished.map((c) => ({
      domainId: c.domain_id,
      title: c.title,
      deadline: c.deadline,
      done: c.done,
      subtasks: (subtasksByCard[c.id] || []).map((s) => ({ label: s.label, done: s.done })),
    }));

    deleteAllCards.run(); // cascades subtasks

    carried.forEach((c, i) => {
      const info = insertCard.run(c.domainId, c.title, c.deadline, i);
      const newCardId = info.lastInsertRowid;
      if (c.done) db.prepare('UPDATE cards SET done = 1 WHERE id = ?').run(newCardId);
      c.subtasks.forEach((s, j) => {
        const subInfo = insertSubtask.run(newCardId, s.label, j);
        if (s.done) {
          db.prepare('UPDATE subtasks SET done = 1 WHERE id = ?').run(subInfo.lastInsertRowid);
        }
      });
    });

    resetHabits.run();
    setMeta('week_number', weekNumber + 1);
    setMeta('start_date', new Date().toISOString().slice(0, 10));
  });
  tx();

  res.json(serializeState());
});

// ---- Static client (production) ----

const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Weekly tracker server running on http://localhost:${PORT}`);
});
