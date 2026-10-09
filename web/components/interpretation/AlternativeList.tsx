import { probabilityLabel } from '../../utils/format';
import type { AlternativeListProps } from '../../types/props';

export function AlternativeList({ alternatives, disabled, onExecute }: AlternativeListProps) {
  return <div className="alternatives">
    <h4>ตีความแบบอื่น</h4>
    <ul>{alternatives.map(alternative => <li key={alternative.id}><button type="button" className="alternative-button" disabled={disabled} onClick={() => onExecute(alternative)}>
      <span>{alternative.summary}</span>
      {alternative.probability !== null && <span className="probability">{probabilityLabel(alternative.probability)}</span>}
    </button></li>)}</ul>
  </div>;
}
