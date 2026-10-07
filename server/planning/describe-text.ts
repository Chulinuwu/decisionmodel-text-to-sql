import type { Coverage, DatabaseSchema, Expression, Field, Literal, Predicate, RelationName } from '../../shared/query-schema.js';
import { granularity, isRelativeKind, relativeWindow } from '../compile/relative-periods.js';
import { fieldLabel } from './semantic-catalog.js';
import { conditions, dateUnits, entityLabels } from './catalog-config.js';
import { aggregateSuffix, analysisText, operatorText } from './planning-messages.js';

export const isDateField = (schema: DatabaseSchema, field: Field) => {
  const type = schema.relations.find(relation => relation.name === field.relation)?.columns.find(column => column.name === field.column)?.type;
  return type === 'timestamp' || type === 'date';
};

export function expressionText(expression: Expression, from: RelationName) {
  if (expression.kind === 'column') return fieldLabel(expression.field).th;
  if (expression.kind === 'bucket') return `${dateUnits[expression.unit].th}ของ${fieldLabel(expression.field).th}`;
  if (!expression.field) return `จำนวน${entityLabels[from].th}`;
  if (expression.fn === 'count') return `จำนวน${fieldLabel(expression.field).th}${expression.distinct ? '' : 'ที่มีค่า'}`;
  return `${fieldLabel(expression.field).th}${aggregateSuffix[expression.fn]}`;
}

export function periodText(literal: Literal, coverage: Coverage) {
  if (literal.source === 'relative' && isRelativeKind(literal.text)) {
    const window = relativeWindow(literal.text, coverage);
    return `${analysisText.relative[literal.text]} (${analysisText.window(window.start, window.end)})`;
  }
  const unit = granularity(literal);
  return unit ? `${dateUnits[unit].th} ${literal.text}` : literal.text;
}

export function conditionText(predicate: Extract<Predicate, { other: Field }>) {
  for (const entry of conditions) {
    if (entry.field !== `${predicate.field.relation}.${predicate.field.column}` || entry.other !== `${predicate.other.relation}.${predicate.other.column}`) continue;
    if (entry.operator === predicate.operator) return entry.th;
    if (entry.negated.operator === predicate.operator) return entry.negated.th;
  }
  return `${fieldLabel(predicate.field).th} ${operatorText[predicate.operator]} ${fieldLabel(predicate.other).th}`;
}

export function predicateText(predicate: Predicate, coverage: Coverage) {
  const label = fieldLabel(predicate.field).th;
  if ('other' in predicate) return conditionText(predicate);
  if (predicate.operator === 'is_null') return `ไม่มี${label}`;
  if (predicate.operator === 'not_null') return `มี${label}`;
  if (predicate.operator === 'in' || predicate.operator === 'not_in') return `${label}${operatorText[predicate.operator]} ${predicate.values.map(literal => String(literal.value)).join(' หรือ ')}`;
  if (!('value' in predicate)) return label;
  if (predicate.operator === 'period') return `${label}ใน${periodText(predicate.value, coverage)}`;
  if (predicate.operator === 'contains') return `${label}มีคำว่า "${predicate.value.value}"`;
  return `${label}${operatorText[predicate.operator]} ${predicate.value.value}`;
}

export const filtersText = (predicates: Predicate[], connector: 'and' | 'or', coverage: Coverage) => predicates.map(predicate => predicateText(predicate, coverage)).join(connector === 'and' ? ' และ ' : ' หรือ ');
