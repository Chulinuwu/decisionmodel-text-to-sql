import type { Field, Literal, PeriodChangePlan } from '../../shared/query-schema.js';
import { relativeLiteral } from '../compile/relative-periods.js';
import type { BuildContext, ChangeOrder, Combo, Measure, PlanParts } from './planning.types.js';
import { measureExpression, purchaseField } from './plan-parts.js';
import { changeOrders } from './catalog-config.js';
import { planningLimits } from './planning-limits.js';

const isChangeOrder = (key: string | undefined): key is ChangeOrder => key !== undefined && key in changeOrders;

// Period slots become the compared periods rather than filters: one names the current period, two name both.
function periods(ctx: BuildContext, parts: PlanParts) {
  const named = parts.predicates.flatMap(predicate => predicate.operator === 'period' && 'value' in predicate ? [{ field: predicate.field, value: predicate.value }] : []);
  const rest = parts.predicates.filter(predicate => predicate.operator !== 'period');
  if (named.length > 2 || (named.length && parts.relative)) return null;
  const [first, second] = [...named].sort((a, b) => String(b.value.value).localeCompare(String(a.value.value)));
  if (first && second && (first.field.relation !== second.field.relation || first.field.column !== second.field.column)) return null;
  if (first) return { anchor: first.field, current: first.value, previous: second?.value ?? null, rest };
  const anchor: Field | null = purchaseField(ctx, parts.resolver);
  if (!anchor) return null;
  const current: Literal = relativeLiteral(parts.relative ?? 'latest_month', ctx.schema.coverage);
  return { anchor, current, previous: null, rest };
}

export function buildPeriodChange(ctx: BuildContext, measure: Measure, realization: number, combo: Combo, parts: PlanParts): PeriodChangePlan | null {
  const [group, extra] = parts.groups;
  if (extra || (group && group.kind !== 'column')) return null;
  const value = measureExpression(measure, realization, combo), chosen = periods(ctx, parts);
  if (!value || !chosen || chosen.rest.length > planningLimits.maxPredicates) return null;
  const orderBy = isChangeOrder(combo.change_order) ? combo.change_order : null;
  return { kind: 'period_change', from: parts.resolver.root, joins: [], where: { connector: 'and', predicates: chosen.rest }, measure: value, anchor: chosen.anchor, current: chosen.current, previous: chosen.previous, groupBy: group ? [group] : [], orderBy, limit: parts.limit };
}
