import { useState } from 'react';
import { filterLabels } from '../../utils/format';
import { Icon } from '../layout/Icon';
import { TraceList } from './TraceList';
import type { QueryDetailsProps } from '../../types/props';

export function QueryDetails({ response }: QueryDetailsProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  async function copy() {
    if (response.status !== 'ok') return;
    try {
      await navigator.clipboard.writeText(`${response.sql}\n\n-- Bound parameters\n${JSON.stringify(response.parameters, null, 2)}`);
      setCopied(true);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }
  return <details className="query-details"><summary>SQL และรายละเอียดการตัดสินใจ <span>ตรวจสอบที่มาของคำตอบ</span></summary><div className="details-content">
    {response.status === 'unsupported' && <><h3>รายละเอียดจากระบบ</h3><pre className="code-block">{`${response.message}\n${response.detail}`}</pre></>}
    {response.status === 'ok' && <>
      <div className="detail-heading"><h3>SQL ที่รันจริง</h3><button className="secondary-button" onClick={copy}><Icon name="copy" />{copied ? 'คัดลอกแล้ว' : 'คัดลอก SQL'}</button></div>
      {copyError && <p className="small" role="alert">คัดลอกอัตโนมัติไม่ได้ เลือกข้อความ SQL ด้านล่างเพื่อคัดลอก</p>}
      <pre className="sql-block"><code>{response.sql}</code></pre>
      <h4>ค่าที่ผูกกับพารามิเตอร์</h4><pre className="code-block">{JSON.stringify(response.parameters, null, 2)}</pre>
      <div className="execution-stats"><span>Model <strong>{response.model}</strong></span><span>Provider <strong>{response.provider}</strong></span><span>เวลารวม <strong>{(response.elapsedMs / 1000).toFixed(2)} วินาที</strong></span></div>
    </>}
    {response.status === 'ok' && filterLabels(response.plan).length > 0 && <><h4>เงื่อนไขในแผน ({response.plan.where.connector === 'and' ? 'ทุกข้อ' : 'ข้อใดข้อหนึ่ง'})</h4><ul className="filter-list">{filterLabels(response.plan).map((label, index) => <li key={index}><code>{label}</code></li>)}</ul></>}
    {response.status === 'ok' && <details className="nested-details"><summary>แผนคำค้นแบบโครงสร้าง (AST)</summary><pre className="code-block">{JSON.stringify(response.plan, null, 2)}</pre></details>}
    <div className="token-stats"><span>Input <strong>{response.usage.input_tokens.toLocaleString()} tokens</strong></span><span>Output <strong>{response.usage.output_tokens.toLocaleString()} tokens</strong></span><span>ค่าใช้จ่ายโมเดล <strong>${response.usage.cost.toFixed(6)}</strong></span></div>
    <h3>การตัดสินใจของโมเดล</h3><p className="muted small">โมเดลเลือกจากตัวเลือกที่ระบบกำหนด ระบบสร้างและตรวจ SQL จากแผน ค่า probability เป็นน้ำหนักของตัวเลือก ไม่ใช่หลักประกันว่าคำตอบตรงเจตนา</p>
    <TraceList trace={response.trace} />
  </div></details>;
}
