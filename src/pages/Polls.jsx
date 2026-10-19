import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import PollCard from "../components/PollCard.jsx";
import PollModal from "../components/PollModal.jsx";
import SiteHeader from "../components/SiteHeader.jsx";
import { closePoll, createPoll, getPolls, getSocieties, getSocietyIdForUser, votePoll } from "../api/store.js";
import { useAuth } from "../context/AuthContext.jsx";

const FILTERS = ["All Polls", "From Chefs", "From Society Admin"];

function isPollClosed(poll, now) {
  return poll.closed || (poll.endsAt && now >= Number(poll.endsAt));
}

export default function Polls() {
  const { user } = useAuth();
  if (user?.role === "seller") {
    return <Navigate to="/seller" replace />;
  }
  const [polls, setPolls] = useState([]);
  const [filter, setFilter] = useState(FILTERS[0]);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState({});
  const [voteNotice, setVoteNotice] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [societies, setSocieties] = useState([]);
  const [guestSocietyId, setGuestSocietyId] = useState("");
  const societyId = user ? getSocietyIdForUser(user) : guestSocietyId;

  const loadPolls = useCallback(() => {
    try {
      setPolls(societyId ? getPolls(societyId) : []);
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Polls couldn't be loaded.");
    }
  }, [societyId]);

  useEffect(() => {
    try {
      const available = getSocieties();
      setSocieties(available);
      if (!user && !guestSocietyId && available.length) setGuestSocietyId(available[0].id);
    } catch (loadError) {
      setError(loadError.message || "Societies couldn't be loaded.");
    }
  }, [user, guestSocietyId]);

  useEffect(() => {
    loadPolls();
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [loadPolls]);

  const canPost = user?.role === "seller" || user?.role === "admin";
  const visiblePolls = useMemo(() => polls.filter((poll) => {
    if (filter === "From Chefs") return poll.authorRole === "seller";
    if (filter === "From Society Admin") return poll.authorRole === "admin";
    return true;
  }), [filter, polls]);

  function postPoll(values) {
    try {
      createPoll({
        ...values,
        authorId: user.id,
        societyId,
        authorRole: user.role === "seller" ? "seller" : "admin",
        authorLabel: user.role === "seller" ? user.kitchenName || user.name : "Society Admin",
      });
      setShowModal(false);
      setError("");
      loadPolls();
      return "";
    } catch (postError) {
      return postError.message || "The poll couldn't be posted.";
    }
  }

  function handleVote(pollId, optionId) {
    setVoteNotice(null);
    if (!user) {
      setVoteNotice(pollId);
      return;
    }
    if (!["buyer", "seller", "admin"].includes(user.role)) {
      setVoteNotice(pollId);
      return;
    }
    try {
      const updated = votePoll(pollId, user.id, optionId);
      if (!updated) {
        loadPolls();
        return;
      }
      setPolls((current) => current.map((poll) => poll.id === pollId ? updated : poll));
    } catch (voteError) {
      setError(voteError.message || "Your vote couldn't be saved.");
    }
  }

  function handleClose(pollId) {
    setActionError((current) => ({ ...current, [pollId]: "" }));
    try {
      const updated = closePoll(pollId, user.id);
      if (!updated) {
        setActionError((current) => ({ ...current, [pollId]: "Only the poll author can close this poll." }));
        loadPolls();
        return;
      }
      setPolls((current) => current.map((poll) => poll.id === pollId ? updated : poll));
    } catch (closeError) {
      setActionError((current) => ({
        ...current,
        [pollId]: closeError.message || "The poll couldn't be closed.",
      }));
    }
  }

  return (
    <div className="app-shell">
      <SiteHeader />
      <main className="polls-page">
        {!user && societies.length > 0 && (
          <div className="guest-society-picker">
            <label htmlFor="poll-society">Browsing society</label>
            <select id="poll-society" value={guestSocietyId} onChange={(event) => setGuestSocietyId(event.target.value)}>
              {societies.map((society) => <option key={society.id} value={society.id}>{society.name}</option>)}
            </select>
          </div>
        )}
        <section className="polls-heading">
          <div>
            <p className="eyebrow">A little neighbourhood democracy</p>
            <h1>Society Polls</h1>
            <p>Help your community choose what to cook, share and enjoy together.</p>
          </div>
          {canPost && (
            <button className="button button-primary post-poll-button" type="button" onClick={() => setShowModal(true)}>
              + Post a poll
            </button>
          )}
        </section>

        {!user ? (
          <p className="poll-info-line"><Link to="/login">Log in to vote</Link></p>
        ) : user.role === "buyer" ? (
          <p className="poll-info-line">Only chefs and the Society Admin can post polls.</p>
        ) : null}

        <div className="poll-filter-chips" aria-label="Filter polls">
          {FILTERS.map((item) => (
            <button
              key={item}
              type="button"
              className={filter === item ? "active" : ""}
              onClick={() => setFilter(item)}
            >{item}</button>
          ))}
        </div>

        {error ? (
          <div className="section-empty error-empty" role="alert">
            <p>{error}</p>
            <button className="button button-outline" type="button" onClick={loadPolls}>Try again</button>
          </div>
        ) : visiblePolls.length ? (
          <div className="poll-grid">
            {visiblePolls.map((poll) => (
              <PollCard
                key={poll.id}
                poll={poll}
                user={user}
                now={now}
                onVote={handleVote}
                onClose={handleClose}
                votingNotice={voteNotice === poll.id}
                closeError={actionError[poll.id]}
              />
            ))}
          </div>
        ) : (
          <div className="section-empty polls-empty">
            <span className="section-empty-icon" aria-hidden="true">📣</span>
            <h2>No polls yet</h2>
            <p>No polls yet. When a chef or the Society Admin posts a poll, it will show up here.</p>
          </div>
        )}
      </main>
      {showModal && <PollModal onClose={() => setShowModal(false)} onPost={postPoll} />}
    </div>
  );
}
