import { useState } from 'react';
import { numberLocale } from '../../config/labels';
import { resultChartData } from '../../utils/chart-data';
import { downloadCsv } from '../../utils/csv';
import { Icon } from '../layout/Icon';
import { ResultChart } from './ResultChart';
import { ResultTable } from './ResultTable';
import type { ResultCardProps } from '../../types/props';

export function ResultCard({ response, question }: ResultCardProps) {
  const [view, setView] = useState<'table' | 'chart'>('table');
  const chart = resultChartData(response);
  return <div className="result-card">
    <div className="result-toolbar">
      <div className="view-switch" role="group" aria-label="รูปแบบผลลัพธ์">
        <button className={view === 'table' ? 'selected' : ''} onClick={() => setView('table')} aria-pressed={view === 'table'}><Icon name="table" />ตาราง</button>
        {chart && <button className={view === 'chart' ? 'selected' : ''} onClick={() => setView('chart')} aria-pressed={view === 'chart'}><Icon name="chart" />กราฟ</button>}
      </div>
      <div className="result-actions"><span>{response.rows.length.toLocaleString(numberLocale)} แถว · {response.columns.length} คอลัมน์</span><button className="secondary-button" onClick={() => downloadCsv(response.columns, response.rows)} disabled={!response.rows.length}><Icon name="download" /><span>CSV</span></button></div>
    </div>
    {response.rows.length === 0
      ? <div className="empty-result"><h3>ไม่พบข้อมูลตามเงื่อนไขนี้</h3><p>ลองขยายช่วงเวลา หรือปรับเงื่อนไขในคำถาม</p></div>
      : view === 'chart' && chart
        ? <ResultChart data={chart} />
        : <ResultTable response={response} question={question} />}
    <div className="table-footer"><span>{response.truncated ? 'มีข้อมูลมากกว่าที่แสดง ผลลัพธ์ถูกจำกัดตามจำนวนแถวของคำค้น' : 'แสดงผลลัพธ์ทั้งหมดที่คำค้นคืนมา'}</span><span>PostgreSQL</span></div>
  </div>;
}
