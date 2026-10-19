import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import {
  createSociety,
  createToken,
  exportCommissionCsv,
  getAudit,
  getAdmins,
  getBuyers,
  getCommissionLedger,
  getDishes,
  getIssues,
  getOrders,
  getPlatformStats,
  getReviews,
  getSettings,
  getSocietyStats,
  logAudit,
  markCommissionSettled,
  regenerateToken,
  replaceAdmin,
  resetAllProjectData,
  revokeToken,
  saveSettings,
  setAdminDisabled,
  setAdminStatus,
  suspendSociety,
  updateSociety,
} from "../api/store.js";
import ConfirmModal from "../components/ConfirmModal.jsx";
import DashboardTab from "./superadmin/DashboardTab.jsx";
import SocietiesTab from "./superadmin/SocietiesTab.jsx";
import SocietyAdminsTab from "./superadmin/SocietyAdminsTab.jsx";
import ChefsTab from "./superadmin/ChefsTab.jsx";
import BuyersTab from "./superadmin/BuyersTab.jsx";
import OrdersIssuesTab from "./superadmin/OrdersIssuesTab.jsx";
import CommissionTab from "./superadmin/CommissionTab.jsx";
import SettingsAuditTab from "./superadmin/SettingsAuditTab.jsx";

const TABS = ["Dashboard", "Societies", "Society Admins", "Chefs", "Buyers", "Orders and Issues", "Commission", "Settings and Audit"];

function localDate(value) {
  const date = new Date(Number(value) || value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

export default function SuperAdmin() {
  const { user, logout, updateSuperAdminPassword } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState(TABS[0]);
  const [data, setData] = useState({ societies: [], chefs: [], buyers: [], orders: [], issues: [], tokens: [], gmv: 0, commissionEarned: 0, commissionOutstanding: 0 });
  const [dishes, setDishes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [settings, setSettings] = useState(null);
  const [societyStats, setSocietyStats] = useState({});
  const [ledger, setLedger] = useState([]);
  const [audit, setAudit] = useState([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [revealedToken, setRevealedToken] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ password: "", confirm: "" });

  const refresh = useCallback(() => {
    try {
      const platform = getPlatformStats();
      setData(platform);
      setDishes(getDishes());
      setReviews(getReviews());
      setAdmins(getAdmins());
      setSettings(getSettings());
      setSocietyStats(Object.fromEntries(platform.societies.map((society) => [society.id, getSocietyStats(society.id)])));
      setLedger(getCommissionLedger());
      setAudit(getAudit());
      setError("");
    } catch (loadError) {
      setError(loadError.message || "Platform data couldn't be loaded.");
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const tokens = data.tokens;

  function complete(text = "") {
    refresh();
    setMessage(text);
    setError("");
    setConfirmAction(null);
  }

  function execute(action, successMessage) {
    try {
      action();
      complete(successMessage);
      return "";
    } catch (actionError) {
      setError(actionError.message || "That action couldn't be completed.");
      return actionError.message || "That action couldn't be completed.";
    }
  }

  function createNewSociety(values) {
    try {
      const society = createSociety(values);
      logAudit({ actor: user, action: "society.created", targetType: "society", targetId: society.id, details: `${society.name} created.` });
      complete(`${society.name} created.`);
      return society;
    } catch (creationError) {
      return { error: creationError.message || "Society couldn't be created." };
    }
  }

  function generateInvite(society) {
    if (!society) return;
    execute(() => {
      const token = createToken(society.id, user);
      setRevealedToken(token);
      setTab("Society Admins");
    }, `Admin invite generated for ${society.name}.`);
  }

  function confirmCurrentAction() {
    const action = confirmAction;
    if (!action) return "";
    if (action.type === "suspendSociety") {
      return execute(() => suspendSociety(action.target.id, true, user), `${action.target.name} was suspended.`);
    }
    if (action.type === "reactivateSociety") {
      return execute(() => suspendSociety(action.target.id, false, user), `${action.target.name} was reactivated.`);
    }
    if (action.type === "replaceAdmin") {
      return execute(() => {
        const token = replaceAdmin(action.target.societyId, user);
        setRevealedToken(token);
      }, `Replacement invite generated for ${action.societyName}.`);
    }
    return "";
  }

  function updateSocietyAction(id, changes) {
    try {
      updateSociety(id, changes, user);
      complete("Society details updated.");
      return { error: "" };
    } catch (updateError) {
      return { error: updateError.message || "Society couldn't be updated." };
    }
  }

  function handleTokenAction(token, action) {
    if (action === "revoke") {
      execute(() => revokeToken(token.id, user), `Invite for ${data.societies.find((item) => item.id === token.societyId)?.name || "society"} revoked.`);
    } else {
      execute(() => { const replacement = regenerateToken(token.id, user); setRevealedToken(replacement); }, "Invite token regenerated; the previous code is no longer usable.");
    }
  }

  function handleAdminDisabled(admin, disabled) {
    execute(() => setAdminDisabled(admin.id, disabled, user), `${admin.name} ${disabled ? "disabled" : "enabled"}.`);
  }

  function handleAdminStatus(admin, status) {
    execute(() => setAdminStatus(admin.id, status, user), `${admin.name}'s status changed to ${status}.`);
  }

  function settleCommission(orderIds) {
    execute(() => markCommissionSettled(orderIds, user), `${orderIds.length} order commission(s) marked settled.`);
  }

  function downloadCsv() {
    try {
      const content = exportCommissionCsv();
      const url = URL.createObjectURL(new Blob([content], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "kitchennextdoor-commission.csv";
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage("Commission report downloaded.");
      setError("");
    } catch (downloadError) {
      setError(downloadError.message || "Commission report couldn't be downloaded.");
    }
  }

  function saveSettingsAction(next) {
    try {
      const saved = saveSettings(next, user);
      setSettings(saved);
      complete("Application settings saved.");
      return "";
    } catch (settingsError) {
      return settingsError.message || "Settings couldn't be saved.";
    }
  }

  function changePassword(nextPassword) {
    try {
      updateSuperAdminPassword(nextPassword);
      setMessage("App Admin password updated.");
      setError("");
      return "";
    } catch (passwordError) {
      return passwordError.message || "Password couldn't be updated.";
    }
  }

  function resetAllDataAction() {
    try {
      resetAllProjectData({ actor: user });
      logout();
      navigate("/super-admin", {
        replace: true,
        state: { notice: "All project data was reset successfully. Sign in again to continue." },
      });
      return "";
    } catch (resetError) {
      return resetError.message || "Failed to reset project data.";
    }
  }

  function submitFirstPassword(event) {
    event.preventDefault();
    setError("");
    if (passwordForm.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      setError("The passwords do not match.");
      return;
    }
    const failure = changePassword(passwordForm.password);
    if (!failure) setPasswordForm({ password: "", confirm: "" });
  }

  if (user?.mustChangePassword) {
    return (
      <main className="super-password-gate">
        <form className="super-password-card" onSubmit={submitFirstPassword}>
          <p className="admin-eyebrow">Required account security</p>
          <h1>Change your App Admin password</h1>
          <p>This built-in account must use a new password before the platform console can be opened.</p>
          <label>New password<input type="password" minLength="8" autoComplete="new-password" value={passwordForm.password} onChange={(event) => setPasswordForm({ ...passwordForm, password: event.target.value })} required /></label>
          <label>Confirm password<input type="password" minLength="8" autoComplete="new-password" value={passwordForm.confirm} onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })} required /></label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <button className="button button-primary button-full" type="submit">Set password and continue</button>
          <button className="button button-outline button-full" type="button" onClick={logout}>Log out</button>
        </form>
      </main>
    );
  }

  const badges = {
    Societies: data.societies.filter((society) => !society.adminId).length,
    "Society Admins": data.tokens.filter((token) => token.status === "unused" && token.expiresAt - Date.now() <= 48 * 3_600_000).length,
    Commission: data.commissionOutstanding > 0 ? 1 : 0,
  };

  return (
    <main className="super-admin-shell">
      <header className="super-admin-header">
        <div className="super-admin-brand-row">
          <div><p>KitchenNextDoor · Platform Operations</p><h1>Application Administrator Control Center</h1><span>Welcome, {user.name}</span></div>
          <button className="staff-logout" type="button" onClick={logout}>Log out</button>
        </div>
        <nav className="super-admin-tabs" aria-label="App Admin console sections">
          {TABS.map((item) => <button key={item} type="button" className={tab === item ? "active" : ""} onClick={() => { setTab(item); setError(""); setMessage(""); }}>{item}{badges[item] > 0 && <span>{badges[item]}</span>}</button>)}
        </nav>
      </header>
      <div className="super-admin-main">
        {message && <p className="admin-action-message" role="status">{message}</p>}
        {error && <p className="admin-action-error" role="alert">{error}<button type="button" onClick={refresh}>Retry data load</button></p>}
        {revealedToken && <section className="super-token-reveal" role="status"><div><strong>New admin invite token</strong><code>{revealedToken.code}</code><span>Expires {new Date(revealedToken.expiresAt).toLocaleString()}</span></div><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(revealedToken.code); setMessage("Invite token copied."); } catch { window.prompt("Copy this invite token:", revealedToken.code); } }}>Copy token</button><button aria-label="Dismiss token" type="button" onClick={() => setRevealedToken(null)}>×</button></section>}
        {tab === "Dashboard" && <DashboardTab data={data} ledger={ledger} settings={settings || { overdueDays: 0 }} onTab={setTab} />}
        {tab === "Societies" && <SocietiesTab societies={data.societies} stats={societyStats} admins={admins} settings={settings || { commissionRate: 5, commissionMin: 5 }} onCreate={createNewSociety} onUpdate={updateSocietyAction} onSuspend={(society, suspend) => setConfirmAction({ type: suspend ? "suspendSociety" : "reactivateSociety", target: society })} onGenerateToken={generateInvite} />}
        {tab === "Society Admins" && <SocietyAdminsTab admins={admins} societies={data.societies} tokens={tokens} onGenerate={generateInvite} onRevoke={(token) => handleTokenAction(token, "revoke")} onRegenerate={(token) => handleTokenAction(token, "regenerate")} onReplace={(admin) => setConfirmAction({ type: "replaceAdmin", target: admin, societyName: data.societies.find((society) => society.id === admin.societyId)?.name || "this society" })} onDisable={handleAdminDisabled} onStatus={handleAdminStatus} />}
        {tab === "Chefs" && <ChefsTab chefs={data.chefs} societies={data.societies} dishes={dishes} orders={data.orders} reviews={reviews} issues={data.issues} ledger={ledger} />}
        {tab === "Buyers" && <BuyersTab buyers={data.buyers} societies={data.societies} orders={data.orders} issues={data.issues} />}
        {tab === "Orders and Issues" && <OrdersIssuesTab orders={data.orders} issues={data.issues} societies={data.societies} chefs={data.chefs} admins={admins} />}
        {tab === "Commission" && <CommissionTab ledger={ledger} onSettle={settleCommission} onDownload={downloadCsv} />}
        {tab === "Settings and Audit" && <SettingsAuditTab settings={settings || { commissionRate: 5, commissionMin: 5, tokenExpiryDays: 7, overdueDays: 0 }} audit={audit} onSaveSettings={saveSettingsAction} onChangePassword={changePassword} onResetAllData={resetAllDataAction} />}
      </div>
      {confirmAction && <ConfirmModal title={confirmAction.type === "replaceAdmin" ? `Replace ${confirmAction.target.name}?` : `${confirmAction.type === "suspendSociety" ? "Suspend" : "Reactivate"} ${confirmAction.target.name}?`} description={confirmAction.type === "replaceAdmin" ? `This disables the existing admin and creates a one-time invite for ${confirmAction.societyName}.` : confirmAction.type === "suspendSociety" ? "All kitchens will go offline and new orders will be blocked until the community is reactivated." : "Residents and kitchens in this society will be able to use the marketplace again."} confirmLabel={confirmAction.type === "replaceAdmin" ? "Replace and generate invite" : confirmAction.type === "suspendSociety" ? "Suspend society" : "Reactivate society"} onClose={() => setConfirmAction(null)} onConfirm={confirmCurrentAction} />}
    </main>
  );
}
