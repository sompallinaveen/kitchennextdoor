import { useMemo, useState } from "react";
import PollCard from "../../components/PollCard.jsx";
import PollModal from "../../components/PollModal.jsx";

export default function ResidentsPollsTab({
  buyers, polls, admin, now, announcement, onBuyerStatus, onQuickVerify,
  onPostPoll, onClosePoll, onDeletePoll, onSaveAnnouncement, onVote,
}) {
  const [mobileOrFlat, setMobileOrFlat] = useState("");
  const [quickError, setQuickError] = useState("");
  const [announcementText, setAnnouncementText] = useState(announcement);
  const [announcementMessage, setAnnouncementMessage] = useState("");
  const [showPollModal, setShowPollModal] = useState(false);
  const [error, setError] = useState("");
  const pending = buyers.filter((buyer) => buyer.status === "pending");
  const sortedBuyers = useMemo(() => [...buyers].sort((a, b) => a.name.localeCompare(b.name)), [buyers]);

  function quickVerify(event) {
    event.preventDefault();
    setQuickError("");
    const verifyError = onQuickVerify(mobileOrFlat.trim());
    if (verifyError) {
      setQuickError(verifyError);
      return;
    }
    setMobileOrFlat("");
  }

  function saveAnnouncement(event) {
    event.preventDefault();
    setError("");
    const saveError = onSaveAnnouncement(announcementText);
    if (saveError) {
      setError(saveError);
      return;
    }
    setAnnouncementMessage(announcementText.trim() ? "Announcement saved." : "Announcement cleared.");
  }

  return (
    <section className="admin-tab-content">
      <div className="admin-tab-heading"><div><p className="admin-eyebrow">Residents and community choices</p><h2>Buyers and Polls</h2></div></div>
      <section className="admin-panel admin-residents-panel">
        <div className="admin-panel-heading"><div><p className="admin-eyebrow">Flat verification</p><h3>Pending buyers</h3></div><span className="admin-count-badge">{pending.length}</span></div>
        {pending.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Buyer</th><th>Flat</th><th>Mobile</th><th>Actions</th></tr></thead><tbody>
          {pending.map((buyer) => <tr key={buyer.id}><td>{buyer.name}</td><td>{[buyer.tower, buyer.flat].filter(Boolean).join(" · ")}</td><td>{buyer.mobile}</td><td className="admin-actions"><button onClick={() => onBuyerStatus(buyer, "approved")}>Approve</button><button className="admin-danger-action" onClick={() => onBuyerStatus(buyer, "rejected")}>Reject</button></td></tr>)}
        </tbody></table></div> : <p className="admin-muted">No buyers are waiting for approval.</p>}
        <form className="admin-quick-verify" onSubmit={quickVerify}>
          <label>Quick verify by mobile or flat number<input value={mobileOrFlat} onChange={(event) => setMobileOrFlat(event.target.value)} placeholder="Mobile number or flat" /></label>
          <button className="button button-primary" type="submit">Approve resident</button>
          {quickError && <p className="field-error" role="alert">{quickError}</p>}
        </form>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="admin-eyebrow">Everyone in this community</p><h3>All buyers</h3></div></div>
        {sortedBuyers.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Name</th><th>Flat</th><th>Mobile</th><th>Status</th></tr></thead><tbody>
          {sortedBuyers.map((buyer) => <tr key={buyer.id}><td>{buyer.name}</td><td>{[buyer.tower, buyer.flat].filter(Boolean).join(" · ") || "—"}</td><td>{buyer.mobile}</td><td><span className={`admin-status-badge admin-status-${buyer.status}`}>{buyer.status}</span></td></tr>)}
        </tbody></table></div> : <p className="admin-muted">No buyers have registered yet.</p>}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading"><div><p className="admin-eyebrow">Menu banner</p><h3>Society announcement</h3></div></div>
        <form className="admin-announcement-form" onSubmit={saveAnnouncement}>
          <label htmlFor="society-announcement">Announcement shown to residents of {admin.society || "this society"}</label>
          <textarea id="society-announcement" rows="3" maxLength={240} value={announcementText} onChange={(event) => { setAnnouncementText(event.target.value); setAnnouncementMessage(""); }} placeholder="Share a friendly update with your neighbours..." />
          <div><button className="button button-primary" type="submit">Save announcement</button><button className="button button-outline" type="button" onClick={() => { setAnnouncementText(""); setAnnouncementMessage(""); }}>Clear</button></div>
          {announcementMessage && <p className="success-message">{announcementMessage}</p>}
          {error && <p className="field-error" role="alert">{error}</p>}
        </form>
      </section>
      <section className="admin-panel admin-polls-panel">
        <div className="admin-panel-heading"><div><p className="admin-eyebrow">Invite residents to decide together</p><h3>Society Polls</h3></div><button className="button button-primary" type="button" onClick={() => setShowPollModal(true)}>+ Post a poll</button></div>
        {polls.length ? <div className="admin-poll-list">{polls.map((poll) => <div className="admin-poll-row" key={poll.id}>
          <PollCard poll={poll} user={admin} now={now} onVote={onVote} onClose={onClosePoll} votingNotice={false} closeError="" />
          <button className="admin-danger-action admin-delete-poll" type="button" onClick={() => {
            if (window.confirm("Delete this poll and its votes?")) {
              const deleteError = onDeletePoll(poll);
              if (deleteError) setError(deleteError);
            }
          }}>Delete poll</button>
        </div>)}</div> : <div className="admin-empty"><h3>No polls yet</h3><p>Post a poll to hear what residents think.</p></div>}
      </section>
      {showPollModal && <PollModal onClose={() => setShowPollModal(false)} onPost={(values) => {
        const postError = onPostPoll(values);
        if (postError) return postError;
        setShowPollModal(false);
        return "";
      }} />}
    </section>
  );
}
