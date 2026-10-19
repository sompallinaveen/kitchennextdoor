import { useMemo, useState } from "react";
import DataTable from "../../components/DataTable.jsx";

function dayStart(value) {
  return value ? new Date(`${value}T00:00:00`).getTime() : 0;
}

export default function OrdersIssuesTab({ orders, issues, societies, chefs, admins }) {
  const [societyId, setSocietyId] = useState("");
  const [status, setStatus] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [issueStatus, setIssueStatus] = useState("All");
  const visibleOrders = useMemo(() => orders.filter((order) => {
    const created = Number(order.createdAt) || new Date(order.createdAt || 0).getTime();
    return (!societyId || order.societyId === societyId) &&
      (status === "All" || order.status === status) &&
      (!from || created >= dayStart(from)) &&
      (!to || created < dayStart(to) + 86_400_000);
  }), [orders, societyId, status, from, to]);
  const visibleIssues = issues.filter((issue) => issueStatus === "All" || issue.status === issueStatus);
  const statusCounts = ["Open", "In review", "Resolved", "Dismissed"].map((item) => ({
    label: item,
    count: issues.filter((issue) => issue.status === item).length,
  }));
  const resolutionTimes = new Map();
  issues.filter((issue) => issue.resolvedAt && issue.resolvedBy).forEach((issue) => {
    const elapsed = Math.max(0, Number(issue.resolvedAt) - Number(issue.createdAt));
    const bucket = resolutionTimes.get(issue.resolvedBy) || { total: 0, count: 0 };
    bucket.total += elapsed;
    bucket.count += 1;
    resolutionTimes.set(issue.resolvedBy, bucket);
  });
  const orderColumns = [
    { label: "Order", render: (order) => <><strong>#{String(order.id).slice(-6).toUpperCase()}</strong><small>{new Date(Number(order.createdAt) || order.createdAt || 0).toLocaleString()}</small></> },
    { label: "Society", render: (order) => societies.find((society) => society.id === order.societyId)?.name || "Unknown society" },
    { label: "Chef", render: (order) => chefs.find((chef) => chef.id === order.sellerId)?.kitchenName || chefs.find((chef) => chef.id === order.sellerId)?.name || "Unknown chef" },
    { label: "Buyer", key: "buyerName" },
    { label: "Total", render: (order) => `₹${Number(order.total || 0).toFixed(2)}` },
    { label: "Status", key: "status" },
  ];
  return (
    <section className="super-tab-content">
      <div className="super-tab-heading"><div><p className="admin-eyebrow">Platform activity</p><h2>Orders and Issues</h2></div></div>
      <section className="super-panel">
        <h3>All orders · read only</h3>
        <div className="super-filter-row"><select aria-label="Filter orders by society" value={societyId} onChange={(event) => setSocietyId(event.target.value)}><option value="">All societies</option>{societies.map((society) => <option key={society.id} value={society.id}>{society.name}</option>)}</select><select aria-label="Filter orders by status" value={status} onChange={(event) => setStatus(event.target.value)}>{["All", "Placed", "Preparing", "Ready", "Packed and Ready", "Delivered", "Delivered and Paid", "Rejected", "Cancelled"].map((item) => <option key={item}>{item}</option>)}</select><label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label><label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label></div>
        <DataTable columns={orderColumns} rows={visibleOrders} empty="No orders match these filters." />
      </section>
      <section className="super-panel"><h3>Issue overview</h3><div className="super-issue-counts">{statusCounts.map((item) => <article key={item.label}><span>{item.label}</span><strong>{item.count}</strong></article>)}</div><h4>Average resolution time per Society Admin</h4>{resolutionTimes.size ? <ul className="super-ranking">{[...resolutionTimes].map(([adminId, value]) => <li key={adminId}><span>{admins.find((admin) => admin.id === adminId)?.name || "Former admin"}</span><strong>{(value.total / value.count / 3_600_000).toFixed(1)} hours · {value.count} issues</strong></li>)}</ul> : <p className="super-empty">Resolved issues will provide these averages.</p>}<div className="super-filter-row"><select aria-label="Filter issues by status" value={issueStatus} onChange={(event) => setIssueStatus(event.target.value)}>{["All", "Open", "In review", "Resolved", "Dismissed"].map((item) => <option key={item}>{item}</option>)}</select></div><DataTable columns={[{ label: "Issue", render: (issue) => <><strong>{issue.category}</strong><small>#{String(issue.orderId).slice(-6).toUpperCase()} · {issue.raisedByName}</small></> }, { label: "Society", render: (issue) => societies.find((society) => society.id === issue.societyId)?.name || "Unknown society" }, { label: "Status", key: "status" }, { label: "Opened", render: (issue) => new Date(Number(issue.createdAt) || issue.createdAt || 0).toLocaleString() }, { label: "Resolved", render: (issue) => issue.resolvedAt ? new Date(Number(issue.resolvedAt)).toLocaleString() : "—" }]} rows={visibleIssues} empty="No issues match this status." /></section>
    </section>
  );
}
