import { useEffect, useState } from "react";

const TYPES = ["Next Dish", "Weekend Special", "Timings", "Other"];

function localDateTimeMin() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

export default function PollModal({ onClose, onPost, initialValues = {} }) {
  const [question, setQuestion] = useState(initialValues.question || "");
  const [tag, setTag] = useState(initialValues.tag || TYPES[0]);
  const [options, setOptions] = useState(["", ""]);
  const [endsAt, setEndsAt] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  function updateOption(index, label) {
    setOptions((current) => current.map((option, itemIndex) => itemIndex === index ? label : option));
  }

  function submit(event) {
    event.preventDefault();
    const cleanOptions = options.map((label) => label.trim()).filter(Boolean);
    if (!question.trim()) {
      setError("Enter a poll question.");
      return;
    }
    if (cleanOptions.length < 2) {
      setError("Add at least two non-empty options.");
      return;
    }
    if (endsAt && Number.isNaN(new Date(endsAt).getTime())) {
      setError("Choose a valid end date and time.");
      return;
    }
    setError("");
    const postError = onPost({
      question,
      tag,
      options: cleanOptions.map((label) => ({ label })),
      endsAt: endsAt ? new Date(endsAt).getTime() : null,
    });
    if (postError) setError(postError);
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="poll-modal" role="dialog" aria-modal="true" aria-labelledby="poll-modal-title">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>×</button>
        <p className="eyebrow">Ask your neighbours</p>
        <h2 id="poll-modal-title">Post a poll</h2>
        <form className="poll-form" onSubmit={submit}>
          <label>
            Question
            <input
              autoFocus
              required
              maxLength={180}
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="What should we decide together?"
            />
          </label>
          <label>
            Type
            <select value={tag} onChange={(event) => setTag(event.target.value)}>
              {TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <div className="poll-option-inputs">
            {options.map((option, index) => (
              <div className="poll-option-field" key={index}>
                <div className="poll-option-label">
                  <label htmlFor={`poll-option-${index}`}>Option {index + 1}</label>
                  {index > 1 && (
                    <button
                      type="button"
                      className="remove-poll-option"
                      onClick={() => setOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    >Remove</button>
                  )}
                </div>
                <input
                  id={`poll-option-${index}`}
                  required={index < 2}
                  maxLength={100}
                  value={option}
                  onChange={(event) => updateOption(index, event.target.value)}
                  placeholder={`Choice ${index + 1}`}
                />
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button className="add-poll-option" type="button" onClick={() => setOptions((current) => [...current, ""])}>
              + Add option
            </button>
          )}
          <label>
            Ends on <span className="optional">(optional)</span>
            <input
              type="datetime-local"
              value={endsAt}
              min={localDateTimeMin()}
              onChange={(event) => setEndsAt(event.target.value)}
            />
          </label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="poll-modal-actions">
            <button className="button button-outline" type="button" onClick={onClose}>Cancel</button>
            <button className="button button-primary" type="submit">Post poll</button>
          </div>
        </form>
      </section>
    </div>
  );
}
