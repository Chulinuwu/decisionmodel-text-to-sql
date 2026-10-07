import { ChooseCard } from '../interpretation/ChooseCard';
import { InterpretationPanel } from '../interpretation/InterpretationPanel';
import { UnsupportedCard } from '../interpretation/UnsupportedCard';
import { QueryDetails } from './QueryDetails';
import { ResultCard } from './ResultCard';
import type { ResultsPanelProps } from '../../types/props';

export function ResultsPanel({ response, question, dataset, onExecute }: ResultsPanelProps) {
  if (response.status === 'choose') return <ChooseCard response={response} onExecute={interpretation => onExecute(response.offerId, interpretation)} />;
  if (response.status === 'unsupported') return <UnsupportedCard response={response} />;
  const { offerId } = response;
  return <section className="results" aria-labelledby="results-heading">
    <div className="result-heading"><div><span className="eyebrow">QUERY RESULT</span><h2 id="results-heading">คำตอบจากข้อมูล</h2></div><span className="result-time">{(response.elapsedMs / 1000).toFixed(2)} วินาที</span></div>
    <p className="submitted-question">{question}</p>
    <InterpretationPanel response={response} dataset={dataset} onExecute={interpretation => { if (offerId) onExecute(offerId, interpretation); }} />
    <ResultCard response={response} question={question} />
    <QueryDetails response={response} />
  </section>;
}
