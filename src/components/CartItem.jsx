export default function CartItem({ item, dish, issue, onQuantityChange, onRemove }) {
  const stock = Math.max(0, Number(dish?.stock) || 0);
  return (
    <article className={`cart-item-card${issue ? " has-cart-issue" : ""}`}>
      <div className="cart-item-copy">
        <h3>{item.name}</h3>
        {item.options?.length > 0 && (
          <p className="cart-item-options">
            {item.options.map((option) => `${option.name}: ${option.choice || option.label}`).join(" · ")}
          </p>
        )}
        {item.note && <p className="cart-item-options">Note: {item.note}</p>}
        {issue && <p className="cart-item-issue" role="alert">{issue}</p>}
        <strong>₹{(Number(item.unit) * Number(item.qty)).toFixed(2)}</strong>
      </div>
      <div className="cart-item-controls">
        <div className="quantity-stepper" aria-label={`${item.name} quantity`}>
          <button type="button" aria-label={`Decrease ${item.name} quantity`} disabled={Number(item.qty) <= 1}
            onClick={() => onQuantityChange(Math.max(1, Number(item.qty) - 1))}>−</button>
          <span>{item.qty}</span>
          <button type="button" aria-label={`Increase ${item.name} quantity`}
            disabled={!dish || stock <= Number(item.qty)}
            onClick={() => onQuantityChange(Math.min(stock, Number(item.qty) + 1))}>+</button>
        </div>
        <button className="text-action danger-action" type="button" onClick={onRemove}>Remove</button>
      </div>
    </article>
  );
}
