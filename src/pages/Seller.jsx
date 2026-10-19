import { useCallback, useEffect, useMemo, useState } from "react";
import PollCard from "../components/PollCard.jsx";
import PollModal from "../components/PollModal.jsx";
import DishForm from "../components/DishForm.jsx";
import OrderRow from "../components/OrderRow.jsx";
import IssueThread from "../components/IssueThread.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import StatCard from "../components/StatCard.jsx";
import {
  closePoll,
  createPoll,
  deleteDish,
  getDishes,
  getCommissionDue,
  getIssues,
  getOrders,
  getPolls,
  getReviews,
  getSettings,
  getSociety,
  placeOrder,
  rejectOrder,
  saveDishes,
  updateDish,
  updateOrderStatus,
  votePoll,
  addIssueMessage,
} from "../api/store.js";
import { useAuth } from "../context/AuthContext.jsx";

const TABS = ["Dashboard", "My Dishes", "Orders", "Polls", "Issues"];
const ORDER_FILTERS = ["All", "Placed", "Preparing", "Ready", "Delivered", "Rejected", "Cancelled"];
const DELIVERED_STATUSES = ["Delivered", "Delivered and Paid", "Cash received and delivered"];
const ACTIVE_STATUSES = ["Placed", "Preparing", "Ready", "Packed and Ready"];
const NEXT_WEEKEND_TEMPLATE = {
  question: "What should I make for next weekend's special?",
  tag: "Weekend Special",
};
const DELIVERY_TIME_TEMPLATE = {
  question: "What's your preferred delivery time?",
  tag: "Timings",
};

function averageRating(reviews) {
  if (!reviews.length) return null;
  return reviews.reduce((total, review) => total + Number(review.stars || 0), 0) / reviews.length;
}

function dateValue(value) {
  const date = new Date(typeof value === "number" ? value : value || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function isToday(value) {
  const date = dateValue(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
}

function getLastSevenDays(orders) {
  const firstDay = new Date();
  firstDay.setHours(0, 0, 0, 0);
  firstDay.setDate(firstDay.getDate() - 6);
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(firstDay);
    day.setDate(firstDay.getDate() + index);
    const total = orders
      .filter((order) => DELIVERED_STATUSES.includes(order.status) && dateValue(order.createdAt).toDateString() === day.toDateString())
      .reduce((sum, order) => sum + Number(order.total || 0) - Number(order.commissionAmount || 0), 0);
    return {
      label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(day),
      total,
    };
  });
}

function SellerHeaderCard({ seller, onToggle, toggleDisabled, lockMessage, activeOrderCount, onSaveUpiId }) {
  const [upiId, setUpiId] = useState(seller.upiId || "");
  const [upiMessage, setUpiMessage] = useState("");
  const [upiError, setUpiError] = useState("");

  function saveUpi(event) {
    event.preventDefault();
    setUpiError("");
    const error = onSaveUpiId(upiId.trim());
    if (error) {
      setUpiError(error);
      return;
    }
    setUpiMessage("UPI ID saved.");
  }

  return (
    <section className="seller-profile-card">
      <div className="seller-profile-identity">
        <div className="seller-profile-mark" aria-hidden="true">
          {(seller.kitchenName || seller.name || "K").slice(0, 1).toUpperCase()}
        </div>
        <div>
          <p className="eyebrow">Your kitchen</p>
          <h1>{seller.kitchenName || "Home Kitchen"}</h1>
          <p className="seller-profile-details">
            {seller.name}
            {[seller.tower, seller.flat].filter(Boolean).length > 0 &&
              ` · ${[seller.tower, seller.flat].filter(Boolean).join(" · ")}`}
          </p>
        </div>
      </div>
      <div className="seller-online-control">
        <button
          type="button"
          className={`online-toggle ${seller.online ? "is-online" : "is-offline"}`}
          onClick={onToggle}
          disabled={toggleDisabled}
          aria-pressed={Boolean(seller.online)}
        >
          <span className="online-indicator" />
          {seller.online ? "Online · Taking orders" : "Offline · Not taking orders"}
        </button>
        {lockMessage && <span className="online-lock-message">{lockMessage}</span>}
        {seller.online && activeOrderCount > 0 && (
          <span className="active-order-hint">{activeOrderCount} active {activeOrderCount === 1 ? "order" : "orders"}</span>
        )}
        <details className="seller-upi-settings">
          <summary>UPI payment details</summary>
          <form onSubmit={saveUpi}>
            <label>UPI ID
              <input required value={upiId} onChange={(event) => { setUpiId(event.target.value); setUpiMessage(""); }} placeholder="name@bank" />
            </label>
            <button className="button button-outline button-small" type="submit">Save UPI ID</button>
          </form>
          {upiError && <span className="field-error">{upiError}</span>}
          {upiMessage && <span className="success-message">{upiMessage}</span>}
        </details>
      </div>
    </section>
  );
}

function Dashboard({ dishes, orders, reviews, seller }) {
  const sellerReviews = reviews.filter((review) => review.sellerId === seller.id);
  const completedOrders = orders.filter((order) => DELIVERED_STATUSES.includes(order.status));
  const totalSales = completedOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const commissionOwed = getCommissionDue(seller.id);
  const commissionSettled = completedOrders
    .filter((order) => order.commissionSettled === true)
    .reduce((sum, order) => sum + Number(order.commissionAmount || 0), 0);
  const commission = commissionOwed + commissionSettled;
  const todayEarnings = completedOrders
    .filter((order) => isToday(order.createdAt))
    .reduce((sum, order) => sum + Number(order.total || 0) - Number(order.commissionAmount || 0), 0);
  const pendingOrders = orders.filter((order) => ["Placed", "Preparing"].includes(order.status)).length;
  const inStockDishes = dishes.filter((dish) => Number(dish.stock) > 0).length;
  const week = getLastSevenDays(completedOrders);
  const maxEarnings = Math.max(1, ...week.map((day) => day.total));
  const weekStart = new Date();
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - 6);
  const quantities = new Map();
  completedOrders.forEach((order) => {
    if (dateValue(order.createdAt) < weekStart) return;
    (order.items || []).forEach((item) => {
      quantities.set(item.dishId, (quantities.get(item.dishId) || 0) + Number(item.qty || 0));
    });
  });
  const topDishes = [...quantities.entries()]
    .map(([dishId, qty]) => ({ dish: dishes.find((dish) => dish.id === dishId), qty }))
    .filter((item) => item.dish)
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);
  const lowStock = dishes.filter((dish) => Number(dish.stock) <= 3);
  const recentReviews = [...sellerReviews].sort(
    (a, b) => dateValue(b.createdAt) - dateValue(a.createdAt),
  ).slice(0, 4);

  return (
    <div className="seller-dashboard">
      <div className="seller-stat-grid">
        <StatCard label="Today's earnings" value={`₹${todayEarnings.toFixed(0)}`} detail="After commission" tone="green" />
        <StatCard label="Pending orders" value={pendingOrders} detail="Placed + preparing" tone="orange" />
        <StatCard label="Dishes in stock" value={inStockDishes} detail="Ready to be ordered" tone="peach" />
        <StatCard label="Average rating" value={averageRating(sellerReviews)?.toFixed(1) || "—"} detail={sellerReviews.length ? `${sellerReviews.length} neighbour reviews` : "No reviews yet"} tone="yellow" />
      </div>

      <div className="seller-dashboard-grid">
        <section className="seller-panel earnings-chart-panel">
          <div className="seller-panel-heading">
            <div><p className="eyebrow">A week at a glance</p><h2>Last 7 days earnings</h2></div>
            <strong className="panel-total">₹{week.reduce((sum, day) => sum + day.total, 0).toFixed(0)}</strong>
          </div>
          <div className="earnings-chart" aria-label="Earnings for the last seven days">
            {week.map((day, index) => (
              <div className="earnings-day" key={`${day.label}-${index}`} title={`₹${day.total.toFixed(0)}`}>
                <span className="earnings-bar-area">
                  <span className="earnings-bar-value">{day.total > 0 ? `₹${day.total.toFixed(0)}` : ""}</span>
                  <span className="earnings-bar" style={{ height: `${day.total ? Math.max(5, day.total / maxEarnings * 100) : 2}%` }} />
                </span>
                <span className="earnings-day-label">{day.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="seller-panel">
          <div className="seller-panel-heading"><div><p className="eyebrow">Neighbour favourites</p><h2>Top dishes this week</h2></div></div>
          {topDishes.length ? (
            <ol className="top-dishes-list">
              {topDishes.map(({ dish, qty }) => (
                <li key={dish.id}><span>{dish.name}</span><strong>{qty} sold</strong></li>
              ))}
            </ol>
          ) : <p className="seller-empty-inline">No dish sales this week yet.</p>}
        </section>

        <section className="seller-panel">
          <div className="seller-panel-heading"><div><p className="eyebrow">Keep an eye on your pantry</p><h2>Low-stock alerts</h2></div></div>
          {lowStock.length ? (
            <ul className="low-stock-list">
              {lowStock.map((dish) => (
                <li key={dish.id}><span>{dish.name}</span><strong>{dish.stock} left</strong></li>
              ))}
            </ul>
          ) : <p className="seller-empty-inline">All your dishes are well stocked.</p>}
        </section>

        <section className="seller-panel earnings-summary">
          <div className="seller-panel-heading"><div><p className="eyebrow">Your take-home</p><h2>Earnings summary</h2></div></div>
          <div className="earnings-line"><span>Orders total</span><strong>₹{totalSales.toFixed(2)}</strong></div>
          <div className="earnings-line"><span>Commission owed</span><strong>₹{commissionOwed.toFixed(2)}</strong></div>
          <div className="earnings-line"><span>Commission already settled</span><strong>₹{commissionSettled.toFixed(2)}</strong></div>
          <div className="earnings-line earnings-net"><span>Net take-home</span><strong>₹{(totalSales - commission).toFixed(2)}</strong></div>
        </section>

        <section className="seller-panel recent-reviews-panel">
          <div className="seller-panel-heading"><div><p className="eyebrow">Kind words from neighbours</p><h2>Recent reviews</h2></div></div>
          {recentReviews.length ? (
            <div className="seller-reviews-list">
              {recentReviews.map((review) => (
                <article className="seller-review-item" key={review.id}>
                  <div><strong>{review.reviewerName || "A neighbour"}</strong><span className="seller-review-stars">{"★".repeat(Math.max(0, Math.min(5, Number(review.stars))))}</span></div>
                  <p>{review.comment}</p>
                  {review.reviewerFlat && <small>{review.reviewerFlat}</small>}
                </article>
              ))}
            </div>
          ) : <p className="seller-empty-inline">Your first review will appear here after a neighbour enjoys a meal.</p>}
        </section>
      </div>
    </div>
  );
}

function DishesTab({ dishes, sellerId, onRefresh, onError }) {
  const [editingDish, setEditingDish] = useState(null);
  const [showForm, setShowForm] = useState(false);

  function save(dish) {
    try {
      if (editingDish) updateDish(dish.id, sellerId, dish);
      else {
        const current = getDishes();
        if (current.some((item) => item.id === dish.id)) {
          throw new Error("That dish already exists. Please try adding it again.");
        }
        saveDishes([...current, dish]);
      }
      setShowForm(false);
      setEditingDish(null);
      onRefresh();
      return "";
    } catch (error) {
      return error.message || "The dish couldn't be saved.";
    }
  }

  function remove(dish) {
    if (!window.confirm(`Delete "${dish.name}"? This cannot be undone.`)) return;
    try {
      deleteDish(dish.id, sellerId);
      onRefresh();
    } catch (error) {
      onError(error.message || "The dish couldn't be deleted.");
    }
  }

  function adjustStock(dish, amount) {
    try {
      updateDish(dish.id, sellerId, { stock: Math.max(0, Number(dish.stock) + amount) });
      onRefresh();
    } catch (error) {
      onError(error.message || "Stock couldn't be updated.");
    }
  }

  function toggleAvailable(dish) {
    try {
      updateDish(dish.id, sellerId, { available: dish.available === false });
      onRefresh();
    } catch (error) {
      onError(error.message || "Availability couldn't be updated.");
    }
  }

  return (
    <section className="seller-tab-panel">
      <div className="seller-tab-heading">
        <div><p className="eyebrow">Your menu, your way</p><h2>My Dishes</h2></div>
        <button className="button button-primary" type="button" onClick={() => { setEditingDish(null); setShowForm(true); }}>+ Add dish</button>
      </div>
      {dishes.length ? (
        <div className="seller-dish-grid">
          {dishes.map((dish) => (
            <article className="seller-dish-card" key={dish.id}>
              <div className="seller-dish-image">
                {dish.image ? <img src={dish.image} alt={dish.name} /> : <span aria-hidden="true">🍲</span>}
                <span className={`dish-availability-label ${dish.available === false ? "dish-disabled-label" : ""}`}>
                  {dish.available === false ? "Hidden from menu" : "Available"}
                </span>
              </div>
              <div className="seller-dish-content">
                <div className="seller-dish-title"><div><span className="seller-dish-category">{dish.category} · {dish.veg ? "Veg" : "Non-veg"}</span><h3>{dish.name}</h3></div><strong>₹{Number(dish.price).toFixed(0)}</strong></div>
                <p>{dish.description || "No description added."}</p>
                <div className="seller-stock-control">
                  <span>Portions in stock</span>
                  <div><button type="button" aria-label={`Decrease ${dish.name} stock`} onClick={() => adjustStock(dish, -1)}>−</button><strong>{dish.stock}</strong><button type="button" aria-label={`Increase ${dish.name} stock`} onClick={() => adjustStock(dish, 1)}>+</button></div>
                </div>
                <div className="seller-dish-actions">
                  <button className="text-action" type="button" onClick={() => { setEditingDish(dish); setShowForm(true); }}>Edit</button>
                  <button className="text-action danger-action" type="button" onClick={() => remove(dish)}>Delete</button>
                  <button className="availability-switch" type="button" aria-pressed={dish.available !== false} onClick={() => toggleAvailable(dish)}>
                    {dish.available === false ? "Make available" : "Mark unavailable"}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="section-empty">
          <span className="section-empty-icon" aria-hidden="true">🥘</span>
          <h3>Your menu is ready for its first dish</h3>
          <p>Add a dish when you're ready. Your neighbours will see it once you're approved and online.</p>
          <button className="button button-primary" type="button" onClick={() => { setEditingDish(null); setShowForm(true); }}>+ Add your first dish</button>
        </div>
      )}
      {showForm && <DishForm dish={editingDish} sellerId={sellerId} onSave={save} onCancel={() => { setShowForm(false); setEditingDish(null); }} />}
    </section>
  );
}

function OrdersTab({ orders, seller, onRefresh, onSimulate }) {
  const [filter, setFilter] = useState("All");
  const [orderErrors, setOrderErrors] = useState({});
  const visibleOrders = orders.filter((order) => {
    if (filter === "All") return true;
    if (filter === "Ready") return ["Ready", "Packed and Ready"].includes(order.status);
    if (filter === "Delivered") return DELIVERED_STATUSES.includes(order.status);
    return order.status === filter;
  });

  function advance(order, status) {
    try {
      updateOrderStatus(order.id, status);
      onRefresh();
    } catch (error) {
      setOrderErrors((current) => ({ ...current, [order.id]: error.message }));
    }
  }

  function reject(order) {
    if (!window.confirm(`Reject order #${String(order.id).slice(-6).toUpperCase()}? The portions will be returned to stock.`)) return;
    try {
      rejectOrder(order.id, seller.id);
      onRefresh();
    } catch (error) {
      setOrderErrors((current) => ({ ...current, [order.id]: error.message }));
    }
  }

  return (
    <section className="seller-tab-panel">
      <div className="seller-tab-heading orders-tab-heading">
        <div><p className="eyebrow">Fresh from your neighbours</p><h2>Orders</h2></div>
        <button className="button button-outline simulate-order-button" type="button" onClick={onSimulate}>+ Simulate incoming order</button>
      </div>
      <p className="testing-tool-note">Testing tool only · Creates a sample order from one of your in-stock dishes.</p>
      <div className="order-status-filters" aria-label="Filter orders">
        {ORDER_FILTERS.map((item) => (
          <button key={item} className={filter === item ? "active" : ""} type="button" onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>
      {visibleOrders.length ? (
        <div className="seller-orders-list">
          {visibleOrders.map((order) => (
            <OrderRow key={order.id} order={order} onAdvance={advance} onReject={reject} error={orderErrors[order.id]} />
          ))}
        </div>
      ) : (
        <div className="section-empty">
          <span className="section-empty-icon" aria-hidden="true">🛎️</span>
          <h3>No {filter === "All" ? "orders" : `${filter.toLowerCase()} orders`} yet</h3>
          <p>New neighbour orders will show up here. You can use the testing tool to preview the flow.</p>
        </div>
      )}
    </section>
  );
}

function PollsTab({ seller, polls, onCreate, onVote, onClose, now }) {
  const [template, setTemplate] = useState(null);
  const ownPolls = polls.filter((poll) => poll.authorId === seller.id);
  return (
    <section className="seller-tab-panel">
      <div className="seller-tab-heading seller-polls-heading">
        <div><p className="eyebrow">Ask the neighbours</p><h2>Your Polls</h2></div>
        <button className="button button-primary" type="button" onClick={() => setTemplate({ question: "What should I cook next?", tag: "Next Dish" })}>What should I cook next?</button>
      </div>
      <div className="poll-templates">
        <span>Quick start:</span>
        <button type="button" onClick={() => setTemplate(NEXT_WEEKEND_TEMPLATE)}>Next weekend special</button>
        <button type="button" onClick={() => setTemplate(DELIVERY_TIME_TEMPLATE)}>Preferred delivery time</button>
      </div>
      {ownPolls.length ? (
        <div className="poll-grid seller-poll-grid">
          {ownPolls.map((poll) => (
            <PollCard
              key={poll.id}
              poll={poll}
              user={seller}
              now={now}
              onVote={onVote}
              onClose={onClose}
              votingNotice={false}
              closeError=""
            />
          ))}
        </div>
      ) : (
        <div className="section-empty">
          <span className="section-empty-icon" aria-hidden="true">📣</span>
          <h3>You haven't posted a poll yet</h3>
          <p>Ask your neighbours what they'd love to see on your menu next.</p>
        </div>
      )}
      {template && (
        <PollModal
          key={`${template.question}-${template.tag}`}
          initialValues={template}
          onClose={() => setTemplate(null)}
          onPost={(values) => {
            const error = onCreate(values);
            if (!error) setTemplate(null);
            return error;
          }}
        />
      )}
    </section>
  );
}

function SellerIssuesTab({ issues, seller, onMessage }) {
  return (
    <section className="seller-tab-panel">
      <div className="seller-tab-heading"><div><p className="eyebrow">Neighbour concerns</p><h2>Issues</h2></div></div>
      {issues.length ? <div className="seller-issues-list">{issues.map((issue) => (
        <article className="seller-issue-card" key={issue.id}>
          <div><span className={`admin-status-badge admin-status-${issue.status.toLowerCase().replace(" ", "-")}`}>{issue.status}</span><strong>{issue.category}</strong></div>
          <p>{issue.description}</p>
          <small>Order #{String(issue.orderId).slice(-6).toUpperCase()} · Raised by {issue.raisedByName}</small>
          {issue.resolutionNote && <p><strong>{issue.outcome || issue.status}:</strong> {issue.resolutionNote}</p>}
          <IssueThread issue={issue} currentUser={seller} onSend={onMessage} compact />
        </article>
      ))}</div> : <div className="section-empty"><span className="section-empty-icon" aria-hidden="true">🌿</span><h3>No issues reported</h3><p>Any concerns from your neighbours will appear here.</p></div>}
    </section>
  );
}

export default function Seller() {
  const { user, updateSeller: saveSeller } = useAuth();
  const [tab, setTab] = useState("Dashboard");
  const [dishes, setDishes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [polls, setPolls] = useState([]);
  const [issues, setIssues] = useState([]);
  const [overdueDays, setOverdueDays] = useState(0);
  const [societySuspended, setSocietySuspended] = useState(false);
  const [dataError, setDataError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(() => {
    try {
      setDishes(getDishes(user.societyId).filter((dish) => dish.sellerId === user.id));
      setOrders(getOrders(user.societyId).filter((order) => order.sellerId === user.id));
      setReviews(getReviews(user.societyId).filter((review) => review.sellerId === user.id));
      setPolls(getPolls(user.societyId));
      setIssues(getIssues(user.societyId).filter((issue) => issue.sellerId === user.id));
      setOverdueDays(getSettings().overdueDays);
      setSocietySuspended(getSociety(user.societyId)?.status === "suspended");
      setDataError("");
    } catch (error) {
      setDataError(error.message || "Seller Studio data couldn't be loaded.");
    }
  }, [user.id, user.societyId]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const activeOrders = orders.filter((order) => ACTIVE_STATUSES.includes(order.status));
  const unsettledDeliveredOrders = orders.filter((order) =>
    DELIVERED_STATUSES.includes(order.status) && order.commissionSettled !== true,
  );
  const oldestUnsettledAt = unsettledDeliveredOrders.reduce((oldest, order) =>
    Math.min(oldest, new Date(Number(order.createdAt) || order.createdAt || 0).getTime()), Infinity);
  const commissionOverdue = overdueDays > 0 && Number.isFinite(oldestUnsettledAt) &&
    now - oldestUnsettledAt > overdueDays * 86_400_000;
  const canGoOnline = user.status === "verified" && !societySuspended && !commissionOverdue && dishes.some(
    (dish) => dish.available !== false && Number(dish.stock) > 0,
  ) && /^[\w.-]+@[\w.-]+$/.test(user.upiId || "");
  const lockMessage = user.status === "pending"
    ? "Available after your Society Admin approves you"
    : user.status === "banned"
      ? "Your account is banned and cannot go online"
    : societySuspended
      ? "Your society is currently suspended"
    : commissionOverdue
      ? "Please settle your commission to go online"
    : !/^[\w.-]+@[\w.-]+$/.test(user.upiId || "")
      ? "Add a valid UPI ID before going online"
      : !canGoOnline && !user.online
        ? "Add an available dish with stock to go online"
        : "";

  function toggleOnline() {
    setActionMessage("");
    setActionError("");
    if (!user.online && !canGoOnline) return;
    if (user.online && activeOrders.length > 0) {
      const confirmed = window.confirm(
        `You have ${activeOrders.length} active ${activeOrders.length === 1 ? "order" : "orders"}. They stay in your list, but no new orders will come in.`,
      );
      if (!confirmed) return;
    }
    try {
      saveSeller({ online: !user.online });
      setActionMessage(!user.online ? "Your kitchen is now online." : "Your kitchen is now offline.");
    } catch (error) {
      setActionError(error.message || "Your online status couldn't be updated.");
    }
  }

  function saveUpiId(value) {
    if (!/^[\w.-]+@[\w.-]+$/.test(value)) return "Enter a valid UPI ID (for example, name@bank).";
    try {
      saveSeller({ upiId: value });
      setActionError("");
      return "";
    } catch (error) {
      return error.message || "Your UPI ID couldn't be saved.";
    }
  }

  function simulateOrder() {
    setActionError("");
    setActionMessage("");
    try {
      const inStock = dishes.filter((dish) => dish.available !== false && Number(dish.stock) > 0);
      if (!inStock.length) {
        setActionError("Add an available dish with stock before simulating an order.");
        return;
      }
      const dish = inStock[Math.floor(Math.random() * inStock.length)];
      const order = placeOrder({
        sellerId: user.id,
        societyId: user.societyId,
        buyerId: "testing-buyer",
        buyerName: "Test Neighbour",
        buyerFlat: "Tower T · Flat 101",
        buyerPhone: "9000000000",
        items: [{ dishId: dish.id, name: dish.name, unit: Number(dish.price), qty: 1, options: [], note: "" }],
        total: Number(dish.price),
        deliveryMode: Math.random() < 0.5 ? "Doorstep" : "Pickup",
        paymentMode: Math.random() < 0.5 ? "UPI" : "Cash on Handover",
        upiRef: "TEST-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
        status: "Placed",
        note: "Sample order created by the Seller Studio testing tool.",
      });
      setActionMessage(`Test order #${String(order.id).slice(-6).toUpperCase()} received.`);
      refresh();
    } catch (error) {
      setActionError(error.message || "The test order couldn't be created.");
    }
  }

  function createSellerPoll(values) {
    try {
      const poll = createPoll({
        ...values,
        authorId: user.id,
        authorRole: "seller",
        authorLabel: user.kitchenName || user.name,
      });
      setPolls((current) => [poll, ...current]);
      return "";
    } catch (error) {
      return error.message || "The poll couldn't be posted.";
    }
  }

  function closeSellerPoll(pollId) {
    try {
      const updated = closePoll(pollId, user.id);
      if (!updated) {
        setActionError("Only the poll author can close this poll.");
        return;
      }
      setPolls((current) => current.map((poll) => poll.id === pollId ? updated : poll));
      setActionError("");
    } catch (error) {
      setActionError(error.message || "The poll couldn't be closed.");
    }
  }

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="seller-studio-page">
        <SellerHeaderCard
          seller={user}
          onToggle={toggleOnline}
          toggleDisabled={!user.online && !canGoOnline}
          lockMessage={lockMessage}
          activeOrderCount={activeOrders.length}
          onSaveUpiId={saveUpiId}
        />
        {user.status === "pending" && (
          <div className="seller-pending-banner" role="status">
            <span aria-hidden="true">⌛</span>
            <p>Your account is awaiting Society Admin approval. You can prepare your dishes now and go online once approved.</p>
          </div>
        )}
        {user.status === "banned" && (
          <div className="seller-banned-banner" role="alert">
            <strong>Your chef account is banned.</strong>
            <span>{user.banReason || "Please contact your Society Admin for more information."}</span>
          </div>
        )}
        {actionMessage && <p className="seller-action-message" role="status">{actionMessage}</p>}
        {actionError && <p className="seller-action-error" role="alert">{actionError}</p>}
        {dataError ? (
          <div className="section-empty error-empty" role="alert">
            <p>{dataError}</p>
            <button className="button button-outline" type="button" onClick={refresh}>Try again</button>
          </div>
        ) : (
          <>
            <nav className="seller-tabs" aria-label="Seller Studio sections">
              {TABS.map((item) => (
                <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => { setTab(item); setActionError(""); }}>
                  {item}
                  {item === "Orders" && activeOrders.length > 0 && <span className="seller-tab-count">{activeOrders.length}</span>}
                </button>
              ))}
            </nav>
            {tab === "Dashboard" && <Dashboard dishes={dishes} orders={orders} reviews={reviews} seller={user} />}
            {tab === "My Dishes" && (
              <DishesTab
                dishes={dishes}
                sellerId={user.id}
                onRefresh={refresh}
                onError={(message) => setActionError(message)}
              />
            )}
            {tab === "Orders" && (
              <OrdersTab orders={orders} seller={user} onRefresh={refresh} onSimulate={simulateOrder} />
            )}
            {tab === "Polls" && (
              <PollsTab
                seller={user}
                polls={polls}
                now={now}
                onCreate={createSellerPoll}
                onVote={(pollId, optionId) => {
                  try {
                    const updated = votePoll(pollId, user.id, optionId);
                    if (updated) setPolls((current) => current.map((poll) => poll.id === pollId ? updated : poll));
                  } catch (error) {
                    setActionError(error.message || "Your vote couldn't be saved.");
                  }
                }}
                onClose={closeSellerPoll}
              />
            )}
            {tab === "Issues" && <SellerIssuesTab issues={issues} seller={user} onMessage={(issueId, text) => {
              try {
                addIssueMessage(issueId, user, text);
                refresh();
                return "";
              } catch (error) {
                return error.message || "Your message couldn't be sent.";
              }
            }} />}
          </>
        )}
      </main>
    </div>
  );
}
