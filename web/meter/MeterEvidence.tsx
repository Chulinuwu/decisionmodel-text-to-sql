import type { MeterEvidence as Evidence } from '../../shared/meter-schema';

export function MeterEvidence({ evidence }: { evidence: Evidence[] }) {
  return <>{evidence.map((item, index) => <section key={`${item.kind}-${index}`} className="status-card">
    <h3>{item.kind.replaceAll('_', ' ')}</h3>
    {item.rows.length ? <div style={{ overflowX: 'auto' }}><table><thead><tr>
      {Object.keys(item.rows[0]).map(key => <th key={key}>{key}</th>)}
    </tr></thead><tbody>{item.rows.map((row, i) => <tr key={i}>
      {Object.keys(item.rows[0]).map(key => <td key={key}>{row[key] === null ? 'N/A' : String(row[key] ?? '')}</td>)}
    </tr>)}</tbody></table></div> : <p>No matching rows.</p>}
    {item.sql && <details><summary>SQL and parameters</summary><pre>{item.sql}</pre><pre>{JSON.stringify(item.parameters)}</pre></details>}
  </section>)}</>;
}
