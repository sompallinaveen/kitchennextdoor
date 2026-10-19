import StatCard from "../../components/StatCard.jsx";
import BarChart from "../../components/BarChart.jsx";

function startOfDay(value) {
  const date = new Date(value || 0);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export default function DashboardTab({ data, ledger, settings, onTab }) {
  const today = startOfDay(Date.now());
  const sales = Array.from({ length: 30 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - (29 - index));
    const total = data.orders.filter((order) => {
      const created = new Date(Number(order.createdAt) || order.createdAt || 0);
      return created.toDateString() === date.toDateString() &&
        ["Delivered", "Delivered and Paid", "Cash received and delivered"].includes(order.status);
    }).reduce((sum, order) => sum + Number(order.total || 0), 0);
    return { label: `${date.getDate()}/${date.getMonth() + 1}`, value: total };
  });
  const societySales = new Map();
  const chefOrders = new Map();
  const delivered = data.orders.filter((order) => ["Delivered", "Delivered and Paid", "Cash received and delivered"].includes(order.status));
  delivered.forEach((order) => {
    societySales.set(order.societyId, (societySales.get(order.societyId) || 0) + Number(order.total || 0));
    chefOrders.set(order.sellerId, (chefOrders.get(order.sellerId) || 0) + 1);
  });
  const topSocieties = [...societySales].map(([id, value]) => ({ item: data.societies.find((society) => society.id === id), value }))
    .filter((row) => row.item).sort((a, b) => b.value - a.value).slice(0, 5);
  const topChefs = [...chefOrders].map(([id, count]) => ({ item: data.chefs.find((chef) => chef.id === id), count }))
    .filter((row) => row.item).sort((a, b) => b.count - a.count).slice(0, 5);
  const now = Date.now();
  const alerts = [
    ...data.societies.filter((society) => !society.adminId).map((society) => ({ label: `${society.name} has no Society Admin.`, tab: "Societies" })),
    ...data.tokens.filter((token) => token.status === "unused" && token.expiresAt - now <= 48 * 3_600_000)
      .map((token) => ({ label: `An invite for ${data.societies.find((society) => society.id === token.societyId)?.name || "a society"} expires within 48 hours.`, tab: "Society Admins" })),
    ...(settings.overdueDays > 0 ? ledger.filter((row) => row.commissionOwed > 0 && row.overdueDays > settings.overdueDays)
      .map((row) => ({ label: `${row.chef.kitchenName || row.chef.name} has overdue commission.`, tab: "Commission" })) : []),
    ...data.issues.filter((issue) => ["Open", "In review"].includes(issue.status) && now - Number(issue.createdAt) > 48 * 3_600_000)
      .map((issue) => ({ label: `${issue.category} issue has been open over 48 hours.`, tab: "Orders and Issues" })),
  ];
  const todayOrders = data.orders.filter((order) => startOfDay(Number(order.createdAt) || order.createdAt) === today).length;

  return (
    <div className="super-tab-content">
      <div className="super-stat-grid">
        <StatCard label="Societies" value={data.societies.length} detail="Active and suspended" tone="navy" />
        <StatCard label="Chefs" value={data.chefs.length} detail="All statuses" tone="green" />
        <StatCard label="Buyers" value={data.buyers.length} detail="All statuses" />
        <StatCard label="Orders today" value={todayOrders} detail="All order statuses" tone="navy" />
        <StatCard label="Platform sales (GMV)" value={`₹${data.gmv.toFixed(0)}`} detail="Delivered orders" tone="green" />
        <StatCard label="Commission earned" value={`₹${data.commissionEarned.toFixed(2)}`} detail="Settled" />
        <StatCard label="Commission outstanding" value={`₹${data.commissionOutstanding.toFixed(2)}`} detail="Unsettled" tone="navy" />
      </div>
      <BarChart title="Platform sales · last 30 days" data={sales} format={(value) => `₹${Math.round(value)}`} />
      <div className="super-two-column">
        <section className="super-panel"><h2>Top societies by sales</h2>{topSocieties.length ? <ol className="super-ranking">{topSocieties.map(({ item, value }) => <li key={item.id}><span>{item.name}</span><strong>₹{value.toFixed(0)}</strong></li>)}</ol> : <p className="super-empty">Delivered sales will appear here.</p>}</section>
        <section className="super-panel"><h2>Top chefs by orders</h2>{topChefs.length ? <ol className="super-ranking">{topChefs.map(({ item, count }) => <li key={item.id}><span>{item.kitchenName || item.name}</span><strong>{count} orders</strong></li>)}</ol> : <p className="super-empty">Order activity will appear here.</p>}</section>
      </div>
      <section className="super-panel"><h2>Alerts</h2>{alerts.length ? <ul className="super-alerts">{alerts.map((alert, index) => <li key={`${alert.tab}-${index}`}><span>{alert.label}</span><button type="button" onClick={() => onTab(alert.tab)}>Review</button></li>)}</ul> : <p className="super-empty">No platform alerts right now.</p>}</section>
    </div>
  );
}
