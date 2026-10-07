import { InterpretationOption } from './InterpretationOption';
import { QueryDetails } from '../results/QueryDetails';
import type { ChooseCardProps } from '../../types/props';

export function ChooseCard({ response, onExecute }: ChooseCardProps) {
  return <section className="response-card" aria-live="polite">
    <span className="eyebrow">เลือกการตีความ</span>
    <h2>หมายถึงแบบไหนคะ</h2>
    <p className="failure-source">คำถามที่ส่ง</p>
    <p className="submitted-question">{response.question}</p>
    <p className="response-message">{response.message}</p>
    <div className="interpretation-options">{response.interpretations.map(interpretation => <InterpretationOption key={interpretation.id} interpretation={interpretation} onExecute={onExecute} />)}</div>
    <QueryDetails response={response} />
  </section>;
}
