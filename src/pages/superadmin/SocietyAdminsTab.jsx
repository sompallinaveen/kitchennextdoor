import DataTable from "../../components/DataTable.jsx";

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(Number(value)) : "Never";
}

export default function SocietyAdminsTab({ admins, societies, tokens, onGenerate, onRevoke, onRegenerate, onReplace, onDisable }) {
  const adminColumns = [
    { label: "Admin", render: (admin) => <><strong>{admin.name}</strong><small>{admin.email}</small></> },
    { label: "Society", render: (admin) => societies.find((society) => society.id === admin.societyId)?.name || "Unassigned" },
    { label: "Mobile", key: "mobile" },
    { label: "Last login", render: (admin) => formatDate(admin.lastLoginAt) },
    { label: "Status", render: (admin) => <span className={`super-status ${admin.disabled ? "is-suspended" : ""}`}>{admin.disabled ? "Disabled" : "Active"}</span> },
    { label: "Actions", render: (admin) => <div className="super-row-actions"><button type="button" onClick={() => onReplace(admin)}>Replace admin</button><button type="button" onClick={() => onDisable(admin, !admin.disabled)}>{admin.disabled ? "Enable" : "Disable"}</button></div> },
  ];
  const tokenColumns = [
    { label: "Invite code", render: (token) => <code>{token.code}</code> },
    { label: "Society", render: (token) => societies.find((society) => society.id === token.societyId)?.name || "Unknown society" },
    { label: "Status", render: (token) => <span className="super-status">{token.status}</span> },
    { label: "Expires", render: (token) => formatDate(token.expiresAt) },
    { label: "Actions", render: (token) => <div className="super-row-actions"><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(token.code); } catch { window.prompt("Copy this invite token:", token.code); } }}>Copy</button>{token.status === "unused" && <button type="button" onClick={() => onRevoke(token)}>Revoke</button>}{token.status !== "claimed" && !societies.find((society) => society.id === token.societyId)?.adminId && <button type="button" onClick={() => onRegenerate(token)}>Regenerate</button>}</div> },
  ];

  return (
    <section className="super-tab-content">
      <div className="super-tab-heading"><div><p className="admin-eyebrow">Access and invitations</p><h2>Society Admins and tokens</h2></div></div>
      <p className="super-warning">Invite codes are shown in full only to the App Admin. Each code can be used once and expires according to the configured token lifetime.</p>
      <section className="super-panel"><h3>Societies without an admin</h3>{societies.filter((society) => !society.adminId).length ? <div className="super-shortcuts">{societies.filter((society) => !society.adminId).map((society) => <div key={society.id}><strong>{society.name}</strong><button type="button" onClick={() => onGenerate(society)}>Generate token</button></div>)}</div> : <p className="super-empty">Every society has an assigned admin.</p>}</section>
      <section className="super-panel"><div className="super-heading-inline"><h3>Society Admin accounts</h3>{societies.length > 0 && <select aria-label="Choose society to generate token" onChange={(event) => event.target.value && onGenerate(societies.find((society) => society.id === event.target.value))}><option value="">Generate invite…</option>{societies.map((society) => <option key={society.id} value={society.id}>{society.name}</option>)}</select>}</div><DataTable columns={adminColumns} rows={admins} empty="No Society Admin accounts yet." /></section>
      <section className="super-panel"><h3>Admin invite tokens</h3><DataTable columns={tokenColumns} rows={tokens} empty="No invite tokens have been generated." /></section>
    </section>
  );
}
