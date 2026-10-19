import { useState } from "react";
import IssueThread from "../../components/IssueThread.jsx";

const FILTERS = ["All", "Open", "In review", "Resolved", "Dismissed"];
const OUTCOMES = ["No action", "Warning to chef", "Chef banned", "Settled between them"];

export default function IssuesTab({ issues, orders, chefs, admin, onStatus, onMessage }) {
  const [filter, setFilter] = useState("All");
  const [selectedId, setSelectedId] = useState("");
  const [statusNote, setStatusNote] = useState("");
  const [outcome, setOutcome] = useState(OUTCOMES[0]);
  const [error, setError] = useState("");
  const selected = issues.find((issue) => issue.id === selectedId) || issues[0];
  const visible = filter === "All" ? issues : issues.filter((issue) => issue.status === filter);
  const orderById = new Map(orders.map((order) => [order.id, order]));
  const chefById = new Map(chefs.map((chef) => [chef.id, chef]));

  function update(status) {
    setError("");
    const result = onStatus(selected, { status, outcome, note: statusNote });
    if (result) {
      setError(result);
      return;
    }
    setStatusNote("");
  }

  return (
    <section className="admin-tab-content">
      <div className="admin-tab-heading"><div><p className="admin-eyebrow">Support your residents</p><h2>Issues</h2></div></div>
      <div className="issue-filter-chips">{FILTERS.map((item) => <button className={filter === item ? "active" : ""} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
      {!issues.length ? <div className="admin-empty"><h3>No issues reported</h3><p>Reports from buyers will appear here for you to review.</p></div> : (
        <div className="admin-issues-layout">
          <div className="admin-issue-list">{visible.map((issue) => <button key={issue.id} type="button" className={`admin-issue-list-item${selected?.id === issue.id ? " active" : ""}`} onClick={() => setSelectedId(issue.id)}>
            <span className={`admin-status-badge admin-status-${issue.status.toLowerCase().replace(" ", "-")}`}>{issue.status}</span>
            <strong>{issue.category}</strong><small>{issue.raisedByName} · Order #{String(issue.orderId).slice(-6).toUpperCase()}</small>
          </button>)}
            {!visible.length && <p className="admin-muted">No issues with this status.</p>}
          </div>
          {selected && <article className="admin-issue-detail">
            <div className="admin-issue-detail-heading"><div><p className="admin-eyebrow">{selected.category} · {selected.status}</p><h3>Order #{String(selected.orderId).slice(-6).toUpperCase()}</h3></div><span>Raised by {selected.raisedByName}</span></div>
            <p className="admin-issue-description">{selected.description}</p>
            <section className="admin-issue-order"><strong>Order details</strong><span>{chefById.get(selected.sellerId)?.kitchenName || "Kitchen"} · {orderById.get(selected.orderId)?.items?.map((item) => `${item.qty} × ${item.name}`).join(", ") || "Order details unavailable"}</span></section>
            {selected.resolutionNote && <p className="admin-resolution-note"><strong>{selected.outcome || selected.status}:</strong> {selected.resolutionNote}</p>}
            <h4>Conversation</h4><IssueThread issue={selected} currentUser={admin} onSend={onMessage} />
            {!["Resolved", "Dismissed"].includes(selected.status) && <div className="admin-issue-actions">
              {selected.status === "Open" && <button className="button button-outline" type="button" onClick={() => update("In review")}>Mark in review</button>}
              <label>Outcome
                <select value={outcome} onChange={(event) => setOutcome(event.target.value)}>{OUTCOMES.map((item) => <option key={item}>{item}</option>)}</select>
              </label>
              <label>Resolution note *
                <textarea rows="2" value={statusNote} onChange={(event) => setStatusNote(event.target.value)} placeholder="Required to resolve or dismiss" />
              </label>
              <div><button className="button button-primary" type="button" onClick={() => update("Resolved")}>Resolve issue</button>
                <button className="button button-outline" type="button" onClick={() => update("Dismissed")}>Dismiss</button></div>
            </div>}
            {error && <p className="field-error" role="alert">{error}</p>}
            {selected.resolvedAt && <small className="admin-resolved-by">Resolved by {admin.name} · {new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(selected.resolvedAt)}</small>}
          </article>}
        </div>
      )}
    </section>
  );
}
