import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SiteHeader from "../components/SiteHeader.jsx";
import { getDishes, getSellers, placeCheckout } from "../api/store.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useCart } from "../context/CartContext.jsx";

function groupItems(items, sellers) {
  const sellerById = new Map(sellers.map((seller) => [seller.id, seller]));
  const groups = new Map();
  items.forEach((item) => {
    const group = groups.get(item.sellerId) || { seller: sellerById.get(item.sellerId), items: [] };
    group.items.push(item);
    groups.set(item.sellerId, group);
  });
  return [...groups.values()];
}

export default function Checkout() {
  const { user } = useAuth();
  const { items, clearCart } = useCart();
  const [dishes, setDishes] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [kitchens, setKitchens] = useState({});
  const [loadError, setLoadError] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [createdOrders, setCreatedOrders] = useState(null);
  const groups = useMemo(() => groupItems(items, sellers), [items, sellers]);

  useEffect(() => {
    try {
      setDishes(getDishes(user.societyId));
      setSellers(getSellers(user.societyId));
      setLoadError("");
    } catch (error) {
      setLoadError(error.message || "Checkout details couldn't be loaded.");
    }
  }, [user.societyId]);

  useEffect(() => {
    setKitchens((current) => {
      const next = {};
      groups.forEach(({ seller }) => {
        if (!seller) return;
        next[seller.id] = current[seller.id] || {
          deliveryMode: "Doorstep",
          paymentMode: "Cash on Handover",
          note: "",
          upiRef: "",
        };
      });
      return next;
    });
  }, [groups]);

  const dishById = useMemo(() => new Map(dishes.map((dish) => [dish.id, dish])), [dishes]);
  const grandTotal = items.reduce((sum, item) => sum + Number(item.unit) * Number(item.qty), 0);
  const address = [user.tower, user.flat].filter(Boolean).join(" · ");

  function updateKitchen(sellerId, field, value) {
    setKitchens((current) => ({
      ...current,
      [sellerId]: { ...current[sellerId], [field]: value },
    }));
    setCheckoutError("");
  }

  async function copyUpi(upiId) {
    try {
      await navigator.clipboard.writeText(upiId);
      setCheckoutError("");
    } catch {
      setCheckoutError("We couldn't copy the UPI ID. Please select and copy it manually.");
    }
  }

  function submit(event) {
    event.preventDefault();
    setCheckoutError("");
    try {
      const freshDishes = getDishes(user.societyId);
      const freshSellers = getSellers(user.societyId);
      setDishes(freshDishes);
      setSellers(freshSellers);
      const orders = placeCheckout({ buyer: user, items, kitchens });
      clearCart();
      setCreatedOrders(orders);
    } catch (error) {
      setCheckoutError(error.message || "Your order couldn't be placed. Please check your cart.");
    }
  }

  if (createdOrders) {
    return (
      <div className="app-shell">
        <SiteHeader />
        <main className="commerce-page">
          <section className="section-empty checkout-success">
            <span className="section-empty-icon" aria-hidden="true">🎉</span>
            <p className="eyebrow">Your neighbours are on it</p>
            <h1>Order placed!</h1>
            <p>Your order{createdOrders.length === 1 ? "" : "s"} {createdOrders.length === 1 ? "is" : "are"} on the way to the kitchen.</p>
            <ul className="created-order-list">
              {createdOrders.map((order) => <li key={order.id}>Order #{String(order.id).slice(-6).toUpperCase()}</li>)}
            </ul>
            <Link className="button button-primary" to="/orders">View My Orders</Link>
          </section>
        </main>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="app-shell">
        <SiteHeader />
        <main className="commerce-page">
          <div className="section-empty cart-empty"><h1>Your cart is empty</h1><Link className="button button-primary" to="/">Browse the menu</Link></div>
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="commerce-page">
        <div className="commerce-page-heading"><div><p className="eyebrow">Almost there</p><h1>Checkout</h1></div><Link className="text-action" to="/cart">Back to cart</Link></div>
        {user.status !== "approved" && <p className="commerce-notice" role="status">Ordering unlocks once your Society Admin approves your flat.</p>}
        {loadError && <p className="field-error" role="alert">{loadError}</p>}
        {checkoutError && <p className="field-error commerce-error" role="alert">{checkoutError}</p>}
        <form className="checkout-layout" onSubmit={submit}>
          <div className="checkout-kitchens">
            <section className="checkout-address-panel">
              <p className="eyebrow">Delivery address</p>
              <h2>{user.name}</h2>
              <p>{address || "Your registered flat"}</p>
              <span>{user.mobile}</span>
            </section>
            {groups.map(({ seller, items: kitchenItems }) => {
              if (!seller) return (
                <section className="checkout-kitchen-panel" key="missing-seller">
                  <h2>Kitchen unavailable</h2><p>Return to your cart and remove items from this kitchen.</p>
                </section>
              );
              const subtotal = kitchenItems.reduce((sum, item) => sum + Number(item.unit) * Number(item.qty), 0);
              const kitchen = kitchens[seller.id] || {};
              return (
                <section className="checkout-kitchen-panel" key={seller.id}>
                  <div className="checkout-kitchen-title"><div><p className="eyebrow">Your neighbour's kitchen</p><h2>{seller.kitchenName}</h2></div><strong>₹{subtotal.toFixed(2)}</strong></div>
                  <ul className="checkout-items">
                    {kitchenItems.map((item) => <li key={item.key}><span>{item.qty} × {item.name}</span><strong>₹{(Number(item.unit) * Number(item.qty)).toFixed(2)}</strong></li>)}
                  </ul>
                  <fieldset className="checkout-choice-group">
                    <legend>Delivery</legend>
                    {["Doorstep", "Pickup"].map((mode) => (
                      <label key={mode}><input type="radio" name={`delivery-${seller.id}`} checked={kitchen.deliveryMode === mode} onChange={() => updateKitchen(seller.id, "deliveryMode", mode)} />{mode === "Doorstep" ? "Doorstep delivery" : "Pickup"}</label>
                    ))}
                  </fieldset>
                  {kitchen.deliveryMode === "Doorstep" && <p className="checkout-address-hint">Deliver to: {address || "Your registered flat"}</p>}
                  <fieldset className="checkout-choice-group">
                    <legend>Payment</legend>
                    {["UPI", "Cash on Handover"].map((mode) => (
                      <label key={mode}><input type="radio" name={`payment-${seller.id}`} checked={kitchen.paymentMode === mode} onChange={() => updateKitchen(seller.id, "paymentMode", mode)} />{mode}</label>
                    ))}
                  </fieldset>
                  {kitchen.paymentMode === "UPI" && (
                    <div className="upi-payment-details">
                      <p>Pay the chef directly in your UPI app. No extra fees.</p>
                      <div className="upi-id-line"><strong>{seller.upiId || "UPI ID not provided"}</strong>
                        {seller.upiId && <button className="text-action" type="button" onClick={() => copyUpi(seller.upiId)}>Copy</button>}
                      </div>
                      <label>UPI transaction reference *
                        <input required value={kitchen.upiRef || ""} onChange={(event) => updateKitchen(seller.id, "upiRef", event.target.value)} placeholder="Enter the UPI transaction reference" />
                      </label>
                    </div>
                  )}
                  <label className="checkout-note-field">Delivery note <span className="optional">(optional)</span>
                    <input value={kitchen.note || ""} onChange={(event) => updateKitchen(seller.id, "note", event.target.value)} placeholder="For example, ring the bell" />
                  </label>
                </section>
              );
            })}
          </div>
          <aside className="checkout-summary">
            <p className="eyebrow">Your order</p><h2>Order summary</h2>
            {groups.map(({ seller, items: kitchenItems }) => (
              <div className="checkout-summary-line" key={seller?.id || "missing"}>
                <span>{seller?.kitchenName || "Kitchen"} · {kitchenItems.reduce((sum, item) => sum + Number(item.unit) * Number(item.qty), 0).toFixed(2)}</span>
                <strong>₹{kitchenItems.reduce((sum, item) => sum + Number(item.unit) * Number(item.qty), 0).toFixed(2)}</strong>
              </div>
            ))}
            <div className="checkout-total-line"><span>Grand total</span><strong>₹{grandTotal.toFixed(2)}</strong></div>
            <p>No delivery fee. No platform fee.</p>
            {items.some((item) => !dishById.has(item.dishId)) && <p className="cart-item-issue">A dish is no longer available. Return to your cart to remove it.</p>}
            <button className="button button-primary button-full" type="submit" disabled={user.status !== "approved" || Boolean(loadError)}>
              Place order · ₹{grandTotal.toFixed(2)}
            </button>
          </aside>
        </form>
      </main>
    </div>
  );
}
