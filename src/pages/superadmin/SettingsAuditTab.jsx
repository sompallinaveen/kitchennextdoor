import { useMemo, useState } from "react";
import DataTable from "../../components/DataTable.jsx";

export default function SettingsAuditTab({ settings, audit, onSaveSettings, onChangePassword }) {
  const [form, setForm] = useState(settings);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [action, setAction] = useState("All");
  const actions = useMemo(() => [...new Set(audit.map((item) => item.action))].sort(), [audit]);
  const visibleAudit = audit.filter((entry) => {
    const term = query.trim().toLowerCase();
    return (action === "All" || entry.action === action) &&
      (!term || [entry.actorName, entry.action, entry.targetType, entry.targetId, entry.details].some((value) => String(value || "").toLowerCase().includes(term)));
  });

  function save(event) {
    event.preventDefault();
    setError(""); setMessage("");
    const result = onSaveSettings(form);
    if (result) setError(result);
    else setMessage("Settings saved.");
  }
  function changePassword(event) {
    event.preventDefault();
    setError(""); setMessage("");
    const result = onChangePassword(password);
    if (result) setError(result);
    else { setPassword(""); setMessage("App Admin password updated."); }
  }
  return (
    <section className="super-tab-content">
      <div className="super-tab-heading"><div><p className="admin-eyebrow">Platform configuration</p><h2>Settings and Audit</h2></div></div>
      <section className="super-panel"><h3>Defaults for new societies</h3><form className="super-form-grid" onSubmit={save}><label>Default commission rate (%)<input type="number" min="0" step="0.1" value={form.commissionRate} onChange={(event) => setForm({ ...form, commissionRate: event.target.value })} /></label><label>Default commission minimum (₹)<input type="number" min="0" step="0.01" value={form.commissionMin} onChange={(event) => setForm({ ...form, commissionMin: event.target.value })} /></label><label>Invite token expiry (days)<input type="number" min="1" step="1" value={form.tokenExpiryDays} onChange={(event) => setForm({ ...form, tokenExpiryDays: event.target.value })} /></label><label>Commission overdue days (0 = off)<input type="number" min="0" step="1" value={form.overdueDays} onChange={(event) => setForm({ ...form, overdueDays: event.target.value })} /></label><button className="button button-primary" type="submit">Save settings</button></form></section>
      <section className="super-panel"><h3>Change App Admin password</h3><p className="super-muted">Use at least 8 characters. Prototype passwords are stored locally; production must use server-side hashing.</p><form className="super-password-form" onSubmit={changePassword}><label>New password<input type="password" minLength="8" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><button className="button button-primary">Update password</button></form>{error && <p className="field-error" role="alert">{error}</p>}{message && <p className="super-success" role="status">{message}</p>}</section>
      <section className="super-panel"><h3>Audit log · newest first</h3><div className="super-filter-row"><input aria-label="Search audit log" placeholder="Search actor, target or details" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filter audit by action" value={action} onChange={(event) => setAction(event.target.value)}><option>All</option>{actions.map((item) => <option key={item}>{item}</option>)}</select></div><DataTable columns={[{ label: "When", render: (entry) => new Date(Number(entry.at)).toLocaleString() }, { label: "Actor", render: (entry) => <>{entry.actorName}<small>{entry.actorRole}</small></> }, { label: "Action", key: "action" }, { label: "Target", render: (entry) => `${entry.targetType} · ${entry.targetId}` }, { label: "Details", key: "details" }]} rows={visibleAudit} empty="No audit events match your search." /></section>
    </section>
  );
}
