import CartItem from "./CartItem.jsx";

export default function CartGroup({ group, dishesById, issuesByKey, onQuantityChange, onRemove }) {
  const subtotal = group.items.reduce((sum, item) => sum + Number(item.unit) * Number(item.qty), 0);
  return (
    <section className="cart-kitchen-group">
      <header className="cart-kitchen-heading">
        <div>
          <p className="eyebrow">One neighbour's kitchen</p>
          <h2>{group.seller?.kitchenName || "Neighbour's kitchen"}</h2>
          <span>
            {group.seller?.name}
            {[group.seller?.tower, group.seller?.flat].filter(Boolean).map((part) => ` · ${part}`).join("")}
          </span>
        </div>
        <strong>Kitchen subtotal · ₹{subtotal.toFixed(2)}</strong>
      </header>
      <div className="cart-items-list">
        {group.items.map((item) => (
          <CartItem
            key={item.key}
            item={item}
            dish={dishesById.get(item.dishId)}
            issue={issuesByKey.get(item.key)}
            onQuantityChange={(qty) => onQuantityChange(item.key, qty)}
            onRemove={() => onRemove(item.key)}
          />
        ))}
      </div>
    </section>
  );
}
