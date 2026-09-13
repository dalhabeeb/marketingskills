export default function Card({ card, onDelete, onToggle, onToggleSubtask }) {
  const hasSubtasks = card.subtasks.length > 0;

  return (
    <div className={`card${card.done ? ' card--done' : ''}`}>
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
        <button className="card__delete" aria-label="Delete card" onClick={onDelete}>
          ×
        </button>
      </div>

      {hasSubtasks && (
        <ul className="subtask-list">
          {card.subtasks.map((s) => (
            <li key={s.id} className="subtask-row">
              <button
                className={`checkbox checkbox--small${s.done ? ' checkbox--checked' : ''}`}
                aria-label={s.done ? 'Mark subtask as not done' : 'Mark subtask as done'}
                onClick={() => onToggleSubtask(s.id)}
              >
                {s.done && <CheckIcon small />}
              </button>
              <span className={s.done ? 'subtask-label subtask-label--done' : 'subtask-label'}>
                {s.label}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
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
