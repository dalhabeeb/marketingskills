import DomainColumn from './DomainColumn.jsx';

export default function Board({ domains, onAddCard, onDeleteCard, onToggleCard, onToggleSubtask }) {
  return (
    <section className="board">
      {domains.map((domain) => (
        <DomainColumn
          key={domain.id}
          domain={domain}
          onAddCard={onAddCard}
          onDeleteCard={onDeleteCard}
          onToggleCard={onToggleCard}
          onToggleSubtask={onToggleSubtask}
        />
      ))}
    </section>
  );
}
