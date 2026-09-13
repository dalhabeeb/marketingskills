import { useState } from 'react';
import Card from './Card.jsx';

const DEADLINES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function DomainColumn({ domain, onAddCard, onDeleteCard, onToggleCard, onToggleSubtask }) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [subtasksText, setSubtasksText] = useState('');
  const [deadline, setDeadline] = useState('Thu');
  const [busy, setBusy] = useState(false);

  const doneCount = domain.cards.filter((c) => c.done).length;

  const resetForm = () => {
    setTitle('');
    setSubtasksText('');
    setDeadline('Thu');
    setAdding(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setBusy(true);
    try {
      const subtasks = subtasksText
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await onAddCard({ domainId: domain.id, title: title.trim(), deadline, subtasks });
      resetForm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="domain-column" style={{ '--domain-color': domain.color }}>
      <div className="domain-column__header">
        <span className="domain-dot" />
        <h2>{domain.name}</h2>
        <span className="domain-column__count">
          {doneCount}/{domain.cards.length}
        </span>
      </div>

      <div className="domain-column__cards">
        {domain.cards.map((card) => (
          <Card
            key={card.id}
            card={card}
            onDelete={() => onDeleteCard(card.id)}
            onToggle={() => onToggleCard(card.id)}
            onToggleSubtask={onToggleSubtask}
          />
        ))}
        {domain.cards.length === 0 && !adding && (
          <p className="domain-column__empty">No cards yet.</p>
        )}
      </div>

      {adding ? (
        <form className="add-card-form" onSubmit={submit}>
          <input
            autoFocus
            type="text"
            placeholder="Card title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="text"
            placeholder="Subtasks, comma-separated (optional)"
            value={subtasksText}
            onChange={(e) => setSubtasksText(e.target.value)}
          />
          <div className="add-card-form__row">
            <select value={deadline} onChange={(e) => setDeadline(e.target.value)}>
              {DEADLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button type="submit" className="btn btn--small btn--primary" disabled={busy}>
              Add
            </button>
            <button type="button" className="btn btn--small" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button className="btn btn--ghost btn--full" onClick={() => setAdding(true)}>
          + Add card
        </button>
      )}
    </div>
  );
}
