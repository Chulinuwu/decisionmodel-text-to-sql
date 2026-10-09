import { InterpretationOption } from './InterpretationOption';
import { QueryDetails } from '../results/QueryDetails';
import type { ChooseCardProps } from '../../types/props';

export function ChooseCard({ response, disabled, onExecute }: ChooseCardProps) {
  return <section className="response-card" aria-live="polite">
    <span className="eyebrow">เลือกการตีความ</span>
    <h2>หมายถึงแบบไหนคะ</h2>
    <p className="response-message">{response.message}</p>
    <div className="interpretation-options">{response.interpretations.map(interpretation => <InterpretationOption key={interpretation.id} interpretation={interpretation} disabled={disabled} onExecute={onExecute} />)}</div>
    <QueryDetails response={response} />
  </section>;
}
