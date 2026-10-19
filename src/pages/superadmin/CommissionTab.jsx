import { useMemo, useState } from "react";

export default function CommissionTab({ ledger, onSettle, onDownload }) {
  const [selected, setSelected] = useState([]);
  const rowsWithDue = useMemo(() => ledger.filter((row) => row.deliveredCount > 0), [ledger]);
  const selectedOrders = new Set(selected);
  function toggleOrder(orderId) {
    setSelected((current) => current.includes(orderId) ? current.filter((id) => id !== orderId) : [...current, orderId]);
  }
  function settle() {
    if (!selected.length) return;
    onSettle(selected);
    setSelected([]);
  }
  return (
    <section className="super-tab-content">
      <div className="super-tab-heading"><div><p className="admin-eyebrow">Platform commission tracking</p><h2>Commission</h2></div><button className="button button-outline" type="button" onClick={onDownload}>Download report</button></div>
      <p className="super-muted">Commission is calculated and snapshotted per order when the order is placed. Settlement never changes those snapshots.</p>
      <div className="super-actions"><button type="button" className="button button-primary" disabled={!selected.length} onClick={settle}>Mark selected orders settled ({selected.length})</button></div>
      {!rowsWithDue.length ? <section className="super-panel"><p className="super-empty">No delivered orders have commission entries yet.</p></section> : rowsWithDue.map((row) => (
        <section className="super-panel super-ledger-group" key={row.chef.id}>
          <div className="super-heading-inline"><h3>{row.society.name} · {row.chef.kitchenName || row.chef.name}</h3><span>{row.deliveredCount} delivered orders</span></div>
          <div className="super-ledger-summary"><span>Orders total <strong>₹{row.orderTotal.toFixed(2)}</strong></span><span>Commission owed <strong>₹{row.commissionOwed.toFixed(2)}</strong></span><span>Settled <strong>₹{row.commissionSettled.toFixed(2)}</strong></span><span>Oldest unsettled <strong>{row.oldestUnsettledAt ? `${row.overdueDays} days` : "—"}</strong></span></div>
          <div className="super-table-scroll"><table className="super-table"><thead><tr><th>Select</th><th>Order</th><th>Date</th><th>Total</th><th>Commission</th><th>Settlement</th></tr></thead><tbody>
            {row.deliveredOrders.map((order) => <tr key={order.id}><td>{order.commissionSettled === true ? "—" : <input type="checkbox" aria-label={`Select order ${order.id}`} checked={selectedOrders.has(order.id)} onChange={() => toggleOrder(order.id)} />}</td><td>#{String(order.id).slice(-6).toUpperCase()}</td><td>{new Date(Number(order.createdAt) || order.createdAt || 0).toLocaleDateString()}</td><td>₹{Number(order.total || 0).toFixed(2)}</td><td>₹{Number(order.commissionAmount || 0).toFixed(2)}</td><td>{order.commissionSettled === true ? `Settled ${order.settledAt ? new Date(Number(order.settledAt)).toLocaleDateString() : ""}` : "Owed"}</td></tr>)}
          </tbody></table></div>
        </section>
      ))}
    </section>
  );
}
