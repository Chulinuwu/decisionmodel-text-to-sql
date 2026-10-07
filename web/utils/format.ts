import type { Literal, Plan, Predicate } from '../../shared/query-schema';
import { numberLocale, operatorLabels } from '../config/labels';

const literalLabel = (literal: Literal) => `${literal.value}${literal.upper ? ` ถึงก่อน ${literal.upper}` : ''}`;

function predicateLabel(predicate: Predicate): string {
  const head = `${predicate.field.relation}.${predicate.field.column} ${operatorLabels[predicate.operator]}`;
  if ('values' in predicate) return `${head} ${predicate.values.map(literalLabel).join(', ')}`;
  return 'value' in predicate ? `${head} ${literalLabel(predicate.value)}` : head;
}

export const filterLabels = (plan: Plan): string[] => plan.where.predicates.map(predicateLabel);

export const probabilityLabel = (probability: number) => `${(probability * 100).toFixed(1)}%`;

export function formatCell(value: string | number | null): string {
  if (value === null) return 'NULL';
  return typeof value === 'number' ? value.toLocaleString(numberLocale, { maximumFractionDigits: 6 }) : value;
}

export function numericValue(value: string | number | null): number | null {
  if (value === null || (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
