import type { Literal, Plan, Predicate, RelativePeriodKind } from '../../shared/query-schema';
import type { ResultCell } from '../../shared/schema';
import { anomalyColumns, booleanLabels, changeColumns, numberLocale, pctDecimals, scoreDecimals } from '../../shared/result-config';
import { numericValue } from '../../shared/result-cells';
import { operatorLabels, relativePeriodLabels } from '../config/labels';

// A value import from shared/query-schema would pull zod into the browser bundle, so the kind check uses the label map.
const isRelativeKind = (text: string): text is RelativePeriodKind => Object.hasOwn(relativePeriodLabels, text);

function literalLabel(literal: Literal) {
  const range = `${literal.value}${literal.upper ? ` ถึงก่อน ${literal.upper}` : ''}`;
  return literal.source === 'relative' && isRelativeKind(literal.text) ? `${relativePeriodLabels[literal.text]} (${range})` : range;
}

function predicateLabel(predicate: Predicate): string {
  const head = `${predicate.field.relation}.${predicate.field.column} ${operatorLabels[predicate.operator]}`;
  if ('values' in predicate) return `${head} ${predicate.values.map(literalLabel).join(', ')}`;
  if ('other' in predicate) return `${head} ${predicate.other.relation}.${predicate.other.column}`;
  return 'value' in predicate ? `${head} ${literalLabel(predicate.value)}` : head;
}

export const filterLabels = (plan: Plan): string[] => plan.where.predicates.map(predicateLabel);

export const probabilityLabel = (probability: number) => `${(probability * 100).toFixed(1)}%`;

export function formatCell(value: ResultCell, column = ''): string {
  if (value === null) return 'NULL';
  if (typeof value === 'boolean') return (column === anomalyColumns.outlier ? booleanLabels.outlier : booleanLabels.generic)[value ? 'true' : 'false'];
  const number = numericValue(value);
  if (number !== null && column === anomalyColumns.score) return number.toFixed(scoreDecimals);
  if (number !== null && column === changeColumns.pct) return `${number.toLocaleString(numberLocale, { minimumFractionDigits: pctDecimals, maximumFractionDigits: pctDecimals })}%`;
  return typeof value === 'number' ? value.toLocaleString(numberLocale, { maximumFractionDigits: 6 }) : value;
}
