import { chartMaxBars } from '../../config/chart';
import { numberLocale } from '../../config/labels';
import type { ResultChartProps } from '../../types/props';

const formatValue = (value: number) => value.toLocaleString(numberLocale, { maximumFractionDigits: 3 });

export function ResultChart({ data }: ResultChartProps) {
  const visible = data.points.slice(0, chartMaxBars);
  const maximum = Math.max(...visible.flatMap(item => [item.value, item.compare ?? 0]), 1);
  const comparing = visible.some(item => item.compare !== null);
  return <div className="chart-view">
    <h3>{data.title}</h3>
    <p className="muted small">{data.points.length > chartMaxBars ? `แสดง ${chartMaxBars} กลุ่มแรกตามลำดับผลลัพธ์ ดูครบได้ในตาราง` : 'เรียงตามลำดับผลลัพธ์จากฐานข้อมูล'}{comparing ? ' · แถบอ่อนคือช่วงก่อนหน้า' : ''}{visible.some(item => item.highlight) ? ' · แถบที่เน้นสีคือค่าผิดปกติ' : ''}</p>
    <ol className="bar-chart">{visible.map((item, index) => <li key={`${index}-${item.label}`} className={item.highlight ? 'highlight' : ''}>
      <span className="bar-label" title={item.label}>{item.label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${item.value / maximum * 100}%` }} />
        {item.compare !== null && <div className="bar-compare" style={{ width: `${item.compare / maximum * 100}%` }} />}
      </div>
      <span className="bar-value">{formatValue(item.value)}{item.compare !== null ? ` / ${formatValue(item.compare)}` : ''}</span>
    </li>)}</ol>
  </div>;
}
