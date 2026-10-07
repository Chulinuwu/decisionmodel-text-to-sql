import type { AnomalyPlan, Expression, Predicate } from '../../shared/query-schema.js';
import { relativeLiteral } from '../compile/relative-periods.js';
import { anomalyRules, recordKeys } from '../compile/analysis-config.js';
import type { BuildContext, Combo, Measure, PlanParts } from './planning.types.js';
import { measureExpression, purchaseField } from './plan-parts.js';
import { anomalyDirections } from './catalog-config.js';
import { planningLimits } from './planning-limits.js';

const isDirection = (key: string | undefined): key is AnomalyPlan['direction'] => key !== undefined && key in anomalyDirections;

function unitAndMeasure(measure: Measure, realization: number, combo: Combo, parts: PlanParts): { unit: Expression; measure: Expression } | null {
  const [group, extra] = parts.groups;
  if (extra) return null;
  if (group) {
    const value = measureExpression(measure, realization, combo);
    return value && { unit: group, measure: value };
  }
  // Without a breakdown the units are individual records of the measure's own relation.
  if (measure.kind !== 'numeric') return null;
  const chosen = measure.realizations[realization], key = recordKeys[parts.resolver.root];
  if (!chosen || !key) return null;
  return { unit: { kind: 'column', field: { relation: parts.resolver.root, column: key } }, measure: { kind: 'column', field: chosen.field } };
}

// With no period in the question the population is the complete-data window, stated explicitly in the plan.
function population(ctx: BuildContext, parts: PlanParts, unit: Expression): Predicate[] {
  const predicates = [...parts.predicates];
  const kind = parts.relative ?? (predicates.some(predicate => predicate.operator === 'period') ? null : 'coverage');
  if (!kind) return predicates;
  const field = unit.kind === 'bucket' ? unit.field : purchaseField(ctx, parts.resolver);
  if (field) predicates.push({ field, operator: 'period', value: relativeLiteral(kind, ctx.schema.coverage) });
  return predicates;
}

export function buildAnomaly(ctx: BuildContext, measure: Measure, realization: number, combo: Combo, parts: PlanParts): AnomalyPlan | null {
  const shape = unitAndMeasure(measure, realization, combo, parts);
  if (!shape) return null;
  const predicates = population(ctx, parts, shape.unit);
  if (predicates.length > planningLimits.maxPredicates) return null;
  const direction = isDirection(combo.anomaly_direction) ? combo.anomaly_direction : 'both';
  return { kind: 'anomaly', from: parts.resolver.root, joins: [], where: { connector: 'and', predicates }, ...shape, direction, limit: parts.limitChosen ? parts.limit : anomalyRules.defaultLimit };
}
