import { useState } from "react";

const CATEGORIES = ["Food quality", "Late delivery", "Hygiene", "Wrong order", "Payment dispute", "Other"];

export default function IssueReportModal({ order, onClose, onSubmit }) {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    if (!description.trim()) {
      setError("Describe what happened so the Society Admin can help.");
      return;
    }
    const submitError = onSubmit({ category, description });
    if (submitError) setError(submitError);
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="issue-report-modal" role="dialog" aria-modal="true" aria-labelledby="issue-report-title">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        <p className="eyebrow">We're here to help</p><h2 id="issue-report-title">Report an issue</h2>
        <p>Order #{String(order.id).slice(-6).toUpperCase()} · {order.items?.map((item) => item.name).join(", ")}</p>
        <form onSubmit={submit}>
          <label>Issue category
            <select value={category} onChange={(event) => setCategory(event.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select>
          </label>
          <label>What happened?
            <textarea rows="5" maxLength={1000} required value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Tell us what went wrong..." />
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="issue-report-actions">
            <button className="button button-outline" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit">Send to Society Admin</button>
          </div>
        </form>
      </section>
    </div>
  );
}
