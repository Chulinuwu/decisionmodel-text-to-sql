import { chartMinRows } from '../config/chart';
import { numericValue } from './format';
import type { AnsweredResponse, ChartData } from '../types/state';

export function resultChartData(response: AnsweredResponse): ChartData | null {
  const metricIndex = response.plan.select.findIndex(expression => expression.kind === 'aggregate');
  const labelIndexes = response.plan.select.flatMap((expression, index) => expression.kind !== 'aggregate' ? [index] : []);
  if (!response.plan.groupBy.length || metricIndex < 0 || !labelIndexes.length || response.rows.length < chartMinRows) return null;
  const points: ChartData['points'] = [];
  for (const row of response.rows) {
    const value = numericValue(row[response.columns[metricIndex]] ?? null);
    if (value === null || value < 0) return null;
    points.push({ label: labelIndexes.map(index => String(row[response.columns[index]] ?? 'NULL')).join(' · '), value });
  }
  return { title: response.columns[metricIndex], points };
}
