import { useMemo, useState } from "react";

function average(reviews) {
  return reviews.length ? reviews.reduce((sum, review) => sum + Number(review.stars || 0), 0) / reviews.length : null;
}

export default function ChefsTab({ chefs, dishes, orders, reviews, issues, commissionDue, onVerify, onStatus, onBan, onUnban }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [selected, setSelected] = useState(null);
  const visible = useMemo(() => chefs.filter((chef) => {
    const matchesStatus = status === "All" || chef.status === status.toLowerCase();
    const needle = query.trim().toLowerCase();
    const matchesText = !needle || [chef.name, chef.kitchenName, chef.mobile, chef.flat]
      .some((value) => value?.toLowerCase().includes(needle));
    return matchesStatus && matchesText;
  }), [chefs, query, status]);
  const selectedDishes = selected ? dishes.filter((dish) => dish.sellerId === selected.id) : [];
  const selectedReviews = selected ? reviews.filter((review) => review.sellerId === selected.id) : [];
  const selectedOrders = selected ? orders.filter((order) => order.sellerId === selected.id) : [];
  const selectedIssues = selected ? issues.filter((issue) => issue.sellerId === selected.id) : [];

  return (
    <section className="admin-tab-content">
      <div className="admin-tab-heading"><div><p className="admin-eyebrow">Home chefs in your community</p><h2>Chefs</h2></div></div>
      <div className="admin-list-controls">
        <input aria-label="Search chefs" placeholder="Search chef, kitchen, mobile or flat" value={query} onChange={(event) => setQuery(event.target.value)} />
        <select aria-label="Filter chefs by status" value={status} onChange={(event) => setStatus(event.target.value)}>
          {["All", "Pending", "Verified", "Rejected", "Suspended", "Banned"].map((item) => <option key={item}>{item}</option>)}
        </select>
      </div>
      {visible.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Chef / kitchen</th><th>Flat</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>{visible.map((chef) => <tr key={chef.id}>
          <td><strong>{chef.kitchenName || chef.name}</strong><small>{chef.name} · {chef.mobile}</small></td>
          <td>{[chef.tower, chef.flat].filter(Boolean).join(" · ") || "—"}</td>
          <td><span className={`admin-status-badge admin-status-${chef.status}`}>{chef.status}</span></td>
          <td className="admin-actions"><button onClick={() => setSelected(chef)}>Details</button>
            {chef.status !== "verified" && <button onClick={() => onVerify(chef)}>Verify</button>}
            {chef.status !== "rejected" && <button onClick={() => onStatus(chef, "rejected")}>Reject</button>}
            {chef.status !== "suspended" && <button onClick={() => onStatus(chef, "suspended")}>Suspend</button>}
            {chef.status !== "banned" && <button className="admin-danger-action" onClick={() => onBan(chef)}>Ban</button>}
            {["banned", "suspended", "rejected"].includes(chef.status) && <button onClick={() => onUnban(chef)}>{chef.status === "banned" ? "Unban" : "Reactivate"}</button>}
          </td>
        </tr>)}</tbody></table></div> : <div className="admin-empty"><h3>No chefs found</h3><p>New chef registrations will appear here.</p></div>}
      {selected && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section className="admin-detail-modal" role="dialog" aria-modal="true" aria-labelledby="chef-detail-title">
          <button className="modal-close" type="button" aria-label="Close" onClick={() => setSelected(null)}>×</button>
          <p className="admin-eyebrow">Chef profile</p><h2 id="chef-detail-title">{selected.kitchenName || selected.name}</h2>
          <p>{selected.name} · {[selected.tower, selected.flat].filter(Boolean).join(" · ") || "Flat not set"} · {selected.mobile}</p>
          {selected.banReason && <p className="admin-ban-reason"><strong>Ban reason:</strong> {selected.banReason}</p>}
          <div className="chef-detail-stats"><span>Rating <strong>{average(selectedReviews)?.toFixed(1) || "—"}</strong></span><span>Orders <strong>{selectedOrders.length}</strong></span><span>Commission owed <strong>₹{commissionDue(selected.id).toFixed(2)}</strong></span></div>
          <h3>Dishes</h3>
          {selectedDishes.length ? <ul>{selectedDishes.map((dish) => <li key={dish.id}>{dish.name} · ₹{Number(dish.price).toFixed(0)} · {dish.stock} in stock {dish.available === false ? "· hidden" : ""}</li>)}</ul> : <p className="admin-muted">No dishes listed yet.</p>}
          <h3>Issues raised against this chef</h3>
          {selectedIssues.length ? <ul>{selectedIssues.map((issue) => <li key={issue.id}>{issue.category} · {issue.status} · Order #{String(issue.orderId).slice(-6).toUpperCase()}</li>)}</ul> : <p className="admin-muted">No issues raised.</p>}
        </section>
      </div>}
    </section>
  );
}
