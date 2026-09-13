import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DB_PATH || path.join(dataDir, 'tracker.db');
export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS domains (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  sort_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  deadline TEXT NOT NULL DEFAULT 'Thu',
  done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subtasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  card_id INTEGER NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS habits (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  unit TEXT NOT NULL,
  target REAL NOT NULL,
  step REAL NOT NULL DEFAULT 1,
  value REAL NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  week_number INTEGER NOT NULL,
  start_date TEXT NOT NULL,
  percentage REAL NOT NULL,
  notes TEXT,
  closed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Every card title/subtask ever created, kept forever (even after the
-- originating card is archived away), purely as training data for the
-- quick-add domain classifier.
CREATE TABLE IF NOT EXISTS classifier_terms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  domain_id INTEGER NOT NULL REFERENCES domains(id) ON DELETE CASCADE,
  text TEXT NOT NULL
);
`);

function getMeta(key, fallback) {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
  return row ? row.value : fallback;
}

function setMeta(key, value) {
  db.prepare(
    'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value'
  ).run(key, String(value));
}

const DOMAIN_SEED = [
  { key: 'tedx', name: 'TEDx', color: '#c0453a' },
  { key: 'study', name: 'Study', color: '#3a5a8c' },
  { key: 'research', name: 'Research', color: '#7a5c9e' },
  { key: 'creative', name: 'Creative', color: '#b8863c' },
];

const HABIT_SEED = [
  { key: 'quran', label: 'Quran', unit: 'pages', target: 2, step: 0.5 },
  { key: 'steps', label: 'Steps', unit: 'days at 10k', target: 7, step: 1 },
  { key: 'training', label: 'Training', unit: 'sessions', target: 3, step: 1 },
  { key: 'running', label: 'Running', unit: 'sessions', target: 2, step: 1 },
];

function seedIfEmpty() {
  const domainCount = db.prepare('SELECT COUNT(*) c FROM domains').get().c;
  if (domainCount === 0) {
    const insert = db.prepare(
      'INSERT INTO domains (key, name, color, sort_order) VALUES (?, ?, ?, ?)'
    );
    DOMAIN_SEED.forEach((d, i) => insert.run(d.key, d.name, d.color, i));
  }

  const habitCount = db.prepare('SELECT COUNT(*) c FROM habits').get().c;
  if (habitCount === 0) {
    const insert = db.prepare(
      'INSERT INTO habits (key, label, unit, target, step, value) VALUES (?, ?, ?, ?, ?, 0)'
    );
    HABIT_SEED.forEach((h) => insert.run(h.key, h.label, h.unit, h.target, h.step));
  }

  if (getMeta('week_number', null) === null) {
    setMeta('week_number', 1);
    setMeta('start_date', new Date().toISOString().slice(0, 10));
  }

  const cardCount = db.prepare('SELECT COUNT(*) c FROM cards').get().c;
  if (cardCount === 0) {
    const domainByKey = Object.fromEntries(
      db.prepare('SELECT key, id FROM domains').all().map((d) => [d.key, d.id])
    );

    const insertCard = db.prepare(
      'INSERT INTO cards (domain_id, title, deadline, done, sort_order) VALUES (?, ?, ?, 0, ?)'
    );
    const insertSubtask = db.prepare(
      'INSERT INTO subtasks (card_id, label, done, sort_order) VALUES (?, ?, 0, ?)'
    );
    const insertTerm = db.prepare(
      'INSERT INTO classifier_terms (domain_id, text) VALUES (?, ?)'
    );

    const seedCard = (domainKey, title, deadline, subtaskLabels, order) => {
      const domainId = domainByKey[domainKey];
      const info = insertCard.run(domainId, title, deadline, order);
      const cardId = info.lastInsertRowid;
      insertTerm.run(domainId, title);
      (subtaskLabels || []).forEach((label, i) => {
        insertSubtask.run(cardId, label, i);
        insertTerm.run(domainId, label);
      });
    };

    seedCard('tedx', 'Contact a past organizer, set a meeting', 'Thu', [], 0);
    seedCard(
      'study',
      'Cardiovascular: finish HTN',
      'Thu',
      ['Pathology', 'Pharmacology 1', 'Pharmacology 2', 'Pharmacology 3', 'Medicinal chemistry'],
      0
    );
    seedCard(
      'study',
      'Respiratory: finish Asthma',
      'Thu',
      ['Pathology', 'Pharmaceutics', 'Therapy', 'Medicinal chemistry', 'Pharmacology'],
      1
    );
    seedCard('research', 'Contact 2 doctors', 'Thu', ['Doctor 1', 'Doctor 2'], 0);
    seedCard('creative', 'Post the old school post', 'Thu', [], 0);
    seedCard('creative', 'Nabati context post', 'Tue', [], 1);
  }
}

seedIfEmpty();

export { getMeta, setMeta };
