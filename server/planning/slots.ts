import type { Column, DatabaseSchema } from '../../shared/query-schema.js';
import { literalCandidates } from '../literal-candidates.js';
import { enumValueSpans, quotedPattern } from '../literal-coverage.js';
import { fieldColumn } from '../schema-graph.js';
import type { Catalog, Dimension, Slot, Span } from './planning.types.js';
import { planningLimits } from './planning-limits.js';

// A bare 4-digit token such as 2017 or 2500 becomes both a period and a number slot; the decision binds one use.
const overlaps = (a: { start: number; end: number }, b: { start: number; end: number }) => a.start < b.end && b.start < a.end;

function questionSpans(question: string, column: Column | undefined) {
  if (!column) return [];
  return literalCandidates(question, column).flatMap(literal => literal.source === 'question' && literal.start !== null && literal.end !== null ? [{ literal, span: { text: literal.text, start: literal.start, end: literal.end } }] : []);
}

export function extractSlots(question: string, schema: DatabaseSchema, catalog: Catalog): Slot[] {
  const columns = schema.relations.flatMap(relation => relation.columns);
  const dated = questionSpans(question, columns.find(column => column.type === 'timestamp' || column.type === 'date')).map(({ span }) => span);
  // A year inside a named month ("Nov 2017") is part of that month, not a second period.
  const periods = dated.filter(span => !dated.some(other => other !== span && other.start <= span.start && other.end >= span.end && other.end - other.start > span.end - span.start)).map((span): Slot => ({ kind: 'period', ...span }));
  const numbers = questionSpans(question, columns.find(column => column.type === 'number')).flatMap(({ literal, span }): Slot[] => typeof literal.value === 'number' && !periods.some(period => overlaps(period, span) && period.text !== span.text) ? [{ kind: 'number', value: literal.value, ...span }] : []);
  const quoted = [...question.matchAll(quotedPattern)].flatMap((match): Slot[] => match[2] ? [{ kind: 'quoted', value: match[2], text: match[2], start: match.index + 1, end: match.index + 1 + match[2].length }] : []);
  const enums = new Map<string, Span & { value: string; dimensions: Set<Dimension> }>();
  for (const dimension of catalog.dimensions.filter(dimension => dimension.unit === null)) for (const field of dimension.fields) for (const value of fieldColumn(schema, field).values) {
    for (const span of enumValueSpans(question, value)) {
      if (quoted.some(slot => overlaps(slot, span))) continue;
      const key = `${span.start}:${span.end}:${value}`, entry = enums.get(key) ?? { value, text: question.slice(span.start, span.end), ...span, dimensions: new Set<Dimension>() };
      entry.dimensions.add(dimension);
      enums.set(key, entry);
    }
  }
  const enumSlots = [...enums.values()].map((entry): Slot => ({ kind: 'enum', value: entry.value, text: entry.text, start: entry.start, end: entry.end, dimensions: [...entry.dimensions] }));
  return [...periods, ...numbers, ...quoted, ...enumSlots].sort((a, b) => a.start - b.start).slice(0, planningLimits.maxSlots);
}
