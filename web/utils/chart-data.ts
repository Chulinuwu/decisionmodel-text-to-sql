import type { ResultCell } from '../../shared/schema';
import { anomalyColumns, changeColumns } from '../config/analysis';
import { chartMinRows } from '../config/chart';
import { numericValue } from './format';
import type { AnsweredResponse, ChartData, ChartPoint } from '../types/state';

type Row = AnsweredResponse['rows'][number];

const label = (row: Row, columns: string[]) => columns.map(column => String(row[column] ?? 'NULL')).join(' · ');
const nonNegative = (value: ResultCell) => {
  const number = numericValue(value);
  return number !== null && number >= 0 ? number : null;
};

function points(rows: Row[], build: (row: Row) => ChartPoint | null): ChartPoint[] | null {
  const built = rows.map(build);
  return built.every(point => point !== null) ? built.filter(point => point !== null) : null;
}

function selectChart(response: AnsweredResponse, select: Extract<AnsweredResponse['plan'], { kind: 'select' }>): ChartData | null {
  const metricIndex = select.select.findIndex(expression => expression.kind === 'aggregate');
  const labelColumns = select.select.flatMap((expression, index) => expression.kind !== 'aggregate' ? [response.columns[index]] : []);
  if (!select.groupBy.length || metricIndex < 0 || !labelColumns.length || response.rows.length < chartMinRows) return null;
  const metric = response.columns[metricIndex];
  const built = points(response.rows, row => {
    const value = nonNegative(row[metric] ?? null);
    return value === null ? null : { label: label(row, labelColumns), value, compare: null, highlight: false };
  });
  return built && { title: metric, points: built };
}

function anomalyChart(response: AnsweredResponse): ChartData | null {
  const [unit] = response.columns;
  if (!unit || response.rows.length < chartMinRows) return null;
  const built = points(response.rows, row => {
    const value = nonNegative(row[anomalyColumns.value] ?? null);
    return value === null ? null : { label: label(row, [unit]), value, compare: null, highlight: row[anomalyColumns.outlier] === true };
  });
  return built && { title: anomalyColumns.value, points: built };
}

function changeChart(response: AnsweredResponse): ChartData | null {
  const known = Object.values(changeColumns);
  const groupColumns = response.columns.filter(column => !known.includes(column));
  const built = points(response.rows, row => {
    const value = nonNegative(row[changeColumns.current] ?? null);
    const previous = row[changeColumns.previous] ?? null;
    const compare = previous === null ? null : nonNegative(previous);
    if (value === null || (previous !== null && compare === null)) return null;
    return { label: groupColumns.length ? label(row, groupColumns) : changeColumns.current, value, compare, highlight: false };
  });
  return built && built.length ? { title: `${changeColumns.current} / ${changeColumns.previous}`, points: built } : null;
}

export function resultChartData(response: AnsweredResponse): ChartData | null {
  const { plan } = response;
  if (plan.kind === 'anomaly') return anomalyChart(response);
  if (plan.kind === 'period_change') return changeChart(response);
  return selectChart(response, plan);
}
