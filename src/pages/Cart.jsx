import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import CartGroup from "../components/CartGroup.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import { getCartIssues, getDishes, getSellers } from "../api/store.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

export default function Cart() {
  const { user } = useAuth();
  const { items, updateQuantity, removeItem } = useCart();
  const [dishes, setDishes] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [issues, setIssues] = useState([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    try {
      setDishes(getDishes(user.societyId));
      setSellers(getSellers(user.societyId));
      setIssues(getCartIssues(items, user.societyId));
    } catch (error) {
      setLoadError(error.message || "Your cart couldn't be checked.");
    }
  }, [items, user.societyId]);

  const dishById = useMemo(() => new Map(dishes.map((dish) => [dish.id, dish])), [dishes]);
  const issueByKey = useMemo(() => new Map(issues.map((issue) => [issue.key, issue.message])), [issues]);
  const groups = useMemo(() => {
    const sellerById = new Map(sellers.map((seller) => [seller.id, seller]));
    const grouped = new Map();
    items.forEach((item) => {
      const group = grouped.get(item.sellerId) || { seller: sellerById.get(item.sellerId), items: [] };
      group.items.push(item);
      grouped.set(item.sellerId, group);
    });
    return [...grouped.values()];
  }, [items, sellers]);
  const total = items.reduce((sum, item) => sum + Number(item.unit) * Number(item.qty), 0);
  const blocked = Boolean(loadError) || issues.length > 0 || user.status !== "approved";

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="commerce-page">
        <div className="commerce-page-heading">
          <div><p className="eyebrow">A little something from every kitchen</p><h1>Your Cart</h1></div>
          {!!items.length && <Link className="text-action" to="/">Continue browsing</Link>}
        </div>
        {user.status !== "approved" && (
          <p className="commerce-notice" role="status">
            Ordering unlocks once verified. Verification of residents is handled by your Society Admin via the{" "}
            <Link to="/admin">Society Admin Portal</Link>.
          </p>
        )}
        {loadError && <p className="field-error commerce-error" role="alert">{loadError}</p>}
        {items.length ? (
          <>
            <div className="cart-groups">
              {groups.map((group, index) => (
                <CartGroup key={group.seller?.id || `missing-${index}`} group={group} dishesById={dishById}
                  issuesByKey={issueByKey} onQuantityChange={updateQuantity} onRemove={removeItem} />
              ))}
            </div>
            <section className="cart-checkout-summary">
              <div><span>Menu total</span><strong>₹{total.toFixed(2)}</strong></div>
              <p>No delivery fee or platform fee.</p>
              <Link className={`button button-primary${blocked ? " is-disabled" : ""}`}
                aria-disabled={blocked} to={blocked ? "#" : "/checkout"}
                onClick={(event) => { if (blocked) event.preventDefault(); }}>
                Continue to checkout
              </Link>
              {issues.length > 0 && <span className="cart-block-message">Resolve or remove the flagged items before checkout.</span>}
            </section>
          </>
        ) : (
          <div className="section-empty cart-empty">
            <span className="section-empty-icon" aria-hidden="true">🧺</span>
            <h2>Your cart is waiting for something delicious</h2>
            <p>Add a neighbour's dish from the menu and it will show up here.</p>
            <Link className="button button-primary" to="/">Browse the menu</Link>
          </div>
        )}
      </main>
    </div>
  );
}
