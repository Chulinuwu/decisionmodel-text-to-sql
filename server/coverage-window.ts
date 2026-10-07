import type { Coverage } from '../shared/query-schema.js';
import { addMonths } from './compile/calendar.js';
import { coverageRules } from './compile/analysis-config.js';

export function coverageWindow(months: { month: string; count: number }[]): Coverage {
  const counts = months.map(entry => entry.count).sort((a, b) => a - b);
  if (!counts.length) throw new Error('Coverage needs at least one month of orders');
  const middle = Math.floor(counts.length / 2);
  const median = counts.length % 2 ? counts[middle] ?? 0 : ((counts[middle - 1] ?? 0) + (counts[middle] ?? 0)) / 2;
  const complete = months.filter(entry => entry.count >= coverageRules.completeShareOfMedian * median);
  const first = complete[0], last = complete.at(-1);
  if (!first || !last) throw new Error('No complete month of orders');
  return { start: first.month, end: addMonths(last.month, 1) };
}
