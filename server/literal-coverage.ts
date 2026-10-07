import type { DatabaseSchema, Plan } from '../shared/query-schema.js';

export const quotedPattern = /(["'`])([\s\S]*?)\1/g;
type Range = { start: number; end: number };

// Upper-case codes (state abbreviations) match case-sensitively; otherwise English words such as "to" or "am" would count as the TO/AM states.
export function enumValueSpans(question: string, value: string): Range[] {
  const pattern = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const flags = value === value.toLocaleUpperCase() && /\p{Lu}/u.test(value) ? 'gu' : 'giu';
  return [...question.matchAll(new RegExp(`(?<![\\p{L}\\p{N}_])${pattern}(?![\\p{L}\\p{N}_])`, flags))].map(match => ({ start: match.index, end: match.index + match[0].length }));
}

// Every relation is scanned, not only those reachable from the plan root: a mentioned value the plan cannot reach is
// still unanswered. Spans the decision model confidently marked as not a filter are waived.
export function validateLiteralCoverage(question: string, plan: Plan, schema: DatabaseSchema, waived: Range[] = []) {
  const values = new Map<string, Set<string>>();
  const add = (value: string, span: Range) => {
    if (waived.some(range => range.start < span.end && span.start < range.end)) return;
    const key = value.toLocaleLowerCase(), spans = values.get(key) ?? new Set<string>();
    spans.add(`${span.start}:${span.end}`); values.set(key, spans);
  };
  for (const relation of schema.relations) for (const column of relation.columns) for (const value of column.values) {
    for (const span of enumValueSpans(question, value)) add(value, span);
  }
  for (const match of question.matchAll(quotedPattern)) add(match[2], { start: match.index + 1, end: match.index + 1 + match[2].length });
  const consumed = plan.where.predicates.flatMap(predicate => {
    const literals = 'values' in predicate ? predicate.values : 'value' in predicate ? [predicate.value] : [];
    return literals.flatMap(literal => typeof literal.value === 'string' ? [literal.value.toLocaleLowerCase()] : []);
  });
  return [...values].filter(([value, spans]) => consumed.filter(literal => literal === value).length < spans.size).map(([value]) => value);
}
