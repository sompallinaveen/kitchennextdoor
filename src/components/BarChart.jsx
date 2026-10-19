export default function BarChart({ title, data, valueKey = "value", labelKey = "label", format = (value) => value }) {
  const max = Math.max(1, ...data.map((item) => Number(item[valueKey] || 0)));
  return (
    <section className="super-panel">
      <h2>{title}</h2>
      <div className="super-chart" role="img" aria-label={title}>
        {data.map((item, index) => {
          const value = Number(item[valueKey] || 0);
          return (
            <div className="super-chart-column" key={`${item[labelKey]}-${index}`} title={`${item[labelKey]}: ${format(value)}`}>
              <span className="super-chart-value">{value ? format(value) : ""}</span>
              <span className="super-chart-track"><i style={{ height: `${value ? Math.max(3, value / max * 100) : 2}%` }} /></span>
              <small>{item[labelKey]}</small>
            </div>
          );
        })}
      </div>
    </section>
  );
}
