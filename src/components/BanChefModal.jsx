import { useState } from "react";

export default function BanChefModal({ chef, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    if (!reason.trim()) {
      setError("A reason is required to ban a chef.");
      return;
    }
    const submitError = onSubmit(reason.trim());
    if (submitError) setError(submitError);
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="ban-chef-modal" role="dialog" aria-modal="true" aria-labelledby="ban-chef-title">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        <p className="eyebrow">Society moderation</p>
        <h2 id="ban-chef-title">Ban {chef.kitchenName || chef.name}?</h2>
        <p>The chef will go offline and any orders still placed will be cancelled and restocked.</p>
        <form onSubmit={submit}>
          <label>Reason for ban *
            <textarea required rows="4" value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="ban-modal-actions">
            <button className="button button-outline" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit">Ban chef</button>
          </div>
        </form>
      </section>
    </div>
  );
}
