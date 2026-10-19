export default function StatCard({ label, value, detail, tone = "orange" }) {
  return (
    <article className={`seller-stat-card stat-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </article>
  );
}
