export function Table<T extends Record<string, unknown>>({ rows }: { rows: T[] }) {
  const cols = rows[0] ? Object.keys(rows[0]) : [];
  return <table><thead><tr>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c}>{String(r[c])}</td>)}</tr>)}</tbody></table>;
}
