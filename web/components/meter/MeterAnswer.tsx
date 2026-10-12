import { MeterEvidence } from '../../meter/MeterEvidence';
import type { MeterAnswerProps } from '../../types/props';

export function MeterAnswer({ response }: MeterAnswerProps) {
  return <div className="answer-bubble">
    {response.contextReset && <p className="context-note" role="status">เริ่มบทสนทนาใหม่ เพราะบริบทของคำถามก่อนหน้าใช้ต่อไม่ได้แล้ว คำถามนี้จึงตอบแยกต่างหาก</p>}
    {response.status === 'clarify'
      ? <div className="status-card" role="status"><h2>ขอรายละเอียดเพิ่ม</h2><p>{response.message}</p></div>
      : <>
        <p className="answer-text">{response.result.text}</p>
        {response.result.warnings.length > 0 && <ul className="warnings">{response.result.warnings.map((warning, index) => <li key={index}>{warning}</li>)}</ul>}
        <p className="meter-window">ช่วงเวลา {response.result.window.start} ถึงก่อน {response.result.window.end}</p>
        <details className="query-details"><summary>หลักฐานจากข้อมูล <span>{response.result.evidence.length} ชุด</span></summary>
          <div className="details-content"><MeterEvidence evidence={response.result.evidence} /></div>
        </details>
        <details className="query-details"><summary>การตีความคำถาม</summary>
          <div className="details-content"><pre className="code-block">{JSON.stringify(response.result.plan, null, 2)}</pre></div>
        </details>
      </>}
    <p className="meter-window">Provider: {response.provider || 'No model call'} · cost ${response.usage.cost.toFixed(6)}</p>
  </div>;
}
