import { useState } from "react";

export default function ConfirmModal({ title, description, confirmLabel = "Confirm", onConfirm, onClose, requiredText = false }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    setError("");
    const result = onConfirm(text);
    if (result) setError(result);
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className="super-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="super-confirm-title" onSubmit={submit}>
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        <p className="admin-eyebrow">App Admin action</p>
        <h2 id="super-confirm-title">{title}</h2>
        <p>{description}</p>
        {requiredText && <label>Reason *<textarea required rows="3" value={text} onChange={(event) => setText(event.target.value)} /></label>}
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="super-actions"><button type="button" className="button button-outline" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{confirmLabel}</button></div>
      </form>
    </div>
  );
}
