export default function DataTable({ columns, rows, empty = "Nothing to show yet." }) {
  if (!rows.length) return <p className="super-empty">{empty}</p>;
  return (
    <div className="super-table-scroll">
      <table className="super-table">
        <thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead>
        <tbody>{rows.map((row, index) => (
          <tr key={row.id || index}>{columns.map((column) => (
            <td key={column.label}>{column.render ? column.render(row) : row[column.key]}</td>
          ))}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}
