import { formatCell, numericColumns } from '../../utils/format';
import type { TableRowsGridProps } from '../../types/props';

export function TableRowsGrid({ table, page }: TableRowsGridProps) {
  const numeric = numericColumns(page);
  return <div className="table-scroll rows-grid" tabIndex={0} aria-label={`แถวข้อมูลของ ${table} เลื่อนแนวนอนเพื่อดูทุกคอลัมน์`}>
    <table>
      <caption className="sr-only">แถวข้อมูลของ {table}</caption>
      <thead><tr><th className="index-cell" scope="col">#</th>{page.columns.map(column => <th key={column} scope="col" className={numeric.has(column) ? 'numeric' : undefined}>{column}</th>)}</tr></thead>
      <tbody>{page.rows.map((row, index) => <tr key={page.offset + index}>
        <td className="index-cell">{page.offset + index + 1}</td>
        {page.columns.map(column => {
          const text = formatCell(row[column] ?? null, column);
          return <td key={column} title={text} className={row[column] === null ? 'null-value' : numeric.has(column) ? 'numeric' : undefined}>{text}</td>;
        })}
      </tr>)}</tbody>
    </table>
  </div>;
}
