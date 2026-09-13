import { useState } from 'react';

export default function QuickAddBox({ onSubmit }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      await onSubmit(text);
    } catch (e2) {
      setErr(e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="quick-add">
      <form onSubmit={submit}>
        <label htmlFor="quick-add-textarea" className="quick-add__label">
          Quick add — paste your week, loose or numbered
        </label>
        <textarea
          id="quick-add-textarea"
          placeholder='e.g. "1- contact someone for TEDx, 2- finish HTN pathology and pharma, 4- contact 2 doctors, post nabati content by tuesday"'
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
        />
        <div className="quick-add__row">
          {err && <span className="quick-add__error">{err}</span>}
          <button type="submit" className="btn btn--primary" disabled={busy || !text.trim()}>
            {busy ? 'Parsing…' : 'Parse into cards'}
          </button>
        </div>
      </form>
    </section>
  );
}
