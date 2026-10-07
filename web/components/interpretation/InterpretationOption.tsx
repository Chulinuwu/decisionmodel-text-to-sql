import { InterpretationParts } from './InterpretationParts';
import { probabilityLabel } from '../../utils/format';
import type { InterpretationOptionProps } from '../../types/props';

export function InterpretationOption({ interpretation, onExecute }: InterpretationOptionProps) {
  return <div className="interpretation-option">
    <div className="interpretation-option-heading">
      <h3>{interpretation.summary}</h3>
      {interpretation.probability !== null && <span className="probability">{probabilityLabel(interpretation.probability)}</span>}
    </div>
    <InterpretationParts parts={interpretation.parts} />
    <button type="button" className="secondary-button" onClick={() => onExecute(interpretation)}>ใช้แบบนี้</button>
  </div>;
}
