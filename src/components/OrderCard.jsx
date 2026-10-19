import { Link } from "react-router-dom";
import { useState } from "react";
import IssueThread from "./IssueThread.jsx";
import IssueReportModal from "./IssueReportModal.jsx";
import StatusStepper from "./StatusStepper.jsx";

function timeLabel(value) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" })
    .format(new Date(typeof value === "number" ? value : value || Date.now()));
}

export default function OrderCard({ order, seller, issues = [], currentUser, onCancel, onReorder, onRate, onReport, onIssueMessage }) {
  const [reportOpen, setReportOpen] = useState(false);
  const delivered = ["Delivered", "Delivered and Paid", "Cash received and delivered"].includes(order.status);
  return (
    <article className="buyer-order-card">
      <header className="buyer-order-heading">
        <div>
          <p className="eyebrow">Order #{String(order.id).slice(-6).toUpperCase()}</p>
          <span>{timeLabel(order.createdAt)}</span>
        </div>
        <strong>{seller?.kitchenName || "Neighbour's kitchen"}</strong>
      </header>
      <StatusStepper status={order.status} />
      <ul className="buyer-order-items">
        {(order.items || []).map((item, index) => (
          <li key={`${item.dishId}-${index}`}>
            <div><strong>{item.qty} × {item.name}</strong>
              {!!item.options?.length && <small>{item.options.map((option) => `${option.name}: ${option.choice || option.label}`).join(" · ")}</small>}
              {item.note && <small>Note: {item.note}</small>}
            </div>
            <span>₹{(Number(item.unit) * Number(item.qty)).toFixed(2)}</span>
          </li>
        ))}
      </ul>
      {order.note && <p className="buyer-order-note"><strong>Delivery note:</strong> {order.note}</p>}
      <footer className="buyer-order-footer">
        <div>
          <span>{order.deliveryMode === "Pickup" ? "Pickup" : "Doorstep delivery"}</span>
          <span>{order.paymentMode}</span>
          <strong>Total · ₹{Number(order.total).toFixed(2)}</strong>
        </div>
        <div className="buyer-order-actions">
          {order.status === "Placed" && <button className="button button-outline button-small" type="button" onClick={() => onCancel(order)}>Cancel order</button>}
          <button className="button button-outline button-small" type="button" onClick={() => onReorder(order)}>Reorder</button>
          {delivered && <Link className="text-action" to="/#review-heading" onClick={onRate}>Rate this cook</Link>}
          <button className="text-action report-issue-action" type="button" onClick={() => setReportOpen(true)}>Report an issue</button>
        </div>
      </footer>
      {issues.map((issue) => <section className="buyer-order-issue" key={issue.id}>
        <div><span className={`admin-status-badge admin-status-${issue.status.toLowerCase().replace(" ", "-")}`}>{issue.status}</span><strong>{issue.category}</strong></div>
        <p>{issue.description}</p>
        {issue.resolutionNote && <p><strong>{issue.outcome || issue.status}:</strong> {issue.resolutionNote}</p>}
        <IssueThread issue={issue} currentUser={currentUser} onSend={onIssueMessage} compact />
      </section>)}
      {reportOpen && <IssueReportModal order={order} onClose={() => setReportOpen(false)} onSubmit={(values) => {
        const reportError = onReport(order, values);
        if (!reportError) setReportOpen(false);
        return reportError;
      }} />}
    </article>
  );
}
