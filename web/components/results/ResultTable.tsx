import { formatCell } from '../../utils/format';
import type { ResultTableProps } from '../../types/props';

export function ResultTable({ response, question }: ResultTableProps) {
  return <div className="table-scroll" tabIndex={0} aria-label="ตารางผลลัพธ์ เลื่อนแนวนอนเพื่อดูทุกคอลัมน์">
    <table>
      <caption className="sr-only">ผลลัพธ์สำหรับ {question}</caption>
      <thead><tr><th className="index-cell" scope="col">#</th>{response.columns.map(column => <th key={column} scope="col">{column}</th>)}</tr></thead>
      <tbody>{response.rows.map((row, index) => <tr key={index}><td className="index-cell">{index + 1}</td>{response.columns.map(column => <td key={column} className={row[column] === null ? 'null-value' : ''}>{formatCell(row[column] ?? null)}</td>)}</tr>)}</tbody>
    </table>
  </div>;
}
