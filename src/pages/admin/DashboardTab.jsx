function sameLocalDay(value, today) {
  const date = new Date(typeof value === "number" ? value : value || 0);
  return date.toDateString() === today.toDateString();
}

export default function DashboardTab({ society, chefs, buyers, orders, issues, polls, onTab }) {
  const today = new Date();
  const verified = chefs.filter((chef) => chef.status === "verified").length;
  const pendingChefs = chefs.filter((chef) => chef.status === "pending");
  const banned = chefs.filter((chef) => chef.status === "banned").length;
  const approvedBuyers = buyers.filter((buyer) => buyer.status === "approved").length;
  const pendingBuyers = buyers.filter((buyer) => buyer.status === "pending");
  const openIssues = issues.filter((issue) => ["Open", "In review"].includes(issue.status));
  const todayOrders = orders.filter((order) => sameLocalDay(order.createdAt, today)).length;
  const first = new Date();
  first.setHours(0, 0, 0, 0);
  first.setDate(first.getDate() - 6);
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(first);
    date.setDate(first.getDate() + index);
    const sales = orders.filter((order) =>
      sameLocalDay(order.createdAt, date) &&
      !["Cancelled", "Rejected"].includes(order.status),
    ).reduce((sum, order) => sum + Number(order.total || 0), 0);
    return { label: new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(date), sales };
  });
  const maxSales = Math.max(1, ...days.map((day) => day.sales));
  const orderCounts = new Map();
  orders.forEach((order) => orderCounts.set(order.sellerId, (orderCounts.get(order.sellerId) || 0) + 1));
  const topChefs = [...orderCounts.entries()]
    .map(([sellerId, count]) => ({ chef: chefs.find((item) => item.id === sellerId), count }))
    .filter((item) => item.chef)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const staleIssues = openIssues.filter((issue) => Date.now() - Number(issue.createdAt) > 86_400_000);

  return (
    <div className="society-admin-content">
      <div className="admin-stat-grid">
        <article><span>Verified chefs</span><strong>{verified}</strong><small>{pendingChefs.length} pending · {banned} banned</small></article>
        <article><span>Approved buyers</span><strong>{approvedBuyers}</strong><small>{pendingBuyers.length} pending approval</small></article>
        <article><span>Orders today</span><strong>{todayOrders}</strong><small>All order statuses</small></article>
        <article><span>Open issues</span><strong>{openIssues.length}</strong><small>Open or in review</small></article>
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p className="admin-eyebrow">{society.name}</p><h2>Society sales · last 7 days</h2></div>
            <strong>₹{days.reduce((sum, day) => sum + day.sales, 0).toFixed(0)}</strong></div>
          <div className="admin-sales-chart" aria-label="Society sales for the last seven days">
            {days.map((day, index) => <div className="admin-sales-day" key={`${day.label}-${index}`}>
              <span className="admin-sales-value">{day.sales ? `₹${day.sales.toFixed(0)}` : ""}</span>
              <span className="admin-sales-track"><span style={{ height: `${day.sales ? Math.max(4, day.sales / maxSales * 100) : 2}%` }} /></span>
              <small>{day.label}</small>
            </div>)}
          </div>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p className="admin-eyebrow">Community decisions</p><h2>Active polls</h2></div><strong>{polls.filter((poll) => !poll.closed && (!poll.endsAt || Date.now() < Number(poll.endsAt))).length}</strong></div>
          <p className="admin-muted">Polls currently open for residents to vote on.</p>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading"><div><p className="admin-eyebrow">Neighbour favourites</p><h2>Top chefs by orders</h2></div></div>
          {topChefs.length ? <ol className="admin-ranking-list">{topChefs.map(({ chef, count }) =>
            <li key={chef.id}><span>{chef.kitchenName || chef.name}</span><strong>{count} orders</strong></li>,
          )}</ol> : <p className="admin-muted">Orders will reveal the neighbourhood favourites.</p>}
        </section>
        <section className="admin-panel admin-attention-panel">
          <div className="admin-panel-heading"><div><p className="admin-eyebrow">A little admin magic</p><h2>Needs your attention</h2></div></div>
          <ul className="admin-attention-list">
            {pendingChefs.map((chef) => <li key={chef.id}><span>{chef.kitchenName || chef.name} is awaiting chef verification.</span><button onClick={() => onTab("Chefs")}>Review chef</button></li>)}
            {pendingBuyers.map((buyer) => <li key={buyer.id}><span>{buyer.name} is awaiting flat approval.</span><button onClick={() => onTab("Buyers and Polls")}>Review buyer</button></li>)}
            {staleIssues.map((issue) => <li key={issue.id}><span>{issue.category} issue has been open for over 24 hours.</span><button onClick={() => onTab("Issues")}>Review issue</button></li>)}
            {!pendingChefs.length && !pendingBuyers.length && !staleIssues.length && <li className="admin-muted">Everything is up to date. Thanks for looking after your community!</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
