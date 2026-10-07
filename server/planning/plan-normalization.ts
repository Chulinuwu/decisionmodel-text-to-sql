import type { Expression, Field, Plan, Predicate, SelectPlan } from '../../shared/query-schema.js';
import { expressionKey } from '../expression.js';
import { granularity } from '../compile/relative-periods.js';
import type { DateUnit } from './planning.types.js';
import { defaultRowLimits } from '../../shared/limits.js';

const unitRank: Record<DateUnit, number> = { day: 0, month: 1, year: 2 };
const sameField = (a: Field, b: Field) => a.relation === b.relation && a.column === b.column;
const periodUnit = (predicate: Predicate) => predicate.operator === 'period' && 'value' in predicate ? granularity(predicate.value) : null;

// A group whose value is fixed by a filter produces one constant row label and changes nothing.
function isConstantGroup(expression: Expression, predicates: Predicate[]) {
  if (expression.kind === 'bucket') return predicates.some(predicate => {
    const unit = sameField(predicate.field, expression.field) ? periodUnit(predicate) : null;
    return unit !== null && unitRank[expression.unit] >= unitRank[unit];
  });
  if (expression.kind === 'column') return predicates.filter(predicate => sameField(predicate.field, expression.field) && predicate.operator === 'eq' && 'value' in predicate).length === 1;
  return false;
}

// not_null is implied by any value comparison on the same field.
function isRedundant(predicate: Predicate, predicates: Predicate[]) {
  return predicate.operator === 'not_null' && predicates.some(other => other !== predicate && sameField(other.field, predicate.field) && other.operator !== 'is_null' && other.operator !== 'not_null');
}

function normalizeSelect(plan: SelectPlan, predicates: Predicate[]): SelectPlan {
  const removed = new Set(plan.groupBy.filter(expression => isConstantGroup(expression, predicates)).map(expressionKey));
  const groupBy = plan.groupBy.filter(expression => !removed.has(expressionKey(expression)));
  const select = plan.select.filter(expression => !removed.has(expressionKey(expression)));
  const orderBy = plan.orderBy && !removed.has(expressionKey(plan.orderBy.expression)) ? plan.orderBy : null;
  const where = { ...plan.where, predicates };
  if (select.some(expression => expression.kind === 'aggregate') && !groupBy.length) return { ...plan, select, where, groupBy, orderBy: null, limit: defaultRowLimits.select };
  return { ...plan, select, where, groupBy, orderBy };
}

// Removes every plan part that cannot change the result, so equivalent readings dedupe into one candidate.
export function normalizePlan(plan: Plan): Plan {
  const predicates = plan.where.predicates.filter(predicate => !isRedundant(predicate, plan.where.predicates));
  if (plan.kind === 'select') return normalizeSelect(plan, predicates);
  const where = { ...plan.where, predicates };
  if (plan.kind === 'period_change' && !plan.groupBy.length) return { ...plan, where, orderBy: null, limit: defaultRowLimits.period_change };
  return { ...plan, where };
}

// A multi-row result cut below the default without an ordering keeps an arbitrary subset ("top 1" alphabetically).
export function isArbitraryTruncation(plan: Plan) {
  if (plan.kind === 'anomaly') return false;
  if (plan.kind === 'period_change') return plan.groupBy.length > 0 && plan.limit < defaultRowLimits.period_change && plan.orderBy === null;
  const aggregate = plan.select.some(expression => expression.kind === 'aggregate');
  return (!aggregate || plan.groupBy.length > 0) && plan.limit < defaultRowLimits.select && plan.orderBy === null;
}
