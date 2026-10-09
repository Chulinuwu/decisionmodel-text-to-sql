import { AlternativeList } from '../interpretation/AlternativeList';
import { InterpretationPanel } from '../interpretation/InterpretationPanel';
import { QueryDetails } from '../results/QueryDetails';
import { ResultCard } from '../results/ResultCard';
import type { AnswerBubbleProps } from '../../types/props';

export function AnswerBubble({ response, dataset, disabled, onExecute }: AnswerBubbleProps) {
  return <div className="answer-bubble">
    <p className="answer-text">{response.answer}</p>
    <ResultCard response={response} question={response.question} />
    <InterpretationPanel response={response} dataset={dataset} />
    {response.offerId !== null && response.alternatives.length > 0 && <details className="query-details"><summary>ตีความแบบอื่น <span>{response.alternatives.length} แบบ</span></summary>
      <AlternativeList alternatives={response.alternatives} disabled={disabled} onExecute={onExecute} />
    </details>}
    <QueryDetails response={response} />
  </div>;
}
