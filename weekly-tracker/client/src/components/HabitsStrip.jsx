export default function HabitsStrip({ habits, onBump }) {
  return (
    <section className="habits-strip" aria-label="Weekly habits">
      {habits.map((h) => {
        const pct = Math.min(100, Math.round((h.value / h.target) * 100));
        return (
          <div className="habit-tile" key={h.key}>
            <div className="habit-tile__top">
              <span className="habit-tile__label">{h.label}</span>
              <span className="habit-tile__value">
                {formatNumber(h.value)}
                <span className="habit-tile__target">/{formatNumber(h.target)}</span>
              </span>
            </div>
            <div className="habit-tile__unit">{h.unit}</div>
            <div className="habit-bar">
              <div className="habit-bar__fill" style={{ width: `${pct}%` }} />
            </div>
            <div className="habit-tile__controls">
              <button
                aria-label={`Decrease ${h.label}`}
                className="stepper-btn"
                onClick={() => onBump(h.key, -h.step)}
              >
                −
              </button>
              <button
                aria-label={`Increase ${h.label}`}
                className="stepper-btn"
                onClick={() => onBump(h.key, h.step)}
              >
                +
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function formatNumber(n) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
