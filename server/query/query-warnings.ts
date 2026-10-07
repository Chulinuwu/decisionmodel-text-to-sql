import type { Plan } from '../../shared/query-schema.js';
import { planExpressions } from '../schema-graph.js';
import { moneyColumns, statusScopedRelations, warningMessages } from './query-messages.js';

export function queryWarnings(plan: Plan, grain: string): string[] {
  const warnings = [warningMessages.probability, warningMessages.grain(grain)];
  const expressions = planExpressions(plan);
  if (expressions.some(expression => expression.field && moneyColumns.includes(expression.field.column))) warnings.push(warningMessages.money);
  if (statusScopedRelations.includes(plan.from) && !plan.where.predicates.some(predicate => predicate.field.column === 'order_status')) warnings.push(warningMessages.allStatuses);
  if (plan.kind === 'select' && plan.groupBy.length && plan.select.some(expression => expression.kind === 'aggregate' && expression.distinct)) warnings.push(warningMessages.distinctGroups);
  if (plan.kind === 'anomaly') warnings.push(warningMessages.anomaly);
  if (plan.kind === 'period_change') warnings.push(warningMessages.periodChange);
  return warnings;
}
