import DomainColumn from './DomainColumn.jsx';

export default function Board({
  domains,
  onAddCard,
  onDeleteCard,
  onUpdateCard,
  onToggleCard,
  onAddSubtask,
  onToggleSubtask,
  onUpdateSubtask,
  onDeleteSubtask,
}) {
  return (
    <section className="board">
      {domains.map((domain) => (
        <DomainColumn
          key={domain.id}
          domain={domain}
          onAddCard={onAddCard}
          onDeleteCard={onDeleteCard}
          onUpdateCard={onUpdateCard}
          onToggleCard={onToggleCard}
          onAddSubtask={onAddSubtask}
          onToggleSubtask={onToggleSubtask}
          onUpdateSubtask={onUpdateSubtask}
          onDeleteSubtask={onDeleteSubtask}
        />
      ))}
    </section>
  );
}
