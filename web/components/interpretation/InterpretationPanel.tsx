import { AlternativeList } from './AlternativeList';
import { InterpretationParts } from './InterpretationParts';
import { probabilityLabel } from '../../utils/format';
import type { InterpretationPanelProps } from '../../types/props';

export function InterpretationPanel({ response, dataset, onExecute }: InterpretationPanelProps) {
  const { interpretation, plan } = response;
  const base = dataset?.schema.relations.find(relation => relation.name === plan.from);
  return <div className="interpretation">
    <h3>ระบบตีความว่า</h3>
    <p className="interpretation-summary">{interpretation.summary}</p>
    <InterpretationParts parts={interpretation.parts} />
    <div className="interpretation-meta">
      <span>เริ่มจาก <code>{plan.from}</code>{base ? ` · ${base.grain}` : ''}</span>
      <span>สูงสุด {plan.limit} แถว{interpretation.probability !== null ? ` · ความน่าจะเป็น ${probabilityLabel(interpretation.probability)}` : ''}</span>
    </div>
    {response.warnings.length > 0 && <ul className="warnings">{response.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
    {response.alternatives.length > 0 && <AlternativeList alternatives={response.alternatives} onExecute={onExecute} />}
  </div>;
}
