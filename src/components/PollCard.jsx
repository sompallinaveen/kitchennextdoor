import { Link } from "react-router-dom";

function pollIsClosed(poll, now) {
  return poll.closed || (poll.endsAt && now >= Number(poll.endsAt));
}

function formatEndDate(timestamp) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(timestamp)));
}

export default function PollCard({ poll, user, now, onVote, onClose, votingNotice, closeError }) {
  const votes = poll.votes || {};
  const totalVotes = Object.keys(votes).length;
  const votedOptionId = user ? votes[user.id] : null;
  const closed = pollIsClosed(poll, now);
  const eligibleVoter = ["buyer", "seller", "admin"].includes(user?.role);
  const canTryVoting = !closed && !votedOptionId && (!user || eligibleVoter);
  const isAuthor = user?.id === poll.authorId;
  const counts = poll.options.map((option) =>
    Object.values(votes).filter((optionId) => optionId === option.id).length,
  );

  return (
    <article className={`poll-card${closed ? " poll-card-closed" : ""}`}>
      <div className="poll-card-meta">
        <span className={`poll-type-tag poll-tag-${poll.tag.toLowerCase().replaceAll(" ", "-")}`}>{poll.tag}</span>
        <span className={`poll-status ${closed ? "status-closed" : ""}`}>
          <span className="status-dot" />
          {closed ? "Closed" : poll.endsAt ? `Ends ${formatEndDate(poll.endsAt)}` : "Open for voting"}
        </span>
      </div>
      <h2>{poll.question}</h2>
      <div className="poll-options" role="group" aria-label={`Options for ${poll.question}`}>
        {poll.options.map((option, index) => {
          const count = counts[index];
          const percentage = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const selected = votedOptionId === option.id;
          return (
            <button
              className={`poll-option${selected ? " poll-option-selected" : ""}`}
              key={option.id}
              type="button"
              disabled={!canTryVoting}
              onClick={() => onVote(poll.id, option.id)}
              aria-pressed={selected}
              aria-label={`${option.label}, ${percentage} percent, ${count} votes${selected ? ", your vote" : ""}`}
            >
              <span className="poll-progress" style={{ width: `${percentage}%` }} />
              <span className="poll-option-text">{option.label}</span>
              <span className="poll-option-result">
                {selected && <span className="vote-tick" aria-label="Your vote">✓</span>}
                {percentage}% <span className="vote-count">({count})</span>
              </span>
            </button>
          );
        })}
      </div>
      {votingNotice && (
        <p className="poll-vote-notice" role="status">
          {user ? "Only resident accounts can vote." : <Link to="/login">Log in to vote</Link>}
        </p>
      )}
      {closeError && <p className="field-error poll-card-error" role="alert">{closeError}</p>}
      <footer className="poll-card-footer">
        <span className="poll-author">
          By <strong>{poll.authorLabel}</strong>
          <span className={`author-badge ${poll.authorRole === "admin" ? "admin-badge" : "chef-badge"}`}>
            {poll.authorRole === "admin" ? "Admin" : "Chef"}
          </span>
        </span>
        <span className="poll-vote-total">{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</span>
        {isAuthor && !closed && (
          <button className="close-poll-button" type="button" onClick={() => onClose(poll.id)}>Close poll</button>
        )}
      </footer>
    </article>
  );
}
