function timeLabel(value) {
  const date = new Date(typeof value === "number" ? value : value || Date.now());
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function OrderRow({ order, onAdvance, onReject, error }) {
  const isCash = order.paymentMode === "Cash on Handover";
  const nextStatus = order.status === "Placed"
    ? "Preparing"
    : order.status === "Preparing"
      ? "Ready"
      : ["Ready", "Packed and Ready"].includes(order.status)
        ? "Delivered"
        : null;
  const actionLabel = order.status === "Placed"
    ? "Start preparing"
    : order.status === "Preparing"
      ? "Mark packed & ready"
      : isCash ? "Confirm cash & mark delivered" : "Confirm payment & mark delivered";

  return (
    <article className="seller-order-card">
      <header className="seller-order-header">
        <div>
          <strong>Order #{String(order.id).slice(-6).toUpperCase()}</strong>
          <span>{timeLabel(order.createdAt)}</span>
        </div>
        <span className={`order-status-pill order-status-${order.status.toLowerCase().replaceAll(" ", "-")}`}>{order.status}</span>
      </header>
      <div className="seller-order-buyer">
        <strong>{order.buyerName || "Neighbour"}</strong>
        <span>{order.buyerFlat || "Flat not provided"}{order.buyerPhone && ` · ${order.buyerPhone}`}</span>
      </div>
      <ul className="seller-order-items">
        {(order.items || []).map((item, index) => (
          <li key={`${item.dishId}-${index}`}>
            <span>{item.qty} × {item.name}</span>
            <strong>₹{Number(item.unit) * Number(item.qty)}</strong>
            {!!item.options?.length && (
              <small>{item.options.map((option) => `${option.name}: ${option.choice || option.label}`).join(" · ")}</small>
            )}
            {item.note && <small>Note: {item.note}</small>}
          </li>
        ))}
      </ul>
      {order.note && <p className="seller-order-note"><strong>Buyer note:</strong> {order.note}</p>}
      <div className="seller-order-details">
        <span>{order.deliveryMode === "Pickup" ? "Pickup" : "Doorstep delivery"}</span>
        <span>{order.paymentMode}</span>
        <strong>Total · ₹{Number(order.total).toFixed(0)}</strong>
      </div>
      {order.paymentMode === "UPI" && order.upiRef && (
        <p className="seller-order-note"><strong>UPI transaction reference:</strong> {order.upiRef}</p>
      )}
      {error && <p className="field-error" role="alert">{error}</p>}
      {(nextStatus || order.status === "Placed") && (
        <div className="seller-order-actions">
          {nextStatus && <button className="button button-primary" type="button" onClick={() => onAdvance(order, nextStatus)}>{actionLabel}</button>}
          {order.status === "Placed" && <button className="reject-order-button" type="button" onClick={() => onReject(order)}>Reject</button>}
        </div>
      )}
    </article>
  );
}
