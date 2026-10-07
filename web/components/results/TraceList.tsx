import { probabilityLabel } from '../../utils/format';
import type { TraceListProps } from '../../types/props';

export function TraceList({ trace }: TraceListProps) {
  if (!trace.length) return <p className="muted small">ไม่มี decision trace ในคำตอบนี้</p>;
  return <div className="trace-list">{trace.map((item, index) => <details key={`${item.id}-${index}`} className="trace-item">
    <summary><span className="trace-label"><small>{item.stage} · {item.id}</small><strong>{item.label || item.id}</strong><code className="trace-choice">เลือก: {item.choice}</code></span><span className="probability">{probabilityLabel(item.probability)}</span></summary>
    <p className="muted small">Decision ID: {item.id}</p>
    <ul>{item.alternatives.map((alternative, alternativeIndex) => <li key={`${alternative.choice}-${alternativeIndex}`}><code>{alternative.choice}</code><span>{(alternative.probability * 100).toFixed(2)}%</span></li>)}</ul>
  </details>)}</div>;
}
