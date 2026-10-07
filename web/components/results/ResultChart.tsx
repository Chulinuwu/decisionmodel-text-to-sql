import { chartMaxBars } from '../../config/chart';
import { numberLocale } from '../../config/labels';
import type { ResultChartProps } from '../../types/props';

export function ResultChart({ data }: ResultChartProps) {
  const visible = data.points.slice(0, chartMaxBars);
  const maximum = Math.max(...visible.map(item => item.value), 1);
  return <div className="chart-view">
    <h3>{data.title}</h3>
    <p className="muted small">{data.points.length > chartMaxBars ? `แสดง ${chartMaxBars} กลุ่มแรกตามลำดับผลลัพธ์ ดูครบได้ในตาราง` : 'เรียงตามลำดับผลลัพธ์จากฐานข้อมูล'}</p>
    <ol className="bar-chart">{visible.map((item, index) => <li key={`${index}-${item.label}`}><span className="bar-label" title={item.label}>{item.label}</span><div className="bar-track"><div className="bar-fill" style={{ width: `${item.value / maximum * 100}%` }} /></div><span className="bar-value">{item.value.toLocaleString(numberLocale, { maximumFractionDigits: 3 })}</span></li>)}</ol>
  </div>;
}
