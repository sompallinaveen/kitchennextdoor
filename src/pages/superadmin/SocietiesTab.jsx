import { useState } from "react";
import DataTable from "../../components/DataTable.jsx";

const emptyForm = { name: "", address: "", city: "", expectedFlats: 15, commissionRate: "", commissionMin: "" };

export default function SocietiesTab({ societies, stats, admins, settings, onCreate, onUpdate, onSuspend, onGenerateToken }) {
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [created, setCreated] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function submit(event) {
    event.preventDefault();
    setError("");
    if (editing) {
      const result = onUpdate(editing.id, form);
      if (result?.error) { setError(result.error); return; }
      setMessage("Society details updated.");
      setEditing(null);
    } else {
      const result = onCreate({
        ...form,
        commissionRate: form.commissionRate === "" ? settings.commissionRate : form.commissionRate,
        commissionMin: form.commissionMin === "" ? settings.commissionMin : form.commissionMin,
      });
      if (result?.error) { setError(result.error); return; }
      setCreated(result);
      setMessage(`${result.name} created. Generate its Society Admin invite when ready.`);
    }
    setForm(emptyForm);
  }

  function edit(society) {
    setEditing(society);
    setForm({
      name: society.name,
      address: society.address || "",
      city: society.city || "",
      expectedFlats: society.expectedFlats || 0,
      commissionRate: society.commissionRate,
      commissionMin: society.commissionMin,
    });
    setError("");
  }

  const columns = [
    { label: "Society", render: (society) => <><strong>{society.name}</strong><small>{society.address || "Address not set"}</small></> },
    { label: "City", key: "city" },
    { label: "Admin", render: (society) => admins.find((admin) => admin.id === society.adminId)?.name || <span className="super-attention">Unassigned</span> },
    { label: "Flats", render: (society) => stats[society.id]?.flats || "—" },
    { label: "Chefs / Buyers", render: (society) => `${stats[society.id]?.chefs || 0} / ${stats[society.id]?.buyers || 0}` },
    { label: "Monthly sales", render: (society) => `₹${(stats[society.id]?.monthlySales || 0).toFixed(0)}` },
    { label: "Commission", render: (society) => `${society.commissionRate}% · min ₹${society.commissionMin}` },
    { label: "Status", render: (society) => <span className={`super-status ${society.status === "suspended" ? "is-suspended" : ""}`}>{society.status === "suspended" ? "Suspended" : "Active"}</span> },
    { label: "Actions", render: (society) => <div className="super-row-actions"><button type="button" onClick={() => edit(society)}>Edit</button><button type="button" onClick={() => onSuspend(society, society.status !== "suspended")}>{society.status === "suspended" ? "Reactivate" : "Suspend"}</button>{!society.adminId && <button type="button" onClick={() => onGenerateToken(society)}>Generate token</button>}</div> },
  ];

  return (
    <section className="super-tab-content">
      <div className="super-tab-heading"><div><p className="admin-eyebrow">Communities on the platform</p><h2>Societies</h2></div></div>
      <section className="super-panel">
        <h3>{editing ? `Edit ${editing.name}` : "Add a society"}</h3>
        <form className="super-form-grid" onSubmit={submit}>
          <label>Society name *<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label>
          <label>City<input value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></label>
          <label>Address<input value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} /></label>
          <label>Expected flats<input type="number" min="0" value={form.expectedFlats} onChange={(event) => setForm({ ...form, expectedFlats: event.target.value })} /></label>
          <label>Commission rate (%)<input type="number" min="0" step="0.1" value={form.commissionRate} placeholder={String(settings.commissionRate)} onChange={(event) => setForm({ ...form, commissionRate: event.target.value })} /></label>
          <label>Commission minimum (₹)<input type="number" min="0" step="0.01" value={form.commissionMin} placeholder={String(settings.commissionMin)} onChange={(event) => setForm({ ...form, commissionMin: event.target.value })} /></label>
          {error && <p className="field-error" role="alert">{error}</p>}
          <div className="super-actions"><button className="button button-primary" type="submit">{editing ? "Save changes" : "Create society"}</button>{editing && <button type="button" className="button button-outline" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancel edit</button>}</div>
        </form>
        {message && <p className="super-success" role="status">{message}</p>}
        {created && <button type="button" className="button button-outline" onClick={() => { onGenerateToken(created); setCreated(null); }}>Generate admin invite token for {created.name}</button>}
      </section>
      <section className="super-panel"><h3>All societies</h3><DataTable columns={columns} rows={societies} empty="No societies yet. Add the first community above." /></section>
    </section>
  );
}
