import type { Coverage, Expression, Plan, Predicate, RelationName } from '../../shared/query-schema.js';
import { expressionKey, expressionLabel } from '../expression.js';
import { changeWindows, isRelativeKind, relativeWindow } from '../compile/relative-periods.js';
import { fieldLabel } from './semantic-catalog.js';
import { entityLabels } from './catalog-config.js';

function modelExpression(expression: Expression, from: RelationName) {
  if (expression.kind === 'aggregate' && !expression.field) return `${expressionLabel(expression)} (number of ${entityLabels[from].en})`;
  return expression.field ? `${expressionLabel(expression)} (${fieldLabel(expression.field).en})` : expressionLabel(expression);
}

function modelPredicate(predicate: Predicate, coverage: Coverage) {
  const field = `${predicate.field.relation}.${predicate.field.column} (${fieldLabel(predicate.field).en})`;
  if ('other' in predicate) return `${field} ${predicate.operator} ${predicate.other.relation}.${predicate.other.column} (${fieldLabel(predicate.other).en})`;
  if (predicate.operator === 'is_null' || predicate.operator === 'not_null') return `${field} ${predicate.operator === 'is_null' ? 'IS NULL' : 'IS NOT NULL'}`;
  if (predicate.operator === 'in' || predicate.operator === 'not_in') return `${field} ${predicate.operator === 'in' ? 'IN' : 'NOT IN'} (${predicate.values.map(literal => String(literal.value)).join(', ')})`;
  if (!('value' in predicate)) return field;
  if (predicate.operator === 'period') {
    const window = predicate.value.source === 'relative' && isRelativeKind(predicate.value.text) ? relativeWindow(predicate.value.text, coverage) : { start: String(predicate.value.value), end: predicate.value.upper ?? '' };
    return `${field} in ${predicate.value.text} [${window.start}, ${window.end})`;
  }
  return `${field} ${predicate.operator} ${JSON.stringify(predicate.value.value)}`;
}

const whereText = (plan: Plan, coverage: Coverage) => plan.where.predicates.length ? `where ${plan.where.predicates.map(predicate => modelPredicate(predicate, coverage)).join(` ${plan.where.connector.toUpperCase()} `)}` : '';

export function describePlanForModel(plan: Plan, coverage: Coverage) {
  if (plan.kind === 'anomaly') return [
    `find unusual ${plan.direction === 'both' ? 'high or low' : plan.direction} values of ${modelExpression(plan.measure, plan.from)} per ${modelExpression(plan.unit, plan.from)} compared with the median of all units`,
    whereText(plan, coverage), `rows ${plan.limit}`,
  ].filter(Boolean).join('; ');
  if (plan.kind === 'period_change') {
    let windows = `${plan.current.text} vs ${plan.previous?.text ?? 'previous period'}`;
    try {
      const resolved = changeWindows(plan.current, plan.previous, coverage);
      windows = `[${resolved.current.start}, ${resolved.current.end}) vs [${resolved.previous.start}, ${resolved.previous.end})`;
    } catch { /* the compiler rejects such a plan; the text still names the requested periods */ }
    return [
      `compare ${modelExpression(plan.measure, plan.from)} by ${plan.anchor.column} ${windows}`,
      plan.groupBy.length ? `per ${plan.groupBy.map(expression => modelExpression(expression, plan.from)).join(', ')}` : '',
      whereText(plan, coverage), plan.orderBy ? `sort ${plan.orderBy}` : '', plan.groupBy.length ? `rows ${plan.limit}` : '',
    ].filter(Boolean).join('; ');
  }
  const aggregate = plan.select.some(expression => expression.kind === 'aggregate');
  return [
    `${aggregate ? 'report' : `list ${entityLabels[plan.from].en}`}: ${plan.select.filter(expression => !plan.groupBy.some(group => expressionKey(group) === expressionKey(expression))).map(expression => modelExpression(expression, plan.from)).join(', ')}`,
    plan.groupBy.length ? `by ${plan.groupBy.map(expression => modelExpression(expression, plan.from)).join(', ')}` : '',
    whereText(plan, coverage),
    plan.orderBy ? `sort ${expressionLabel(plan.orderBy.expression)} ${plan.orderBy.direction}` : '',
    aggregate && !plan.groupBy.length ? '' : `rows ${plan.limit}`,
  ].filter(Boolean).join('; ');
}
