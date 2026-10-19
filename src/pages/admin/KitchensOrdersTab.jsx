import { useMemo, useState } from "react";

const FILTERS = ["All", "Placed", "Preparing", "Ready", "Delivered", "Rejected", "Cancelled"];
const DELIVERED = ["Delivered", "Delivered and Paid", "Cash received and delivered"];

export default function KitchensOrdersTab({ chefs, reviews, orders }) {
  const [filter, setFilter] = useState("All");
  const visibleOrders = useMemo(() => filter === "All" ? orders : orders.filter((order) =>
    filter === "Delivered" ? DELIVERED.includes(order.status) :
      filter === "Ready" ? ["Ready", "Packed and Ready"].includes(order.status) : order.status === filter,
  ), [filter, orders]);
  const kitchens = chefs.map((chef) => ({
    ...chef,
    ratingReviews: reviews.filter((review) => review.sellerId === chef.id),
  }));
  return (
    <section className="admin-tab-content">
      <div className="admin-tab-heading"><div><p className="admin-eyebrow">Society marketplace overview</p><h2>Kitchens and Orders</h2></div></div>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="admin-eyebrow">Home kitchens</p><h3>Kitchens</h3></div></div>
        {kitchens.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Kitchen</th><th>Chef</th><th>Flat</th><th>Presence</th><th>Rating</th></tr></thead><tbody>
          {kitchens.map((chef) => {
            const rating = chef.ratingReviews.length ? chef.ratingReviews.reduce((sum, review) => sum + Number(review.stars || 0), 0) / chef.ratingReviews.length : null;
            return <tr key={chef.id}><td>{chef.kitchenName || "Home Kitchen"}</td><td>{chef.name}</td><td>{[chef.tower, chef.flat].filter(Boolean).join(" · ") || "—"}</td><td><span className={`admin-presence ${chef.online ? "online" : ""}`}>{chef.online ? "Online" : "Offline"}</span></td><td>{rating === null ? "New" : `★ ${rating.toFixed(1)}`}</td></tr>;
          })}
        </tbody></table></div> : <p className="admin-muted">No kitchens are registered yet.</p>}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="admin-eyebrow">Orders across your community</p><h3>Orders</h3></div></div>
        <div className="admin-filter-chips">{FILTERS.map((item) => <button className={filter === item ? "active" : ""} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
        {visibleOrders.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Order</th><th>Kitchen</th><th>Buyer</th><th>Total</th><th>Payment</th><th>Status</th></tr></thead><tbody>
          {visibleOrders.map((order) => <tr key={order.id}><td>#{String(order.id).slice(-6).toUpperCase()}<small>{new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(Number(order.createdAt) || Date.now())}</small></td><td>{chefs.find((chef) => chef.id === order.sellerId)?.kitchenName || "Kitchen"}</td><td>{order.buyerName}<small>{order.buyerFlat}</small></td><td>₹{Number(order.total).toFixed(2)}</td><td>{order.paymentMode}{order.upiRef && <small>Ref: {order.upiRef}</small>}</td><td><span className={`admin-status-badge admin-status-${order.status.toLowerCase().replaceAll(" ", "-")}`}>{order.status}</span></td></tr>)}
        </tbody></table></div> : <div className="admin-empty"><h3>No {filter === "All" ? "" : `${filter.toLowerCase()} `}orders</h3><p>Orders placed in this society will be listed here.</p></div>}
      </section>
    </section>
  );
}
