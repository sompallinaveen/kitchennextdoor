import { useMemo, useState } from "react";
import DataTable from "../../components/DataTable.jsx";

function ratingFor(chefId, reviews) {
  const items = reviews.filter((review) => review.sellerId === chefId);
  return items.length ? items.reduce((sum, item) => sum + Number(item.stars || 0), 0) / items.length : null;
}

export default function ChefsTab({ chefs, societies, dishes, orders, reviews, issues, ledger }) {
  const [query, setQuery] = useState("");
  const [societyId, setSocietyId] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const visible = useMemo(() => chefs.filter((chef) => {
    const term = query.trim().toLowerCase();
    return (!societyId || chef.societyId === societyId) &&
      (status === "All" || chef.status === status.toLowerCase()) &&
      (!term || [chef.name, chef.kitchenName, chef.flat, chef.tower, chef.mobile].some((value) => String(value || "").toLowerCase().includes(term)));
  }), [chefs, query, societyId, status]);
  const leaderboard = chefs.map((chef) => ({
    chef,
    orders: orders.filter((order) => order.sellerId === chef.id && !["Cancelled", "Rejected"].includes(order.status)).length,
    rating: ratingFor(chef.id, reviews),
  })).sort((a, b) => b.orders - a.orders || (b.rating || 0) - (a.rating || 0)).slice(0, 10);
  const columns = [
    { label: "Chef / kitchen", render: (chef) => <><strong>{chef.kitchenName || chef.name}</strong><small>{chef.name} · {societies.find((society) => society.id === chef.societyId)?.name || "Unknown society"}</small></> },
    { label: "Flat", render: (chef) => [chef.tower, chef.flat].filter(Boolean).join(" · ") || "—" },
    { label: "Status", render: (chef) => <span className={`super-status ${chef.status === "banned" ? "is-suspended" : ""}`}>{chef.status}</span> },
    { label: "Orders / rating", render: (chef) => `${orders.filter((order) => order.sellerId === chef.id).length} / ${ratingFor(chef.id, reviews)?.toFixed(1) || "—"}` },
    { label: "Actions", render: (chef) => <div className="super-row-actions"><button type="button" onClick={() => setSelected(chef)}>Details</button></div> },
  ];
  const selectedOrders = selected ? orders.filter((order) => order.sellerId === selected.id) : [];

  return (
    <section className="super-tab-content">
      <div className="super-tab-heading"><div><p className="admin-eyebrow">All communities</p><h2>Chefs</h2></div></div>
      <div className="super-filter-row"><input aria-label="Search chefs" placeholder="Search name, kitchen, mobile or flat" value={query} onChange={(event) => setQuery(event.target.value)} /><select aria-label="Filter chefs by society" value={societyId} onChange={(event) => setSocietyId(event.target.value)}><option value="">All societies</option>{societies.map((society) => <option key={society.id} value={society.id}>{society.name}</option>)}</select><select aria-label="Filter chefs by status" value={status} onChange={(event) => setStatus(event.target.value)}>{["All", "Pending", "Verified", "Rejected", "Suspended", "Banned"].map((item) => <option key={item}>{item}</option>)}</select></div>
      <section className="super-panel"><DataTable columns={columns} rows={visible} empty="No chefs match these filters." /></section>
      <section className="super-panel"><h3>Chef leaderboard</h3>{leaderboard.length ? <ol className="super-ranking">{leaderboard.map(({ chef, orders: count, rating }) => <li key={chef.id}><span>{chef.kitchenName || chef.name} · {rating?.toFixed(1) || "New"}</span><strong>{count} orders</strong></li>)}</ol> : <p className="super-empty">No chef activity yet.</p>}</section>
      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}><section className="super-detail-modal" role="dialog" aria-modal="true" aria-labelledby="super-chef-detail"><button className="modal-close" type="button" aria-label="Close" onClick={() => setSelected(null)}>×</button><p className="admin-eyebrow">Chef detail</p><h2 id="super-chef-detail">{selected.kitchenName || selected.name}</h2><p>{selected.name} · {societies.find((society) => society.id === selected.societyId)?.name || "Unknown society"} · {[selected.tower, selected.flat].filter(Boolean).join(" · ")}</p><p>{selectedOrders.length} orders · Rating {ratingFor(selected.id, reviews)?.toFixed(1) || "—"} · Commission owed ₹{ledger.find((row) => row.chef.id === selected.id)?.commissionOwed?.toFixed(2) || "0.00"}</p><h3>Dishes</h3>{dishes.filter((dish) => dish.sellerId === selected.id).length ? <ul>{dishes.filter((dish) => dish.sellerId === selected.id).map((dish) => <li key={dish.id}>{dish.name} · stock {dish.stock} · {dish.available === false ? "hidden" : "available"}</li>)}</ul> : <p className="super-empty">No dishes listed.</p>}<h3>Issues</h3>{issues.filter((issue) => issue.sellerId === selected.id).length ? <ul>{issues.filter((issue) => issue.sellerId === selected.id).map((issue) => <li key={issue.id}>{issue.category} · {issue.status} · #{String(issue.orderId).slice(-6)}</li>)}</ul> : <p className="super-empty">No issues against this chef.</p>}</section></div>}
    </section>
  );
}
