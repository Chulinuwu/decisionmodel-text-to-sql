import type { Coverage, Literal, RelativePeriodKind } from '../../shared/query-schema.js';
import { relativePeriodKinds } from '../../shared/query-schema.js';
import { addDays, addMonths, daysBetween, monthsBetween, yearStart } from './calendar.js';
import type { Granularity, Window } from './compile.types.js';


export const isRelativeKind = (text: string): text is RelativePeriodKind => relativePeriodKinds.some(kind => kind === text);

// Relative periods anchor to the last complete month of data, never to max(timestamp): the dataset tail is sparse.
export function relativeWindow(kind: RelativePeriodKind, coverage: Coverage): Window {
  const latest = addMonths(coverage.end, -1), thisYear = yearStart(latest);
  switch (kind) {
    case 'latest_month': return { start: latest, end: coverage.end };
    case 'previous_month': return { start: addMonths(latest, -1), end: latest };
    case 'latest_year': return { start: thisYear, end: coverage.end };
    case 'previous_year': return { start: addMonths(thisYear, -12), end: thisYear };
    case 'coverage': return { start: coverage.start, end: coverage.end };
  }
}

export function relativeLiteral(kind: RelativePeriodKind, coverage: Coverage): Literal {
  const window = relativeWindow(kind, coverage);
  return { value: window.start, source: 'relative', text: kind, start: null, end: null, upper: window.end };
}

export function granularity(literal: Literal): Granularity | null {
  if (literal.source === 'relative') return literal.text.endsWith('month') ? 'month' : literal.text.endsWith('year') ? 'year' : null;
  if (!literal.upper || typeof literal.value !== 'string') return null;
  if (literal.upper === addDays(literal.value, 1)) return 'day';
  if (literal.upper === addMonths(literal.value, 1)) return 'month';
  if (literal.upper === addMonths(literal.value, 12)) return 'year';
  return null;
}

const shift = (window: Window, unit: Granularity, amount: number): Window => unit === 'day'
  ? { start: addDays(window.start, -amount), end: addDays(window.end, -amount) }
  : { start: addMonths(window.start, -amount), end: addMonths(window.end, -amount) };

// The current period is clipped to complete data; the comparison period is the same span moved back by one calendar
// unit, or by the distance to an explicitly named earlier period, so both sides always cover equal lengths.
export function changeWindows(current: Literal, previous: Literal | null, coverage: Coverage) {
  const unit = granularity(current);
  if (!unit || typeof current.value !== 'string' || !current.upper) throw new Error('Period change needs a calendar period');
  const start = current.value > coverage.start ? current.value : coverage.start, end = current.upper < coverage.end ? current.upper : coverage.end;
  if (start >= end) throw new Error('Current period is outside the complete-data window');
  let amount = unit === 'year' ? 12 : 1;
  if (previous) {
    if (granularity(previous) !== unit || typeof previous.value !== 'string') throw new Error('Compared periods must have the same granularity');
    amount = unit === 'day' ? daysBetween(previous.value, current.value) : monthsBetween(previous.value, current.value);
    if (amount <= 0) throw new Error('The comparison period must precede the current period');
  }
  const currentWindow = { start, end }, previousWindow = shift(currentWindow, unit, amount);
  if (previousWindow.start < coverage.start) throw new Error('Comparison period is outside the complete-data window');
  return { current: currentWindow, previous: previousWindow, unit };
}
