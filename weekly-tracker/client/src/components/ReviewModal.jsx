import { useState } from 'react';
import Modal from './Modal.jsx';

export default function ReviewModal({ completion, history, onClose, onStartNewWeek }) {
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const hitTarget = completion.percentage >= 90;

  const startNewWeek = async () => {
    setBusy(true);
    try {
      await onStartNewWeek(hitTarget ? null : notes.trim() || null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Thursday review" onClose={onClose}>
      <div className="review-summary">
        <div className="review-summary__percentage">{completion.percentage}%</div>
        <div className="progress-bar progress-bar--large">
          <div
            className="progress-bar__fill"
            style={{ width: `${completion.percentage}%` }}
          />
        </div>
        <p className="review-summary__count">
          {completion.done} of {completion.total} cards finished
        </p>

        {hitTarget ? (
          <p className="review-message review-message--good">You hit it. Go have a good meal.</p>
        ) : (
          <>
            <p className="review-message review-message--bad">Under 90. No meal this week.</p>
            <label className="review-notes-label" htmlFor="review-notes">
              What went wrong?
            </label>
            <textarea
              id="review-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Be honest with yourself…"
            />
          </>
        )}
      </div>

      <div className="modal__actions">
        <button className="btn" onClick={onClose}>
          Keep going
        </button>
        <button className="btn btn--primary" onClick={startNewWeek} disabled={busy}>
          {busy ? 'Starting…' : 'Start new week'}
        </button>
      </div>

      <hr className="modal__divider" />

      <h3 className="history-heading">History</h3>
      {history.length === 0 ? (
        <p className="domain-column__empty">No past weeks recorded yet.</p>
      ) : (
        <ul className="history-list">
          {history.map((h) => (
            <li key={h.id} className="history-row">
              <div className="history-row__top">
                <span className="history-row__week">Week {h.weekNumber}</span>
                <span className="history-row__pct">{h.percentage}%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar__fill" style={{ width: `${h.percentage}%` }} />
              </div>
              {h.notes && <p className="history-row__notes">{h.notes}</p>}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
