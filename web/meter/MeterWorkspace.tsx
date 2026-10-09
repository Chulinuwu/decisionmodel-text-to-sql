import { useState } from 'react';
import { useMeter } from './useMeter';
import { meterExamples } from './examples';
import { MeterEvidence } from './MeterEvidence';

export function MeterWorkspace() {
  const [question, setQuestion] = useState(meterExamples[0]);
  const { dataset, response, error, loading, ask, reset } = useMeter();
  return <main style={{ maxWidth: 1100, margin: '0 auto', padding: 24 }}>
    <h1>Meter analytics</h1>
    <p>Synthetic demonstration data. Answers describe recorded measurements, not proven causes.</p>
    {dataset && <p>Clock: {new Date(dataset.context.asOf).toLocaleString('en-GB', { timeZone: dataset.context.timezone })} ({dataset.context.timezone}). Resources: {dataset.resources.join(', ')}.
      {' '}Chemical and H2SO4 are separate fixture categories.</p>}
    <form className="question-card" onSubmit={event => { event.preventDefault(); if (!loading && dataset) void ask(question); }}>
      <label htmlFor="meter-question">Meter question in English or Thai</label>
      <textarea id="meter-question" maxLength={600} minLength={3} required value={question} onChange={event => setQuestion(event.target.value)} />
      <button className="primary-button" disabled={loading || !dataset || question.trim().length < 3}>{loading ? 'Checking measurements...' : 'Ask'}</button>
      <button type="button" onClick={reset}>New conversation / cancel</button>
    </form>
    <div className="examples">{meterExamples.map(example => <button key={example} disabled={loading} onClick={() => setQuestion(example)}>{example}</button>)}</div>
    {error && <p role="alert">{error}</p>}
    {response && <section aria-live="polite" className="status-card">
      <h2>{response.question}</h2>
      {response.contextReset && <p role="status">เริ่มบทสนทนาใหม่ เพราะบริบทของคำถามก่อนหน้าใช้ต่อไม่ได้แล้ว คำถามนี้จึงตอบแยกต่างหาก</p>}
      <p>{response.status === 'ok' ? response.result.text : response.message}</p>
      {response.status === 'ok' && <>
        <p>Period: {response.result.window.start} to {response.result.window.end} (end excluded).</p>
        <ul>{response.result.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
        <MeterEvidence evidence={response.result.evidence} />
        <details><summary>Interpretation</summary><pre>{JSON.stringify(response.result.plan, null, 2)}</pre></details>
      </>}
      <p>Provider: {response.provider || 'No model call'}; reported cost: ${response.usage.cost.toFixed(6)}</p>
    </section>}
  </main>;
}
