import { useState } from "react";

export default function ConfirmModal({
  title,
  description,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
  requiredText = false,
  typeToConfirm = null,
  danger = false,
  extraOption = null,
}) {
  const [text, setText] = useState("");
  const [checked, setChecked] = useState(extraOption ? extraOption.defaultChecked !== false : false);
  const [error, setError] = useState("");

  const isMatched = !typeToConfirm || text.trim() === typeToConfirm;

  function submit(event) {
    event.preventDefault();
    setError("");
    if (typeToConfirm && text.trim() !== typeToConfirm) {
      setError(`Please type "${typeToConfirm}" exactly to confirm.`);
      return;
    }
    const result = onConfirm(text, { checked });
    if (result) setError(result);
  }
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <form className={`super-confirm-modal ${danger ? "is-danger-modal" : ""}`} role="dialog" aria-modal="true" aria-labelledby="super-confirm-title" onSubmit={submit}>
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        <p className="admin-eyebrow">{danger ? "Critical action" : "App Admin action"}</p>
        <h2 id="super-confirm-title">{title}</h2>
        <p>{description}</p>
        {requiredText && (
          <label>Reason *<textarea required rows="3" value={text} onChange={(event) => setText(event.target.value)} /></label>
        )}
        {typeToConfirm && (
          <label className="confirm-type-field">
            Type <strong>{typeToConfirm}</strong> below to confirm:
            <input
              type="text"
              required
              autoFocus
              autoComplete="off"
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder={typeToConfirm}
            />
          </label>
        )}
        {extraOption && (
          <label className="confirm-checkbox-label">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />
            <span>{extraOption.label}</span>
          </label>
        )}
        {error && <p className="field-error" role="alert">{error}</p>}
        <div className="super-actions">
          <button type="button" className="button button-outline" onClick={onClose}>Cancel</button>
          <button
            className={`button ${danger ? "button-danger" : "button-primary"}`}
            type="submit"
            disabled={typeToConfirm ? !isMatched : false}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}
