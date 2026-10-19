import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import BanChefModal from "../components/BanChefModal.jsx";
import DashboardTab from "./admin/DashboardTab.jsx";
import ChefsTab from "./admin/ChefsTab.jsx";
import IssuesTab from "./admin/IssuesTab.jsx";
import KitchensOrdersTab from "./admin/KitchensOrdersTab.jsx";
import ReferralTab from "./admin/ReferralTab.jsx";
import ResidentsPollsTab from "./admin/ResidentsPollsTab.jsx";
import {
  addIssueMessage,
  banSeller,
  closePoll,
  createPoll,
  deletePoll,
  getAnnouncement,
  getBuyers,
  getCommissionDue,
  getDishes,
  getIssues,
  getOrders,
  getPolls,
  getReviews,
  getSociety,
  getSellers,
  logAudit,
  regenerateReferral,
  saveAnnouncement,
  setBuyerStatus,
  setReferralActive,
  setSellerStatus,
  updateIssueStatus,
  updateUserStatus,
  unbanSeller,
  verifySeller,
  votePoll,
} from "../api/store.js";

const TABS = ["Dashboard", "Chefs", "Referral", "Issues", "Buyers and Polls", "Kitchens and Orders"];

export default function SocietyAdmin() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState(TABS[0]);
  const [society, setSociety] = useState(null);
  const [chefs, setChefs] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [dishes, setDishes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [polls, setPolls] = useState([]);
  const [issues, setIssues] = useState([]);
  const [announcement, setAnnouncement] = useState("");
  const [dataError, setDataError] = useState("");
  const [actionMessage, setActionMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const [banTarget, setBanTarget] = useState(null);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(() => {
    try {
      const currentSociety = getSociety(user.societyId);
      if (!currentSociety || currentSociety.adminId !== user.id) {
        throw new Error("This admin account is not assigned to a society.");
      }
      setSociety(currentSociety);
      setChefs(getSellers(user.societyId));
      setBuyers(getBuyers(user.societyId));
      setDishes(getDishes(user.societyId));
      setOrders(getOrders(user.societyId));
      setReviews(getReviews(user.societyId));
      setPolls(getPolls(user.societyId));
      setIssues(getIssues(user.societyId));
      setAnnouncement(getAnnouncement(user.societyId));
      setDataError("");
    } catch (error) {
      setDataError(error.message || "Society data couldn't be loaded.");
    }
  }, [user.id, user.societyId]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const pendingChefs = chefs.filter((chef) => chef.status === "pending").length;
  const pendingBuyers = buyers.filter((buyer) => buyer.status === "pending").length;
  const openIssues = issues.filter((issue) => ["Open", "In review"].includes(issue.status)).length;
  const badges = useMemo(() => ({
    Chefs: pendingChefs,
    Issues: openIssues,
    "Buyers and Polls": pendingBuyers,
  }), [openIssues, pendingBuyers, pendingChefs]);

  function completeAction(message = "") {
    refresh();
    setActionMessage(message);
    setActionError("");
  }

  function verifyChef(chef) {
    try {
      verifySeller(chef.id, user.societyId, user);
      completeAction(`${chef.kitchenName || chef.name} is verified and can choose to go online.`);
    } catch (error) {
      setActionError(error.message || "Chef couldn't be verified.");
    }
  }

  function changeChefStatus(chef, status) {
    try {
      setSellerStatus(chef.id, user.societyId, status, user);
      completeAction(`${chef.kitchenName || chef.name}'s status changed to ${status}.`);
    } catch (error) {
      setActionError(error.message || "Chef status couldn't be updated.");
    }
  }

  function confirmBan(reason) {
    try {
      banSeller(banTarget.id, user.societyId, reason, user);
      setBanTarget(null);
      completeAction(`${banTarget.kitchenName || banTarget.name} was banned. Placed orders were cancelled.`);
      return "";
    } catch (error) {
      return error.message || "Chef couldn't be banned.";
    }
  }

  function handleUnban(chef) {
    try {
      unbanSeller(chef.id, user.societyId, user);
      completeAction(`${chef.kitchenName || chef.name} is verified and remains offline.`);
    } catch (error) {
      setActionError(error.message || "Chef couldn't be unbanned.");
    }
  }

  function changeBuyerStatus(buyer, status) {
    try {
      setBuyerStatus(buyer.id, status, user);
      completeAction(`${buyer.name}'s account is ${status}.`);
    } catch (error) {
      setActionError(error.message || "Buyer status couldn't be updated.");
    }
  }

  function quickVerify(value) {
    const needle = value.toLowerCase().replace(/\s+/g, "");
    const buyer = buyers.find((resident) =>
      resident.status !== "approved" &&
      [resident.mobile, resident.flat].some((field) => String(field || "").toLowerCase().replace(/\s+/g, "") === needle),
    );
    if (!buyer) return "No pending buyer with that mobile number or flat was found.";
    try {
      setBuyerStatus(buyer.id, "approved", user);
      completeAction(`${buyer.name} has been approved.`);
      return "";
    } catch (error) {
      return error.message || "Buyer couldn't be approved.";
    }
  }

  function saveReferralActive(active) {
    try {
      setReferralActive(user.societyId, active);
      logAudit({ actor: user, action: "referral.updated", targetType: "society", targetId: user.societyId, details: `Referral code ${active ? "activated" : "deactivated"}.` });
      completeAction(active ? "Referral code activated." : "Referral code deactivated.");
    } catch (error) {
      setActionError(error.message || "Referral status couldn't be updated.");
    }
  }

  function handleRegenerateReferral() {
    if (!window.confirm("Regenerate the referral code? Existing verified chefs will stay verified.")) return;
    try {
      regenerateReferral(user.societyId);
      logAudit({ actor: user, action: "referral.regenerated", targetType: "society", targetId: user.societyId, details: "Society referral code regenerated." });
      completeAction("A new referral code is ready to share.");
    } catch (error) {
      setActionError(error.message || "Referral code couldn't be regenerated.");
    }
  }

  function handleIssueMessage(issueId, text) {
    try {
      addIssueMessage(issueId, user, text);
      refresh();
      return "";
    } catch (error) {
      return error.message || "Your message couldn't be sent.";
    }
  }

  function handleIssueStatus(issue, values) {
    try {
      updateIssueStatus(issue.id, user, values);
      completeAction(values.status === "In review" ? "Issue moved to In review." : `Issue ${values.status.toLowerCase()}.`);
      return "";
    } catch (error) {
      return error.message || "Issue status couldn't be updated.";
    }
  }

  function handlePostPoll(values) {
    try {
      createPoll({
        ...values,
        societyId: user.societyId,
        authorId: user.id,
        authorRole: "admin",
        authorLabel: "Society Admin",
      });
      completeAction("Poll posted for your society.");
      return "";
    } catch (error) {
      return error.message || "Poll couldn't be posted.";
    }
  }

  function handlePollClose(pollId) {
    try {
      closePoll(pollId, user.id);
      refresh();
      return "";
    } catch (error) {
      return error.message || "Poll couldn't be closed.";
    }
  }

  function handlePollDelete(poll) {
    try {
      deletePoll(poll.id, user.societyId, user.id);
      completeAction("Poll deleted.");
      return "";
    } catch (error) {
      return error.message || "Poll couldn't be deleted.";
    }
  }

  function handlePollVote(pollId, optionId) {
    try {
      const result = votePoll(pollId, user.id, optionId);
      if (result) refresh();
      return result;
    } catch (error) {
      setActionError(error.message || "Vote couldn't be saved.");
      return false;
    }
  }

  function handleSaveAnnouncement(text) {
    try {
      saveAnnouncement(user.societyId, text);
      completeAction("Menu announcement updated.");
      return "";
    } catch (error) {
      return error.message || "Announcement couldn't be saved.";
    }
  }

  const currentSociety = society;
  if (!currentSociety && !dataError) return null;

  return (
    <main className="society-admin-shell">
      <header className="society-admin-header">
        <div className="society-admin-brand-row">
          <div><p>KitchenNextDoor · Society Console</p><h1>{currentSociety?.name || "Society Admin"}</h1><span>Welcome, {user.name}</span></div>
          <button className="staff-logout" type="button" onClick={logout}>Log out</button>
        </div>
        <nav className="society-admin-tabs" aria-label="Society Admin console sections">
          {TABS.map((item) => <button type="button" key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setActionError(""); setActionMessage(""); }}>
            {item}{badges[item] > 0 && <span>{badges[item]}</span>}
          </button>)}
        </nav>
      </header>
      <div className="society-admin-main">
        {actionMessage && <p className="admin-action-message" role="status">{actionMessage}</p>}
        {actionError && <p className="admin-action-error" role="alert">{actionError}</p>}
        {dataError ? <div className="admin-empty admin-load-error" role="alert"><h2>Console unavailable</h2><p>{dataError}</p><button className="button button-outline" onClick={refresh}>Try again</button></div> : (
          <>
            {tab === "Dashboard" && <DashboardTab society={currentSociety} chefs={chefs} buyers={buyers} orders={orders} issues={issues} polls={polls} onTab={setTab} />}
            {tab === "Chefs" && <ChefsTab chefs={chefs} dishes={dishes} orders={orders} reviews={reviews} issues={issues} commissionDue={getCommissionDue} onVerify={verifyChef} onStatus={changeChefStatus} onBan={setBanTarget} onUnban={handleUnban} />}
            {tab === "Referral" && <ReferralTab society={currentSociety} onRegenerate={handleRegenerateReferral} onToggle={saveReferralActive} />}
            {tab === "Issues" && <IssuesTab issues={issues} orders={orders} chefs={chefs} admin={user} onStatus={handleIssueStatus} onMessage={handleIssueMessage} />}
            {tab === "Buyers and Polls" && <ResidentsPollsTab buyers={buyers} polls={polls} admin={user} now={now} announcement={announcement}
              onBuyerStatus={changeBuyerStatus} onQuickVerify={quickVerify} onPostPoll={handlePostPoll} onClosePoll={handlePollClose}
              onDeletePoll={handlePollDelete} onSaveAnnouncement={handleSaveAnnouncement} onVote={handlePollVote} />}
            {tab === "Kitchens and Orders" && <KitchensOrdersTab chefs={chefs} reviews={reviews} orders={orders} />}
          </>
        )}
      </div>
      {banTarget && <BanChefModal chef={banTarget} onClose={() => setBanTarget(null)} onSubmit={confirmBan} />}
    </main>
  );
}
