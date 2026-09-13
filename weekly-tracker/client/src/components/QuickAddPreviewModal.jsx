import { useState } from 'react';
import Modal from './Modal.jsx';

const DEADLINES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function QuickAddPreviewModal({ items, domains, onCancel, onConfirm }) {
  const [rows, setRows] = useState(items.map((it, i) => ({ ...it, key: i })));
  const [busy, setBusy] = useState(false);

  const updateRow = (key, patch) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key) => {
    setRows((prev) => prev.filter((r) => r.key !== key));
  };

  const confirm = async () => {
    if (rows.length === 0) return;
    setBusy(true);
    try {
      await onConfirm(
        rows.map((r) => ({ domainId: r.domainId, title: r.title, deadline: r.deadline }))
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal onClose={onCancel} title="Review parsed cards">
      <p className="modal__subtitle">
        Check the domain each line landed in, edit anything that's off, then confirm.
      </p>

      <div className="preview-list">
        {rows.map((row) => (
          <div className="preview-row" key={row.key}>
            <input
              className="preview-row__title"
              type="text"
              value={row.title}
              onChange={(e) => updateRow(row.key, { title: e.target.value })}
            />
            <select
              value={row.domainId}
              onChange={(e) => updateRow(row.key, { domainId: Number(e.target.value) })}
            >
              {domains.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <select
              value={row.deadline}
              onChange={(e) => updateRow(row.key, { deadline: e.target.value })}
            >
              {DEADLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="preview-row__remove"
              aria-label="Remove line"
              onClick={() => removeRow(row.key)}
            >
              ×
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="domain-column__empty">Nothing left to add.</p>}
      </div>

      <div className="modal__actions">
        <button className="btn" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn--primary" onClick={confirm} disabled={busy || rows.length === 0}>
          {busy ? 'Adding…' : `Confirm & add ${rows.length}`}
        </button>
      </div>
    </Modal>
  );
}
