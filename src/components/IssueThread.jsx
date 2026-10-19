import { useState } from "react";

export default function IssueThread({ issue, currentUser, onSend, compact = false }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    const sendError = onSend(issue.id, text);
    if (sendError) {
      setError(sendError);
      return;
    }
    setError("");
    setText("");
  }
  return (
    <div className={`issue-thread${compact ? " issue-thread-compact" : ""}`}>
      <div className="issue-messages">
        {(issue.messages || []).map((message, index) => (
          <article key={`${message.at}-${index}`} className={message.by === currentUser?.id ? "own-issue-message" : ""}>
            <div><strong>{message.by === currentUser?.id ? "You" : message.role === "admin" ? "Society Admin" : message.role === "seller" ? "Chef" : issue.raisedByName || "Buyer"}</strong>
              <time>{new Intl.DateTimeFormat(undefined, { dateStyle: "short", timeStyle: "short" }).format(Number(message.at) || Date.now())}</time></div>
            <p>{message.text}</p>
          </article>
        ))}
      </div>
      {!["Resolved", "Dismissed"].includes(issue.status) && (
        <form className="issue-message-form" onSubmit={submit}>
          <label className="sr-only" htmlFor={`issue-message-${issue.id}`}>Add a message</label>
          <input id={`issue-message-${issue.id}`} value={text} onChange={(event) => setText(event.target.value)} placeholder="Write a message..." />
          <button type="submit" disabled={!text.trim()}>Send</button>
          {error && <span className="field-error">{error}</span>}
        </form>
      )}
    </div>
  );
}
