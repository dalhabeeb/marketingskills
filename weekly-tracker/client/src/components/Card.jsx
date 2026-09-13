import { useState } from 'react';

const DEADLINES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function Card({
  card,
  onDelete,
  onUpdate,
  onToggle,
  onAddSubtask,
  onToggleSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}) {
  const hasSubtasks = card.subtasks.length > 0;
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(card.title);
  const [deadlineDraft, setDeadlineDraft] = useState(card.deadline);
  const [addingSubtask, setAddingSubtask] = useState(false);
  const [subtaskDraft, setSubtaskDraft] = useState('');

  const startEdit = () => {
    setTitleDraft(card.title);
    setDeadlineDraft(card.deadline);
    setEditing(true);
  };

  const saveEdit = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      setEditing(false);
      setTitleDraft(card.title);
      return;
    }
    if (trimmed !== card.title || deadlineDraft !== card.deadline) {
      onUpdate({ title: trimmed, deadline: deadlineDraft });
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setTitleDraft(card.title);
    setDeadlineDraft(card.deadline);
    setEditing(false);
  };

  const submitSubtask = (e) => {
    e.preventDefault();
    const label = subtaskDraft.trim();
    if (!label) return;
    onAddSubtask(label);
    setSubtaskDraft('');
    setAddingSubtask(false);
  };

  return (
    <div className={`card${card.done ? ' card--done' : ''}`}>
      {editing ? (
        <div className="card__edit-row">
          <input
            autoFocus
            className="card__edit-title"
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
          />
          <select
            className="card__edit-deadline"
            value={deadlineDraft}
            onChange={(e) => setDeadlineDraft(e.target.value)}
          >
            {DEADLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <button className="icon-btn icon-btn--confirm" aria-label="Save" onClick={saveEdit}>
            <CheckIcon />
          </button>
          <button className="icon-btn" aria-label="Cancel" onClick={cancelEdit}>
            ×
          </button>
        </div>
      ) : (
        <div className="card__row">
          <button
            className={`checkbox${card.done ? ' checkbox--checked' : ''}`}
            aria-label={card.done ? 'Mark as not done' : 'Mark as done'}
            disabled={hasSubtasks}
            title={hasSubtasks ? 'Complete all subtasks to finish this card' : undefined}
            onClick={onToggle}
          >
            {card.done && <CheckIcon />}
          </button>
          <span className="card__title">{card.title}</span>
          <span className="tag">{card.deadline}</span>
          <button className="icon-btn" aria-label="Edit card" onClick={startEdit}>
            <PencilIcon />
          </button>
          <button className="icon-btn icon-btn--danger" aria-label="Delete card" onClick={onDelete}>
            ×
          </button>
        </div>
      )}

      {hasSubtasks && (
        <ul className="subtask-list">
          {card.subtasks.map((s) => (
            <SubtaskRow
              key={s.id}
              subtask={s}
              onToggle={() => onToggleSubtask(s.id)}
              onRename={(label) => onUpdateSubtask(s.id, label)}
              onDelete={() => onDeleteSubtask(s.id)}
            />
          ))}
        </ul>
      )}

      {addingSubtask ? (
        <form className="subtask-add-form" onSubmit={submitSubtask}>
          <input
            autoFocus
            type="text"
            placeholder="Subject, e.g. Pathology"
            value={subtaskDraft}
            onChange={(e) => setSubtaskDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setAddingSubtask(false);
                setSubtaskDraft('');
              }
            }}
          />
          <button type="submit" className="icon-btn icon-btn--confirm" aria-label="Add subtask">
            <CheckIcon />
          </button>
          <button
            type="button"
            className="icon-btn"
            aria-label="Cancel"
            onClick={() => {
              setAddingSubtask(false);
              setSubtaskDraft('');
            }}
          >
            ×
          </button>
        </form>
      ) : (
        <button className="subtask-add-trigger" onClick={() => setAddingSubtask(true)}>
          + subject
        </button>
      )}
    </div>
  );
}

function SubtaskRow({ subtask, onToggle, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(subtask.label);

  const save = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== subtask.label) onRename(trimmed);
    else setDraft(subtask.label);
    setEditing(false);
  };

  return (
    <li className="subtask-row">
      <button
        className={`checkbox checkbox--small${subtask.done ? ' checkbox--checked' : ''}`}
        aria-label={subtask.done ? 'Mark subtask as not done' : 'Mark subtask as done'}
        onClick={onToggle}
      >
        {subtask.done && <CheckIcon small />}
      </button>
      {editing ? (
        <input
          autoFocus
          className="subtask-edit-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') {
              setDraft(subtask.label);
              setEditing(false);
            }
          }}
        />
      ) : (
        <span
          className={subtask.done ? 'subtask-label subtask-label--done' : 'subtask-label'}
          onClick={() => setEditing(true)}
        >
          {subtask.label}
        </span>
      )}
      <button className="subtask-remove" aria-label="Remove subtask" onClick={onDelete}>
        ×
      </button>
    </li>
  );
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
      <path
        d="M11.3 2.3a1.5 1.5 0 0 1 2.1 0l.3.3a1.5 1.5 0 0 1 0 2.1L5 13.4l-3 .7.7-3 8.6-8.8Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ small }) {
  const size = small ? 10 : 12;
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
      <path
        d="M3 8.5L6.2 11.7L13 4"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
