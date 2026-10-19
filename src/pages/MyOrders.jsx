import { useCallback, useEffect, useState } from "react";
import SiteHeader from "../components/SiteHeader.jsx";
import OrderCard from "../components/OrderCard.jsx";
import { addIssueMessage, cancelOrder, createIssue, getIssues, getOrdersByBuyer, getSellers, reorderToCart } from "../api/store.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

const ACTIVE_STATUSES = ["Placed", "Preparing", "Ready", "Packed and Ready"];

export default function MyOrders() {
  const { user } = useAuth();
  const { addItem } = useCart();
  const [orders, setOrders] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const refresh = useCallback(() => {
    try {
      setOrders(getOrdersByBuyer(user.id, user.societyId));
      setSellers(getSellers(user.societyId));
      setIssues(getIssues(user.societyId).filter((issue) => issue.raisedBy === user.id));
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Your orders couldn't be loaded.");
    }
  }, [user.id, user.societyId]);

  useEffect(() => { refresh(); }, [refresh]);
  const sellerById = new Map(sellers.map((seller) => [seller.id, seller]));
  const active = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const past = orders.filter((order) => !ACTIVE_STATUSES.includes(order.status));

  function handleCancel(order) {
    if (!window.confirm("Cancel this order? The portions will be returned to the kitchen's stock.")) return;
    setMessage("");
    try {
      cancelOrder(order.id, user.id);
      setMessage("Your order was cancelled and the portions were returned to stock.");
      refresh();
    } catch (cancelError) {
      setError(cancelError.message || "This order couldn't be cancelled.");
    }
  }

  function handleReorder(order) {
    setMessage("");
    setError("");
    try {
      const result = reorderToCart(order);
      result.items.forEach(addItem);
      setMessage(result.skipped.length
        ? `Added available dishes to your cart. Skipped: ${result.skipped.join(", ")}.`
        : "Those dishes are back in your cart.");
    } catch (reorderError) {
      setError(reorderError.message || "Those dishes couldn't be added to your cart.");
    }
  }

  function handleReport(order, values) {
    try {
      createIssue({
        ...values,
        societyId: user.societyId,
        orderId: order.id,
        raisedBy: user.id,
        raisedByName: user.name,
      });
      setMessage("Your issue was sent to the Society Admin.");
      refresh();
      return "";
    } catch (reportError) {
      return reportError.message || "Your issue couldn't be submitted.";
    }
  }

  function handleIssueMessage(issueId, text) {
    try {
      addIssueMessage(issueId, user, text);
      refresh();
      return "";
    } catch (messageError) {
      return messageError.message || "Your message couldn't be sent.";
    }
  }

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="commerce-page">
        <div className="commerce-page-heading"><div><p className="eyebrow">Your neighbourly orders</p><h1>My Orders</h1></div></div>
        {message && <p className="success-message" role="status">{message}</p>}
        {error && <p className="field-error commerce-error" role="alert">{error}</p>}
        {!orders.length && !error ? (
          <div className="section-empty cart-empty">
            <span className="section-empty-icon" aria-hidden="true">🧾</span>
            <h2>No orders yet</h2>
            <p>Your orders from nearby kitchens will appear here.</p>
          </div>
        ) : (
          <div className="my-orders-groups">
            {[["Active", active], ["Past", past]].map(([label, list]) => (
              <section className="my-orders-section" key={label}>
                <h2>{label} orders</h2>
                {list.length ? (
                  <div className="buyer-orders-list">
                    {list.map((order) => (
                      <OrderCard key={order.id} order={order} seller={sellerById.get(order.sellerId)}
                        currentUser={user}
                        issues={issues.filter((issue) => issue.orderId === order.id)}
                        onCancel={handleCancel} onReorder={handleReorder} onReport={handleReport} onIssueMessage={handleIssueMessage} />
                    ))}
                  </div>
                ) : <p className="seller-empty-inline">No {label.toLowerCase()} orders.</p>}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
