import { useMemo, useState } from "react";
import DataTable from "../../components/DataTable.jsx";

export default function BuyersTab({ buyers, societies, orders, issues, onStatus }) {
  const [query, setQuery] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const visible = useMemo(() => buyers.filter((buyer) => {
    const term = query.trim().toLowerCase();
    return (!societyId || buyer.societyId === societyId) &&
      (status === "All" || buyer.status === status.toLowerCase()) &&
      (!term || [buyer.name, buyer.email, buyer.mobile, buyer.flat, buyer.tower].some((value) => String(value || "").toLowerCase().includes(term)));
  }), [buyers, query, societyId, status]);
  const columns = [
    { label: "Buyer", render: (buyer) => <><strong>{buyer.name}</strong><small>{societies.find((society) => society.id === buyer.societyId)?.name || "Unknown society"}</small></> },
    { label: "Flat / mobile", render: (buyer) => `${[buyer.tower, buyer.flat].filter(Boolean).join(" · ") || "—"} · ${buyer.mobile}` },
    { label: "Status", render: (buyer) => <span className={`super-status ${buyer.status === "suspended" || buyer.status === "rejected" ? "is-suspended" : ""}`}>{buyer.status}</span> },
    { label: "Actions", render: (buyer) => <div className="super-row-actions"><button type="button" onClick={() => setSelected(buyer)}>Details</button>{buyer.status !== "approved" && buyer.status !== "suspended" && <button type="button" onClick={() => onStatus(buyer, "approved")}>Approve</button>}{buyer.status !== "rejected" && buyer.status !== "approved" && <button type="button" onClick={() => onStatus(buyer, "rejected")}>Reject</button>}{buyer.status !== "suspended" && buyer.status !== "rejected" && <button type="button" onClick={() => onStatus(buyer, "suspended")}>Suspend</button>}{buyer.status === "suspended" && <button type="button" onClick={() => onStatus(buyer, "approved")}>Reactivate</button>}</div> },
  ];
  const buyerOrders = selected ? orders.filter((order) => order.buyerId === selected.id) : [];
  return (
    <section className="super-tab-content">
      <div className="super-tab-heading"><div><p className="admin-eyebrow">Residents across all communities</p><h2>Buyers</h2></div></div>
      <div className="super-filter-row"><input aria-label="Search buyers" placeholder="Search name, mobile, email or flat" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filter buyers by society" value={societyId} onChange={(event) => setSocietyId(event.target.value)}><option value="">All societies</option>{societies.map((society) => <option key={society.id} value={society.id}>{society.name}</option>)}</select><select aria-label="Filter buyers by status" value={status} onChange={(event) => setStatus(event.target.value)}>{["All", "Pending", "Approved", "Rejected", "Suspended"].map((item) => <option key={item}>{item}</option>)}</select></div>
      <section className="super-panel"><DataTable columns={columns} rows={visible} empty="No buyers match these filters." /></section>
      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="super-detail-modal" role="dialog" aria-modal="true" aria-labelledby="super-buyer-detail"><button className="modal-close" type="button" aria-label="Close" onClick={() => setSelected(null)}>×</button><p className="admin-eyebrow">Buyer detail</p><h2 id="super-buyer-detail">{selected.name}</h2><p>{selected.email} · {selected.mobile} · {societies.find((society) => society.id === selected.societyId)?.name}</p><h3>Order history</h3>{buyerOrders.length ? <ul>{buyerOrders.map((order) => <li key={order.id}>#{String(order.id).slice(-6)} · {order.status} · ₹{Number(order.total).toFixed(2)}</li>)}</ul> : <p className="super-empty">No orders.</p>}<h3>Issues raised</h3>{issues.filter((issue) => issue.raisedBy === selected.id).length ? <ul>{issues.filter((issue) => issue.raisedBy === selected.id).map((issue) => <li key={issue.id}>{issue.category} · {issue.status} · #{String(issue.orderId).slice(-6)}</li>)}</ul> : <p className="super-empty">No issues raised.</p>}</section></div>}
    </section>
  );
}
