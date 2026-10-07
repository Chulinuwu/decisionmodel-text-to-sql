import { defaultRowLimits } from '../../shared/limits.js';
import type { Expression, Field, Predicate, RelationName } from '../../shared/query-schema.js';
import type { BuildContext, Combo, Dimension, Measure, NumberUse, Operation, PlanParts, RelativeChoice, Resolver, ShapeSpace } from './planning.types.js';
import { resolverFor } from './field-resolution.js';
import { slotPredicates } from './slot-predicates.js';
import { operations, relativeChoices } from './catalog-config.js';
import { planningLimits } from './planning-limits.js';

const isOperation = (key: string | undefined): key is Operation => key !== undefined && key in operations;
const isRelative = (key: string | undefined): key is RelativeChoice => key !== undefined && key in relativeChoices;

function resolveLimit(space: ShapeSpace, key: string | undefined, uses: NumberUse[]) {
  const chosen = space.limits.get(key ?? 'default') ?? null;
  const fromSlots = [...new Set(uses.filter(use => use.use === 'limit').map(use => use.value))];
  if (fromSlots.length > 1) return null;
  const [slotLimit] = fromSlots;
  if (slotLimit !== undefined) {
    if (!Number.isInteger(slotLimit) || slotLimit < 1 || slotLimit > planningLimits.maxLimit) return null;
    return chosen === null || chosen === slotLimit ? slotLimit : null;
  }
  if (chosen === null) return null;
  const sameValue = uses.filter(use => use.value === chosen);
  return sameValue.length && sameValue.every(use => use.use === 'filter') ? undefined : chosen;
}

export function groupExpression(dimension: Dimension, resolver: Resolver): Expression | null {
  const field = resolver.field(dimension.fields);
  if (!field) return null;
  return dimension.unit ? { kind: 'bucket', field, unit: dimension.unit } : { kind: 'column', field };
}

export function measureExpression(measure: Measure, realization: number, combo: Combo): Expression | null {
  if (measure.kind === 'count') {
    const chosen = measure.realizations[realization];
    if (!chosen) return null;
    return chosen.field ? { kind: 'aggregate', fn: 'count', field: chosen.field, distinct: true } : { kind: 'aggregate', fn: 'count', field: null, distinct: false };
  }
  if (measure.kind === 'numeric') {
    const chosen = measure.realizations[realization], operation = combo.operation;
    if (!chosen || !isOperation(operation)) return null;
    return { kind: 'aggregate', fn: operations[operation].fn, field: chosen.field, distinct: false };
  }
  return null;
}

export const purchaseField = (ctx: BuildContext, resolver: Resolver): Field | null => resolver.field(ctx.catalog.anchors.find(anchor => anchor.id === 'purchase')?.fields ?? []);

// Builds everything a plan of any kind shares: root resolution, groups, filters, the declared condition and the limit.
export function planParts(ctx: BuildContext, root: RelationName, combo: Combo): PlanParts | null {
  const resolver = resolverFor(ctx.schema, root);
  const groups: Expression[] = [];
  for (const id of [combo.group1, combo.group2 === combo.group1 ? 'none' : combo.group2]) {
    if (!id || id === 'none') continue;
    const dimension = ctx.catalog.dimensions.find(entry => entry.id === id);
    const expression = dimension && groupExpression(dimension, resolver);
    if (!expression) return null;
    groups.push(expression);
  }
  const slots = slotPredicates(ctx, combo, resolver);
  if (!slots) return null;
  const predicates: Predicate[] = [...slots.predicates];
  const missing = ctx.space.missing.get(combo.missing ?? 'none') ?? null;
  if (missing) {
    const field = resolver.field(missing.anchor.fields);
    if (!field) return null;
    predicates.push({ field, operator: missing.operator });
  }
  const condition = ctx.space.conditions.get(combo.condition ?? 'none') ?? null;
  if (condition) {
    if (!resolver.reaches(condition.field) || !resolver.reaches(condition.other)) return null;
    predicates.push({ field: condition.field, operator: condition.operator, other: condition.other });
  }
  const limit = resolveLimit(ctx.space, combo.limit, slots.numberUses);
  if (limit === undefined) return null;
  const relative = isRelative(combo.relative_period) ? combo.relative_period : null;
  const limitStated = limit !== null && (combo.limit?.startsWith('n_') === true || slots.numberUses.some(use => use.use === 'limit'));
  return { resolver, groups, predicates, limit: limit ?? defaultRowLimits.select, limitStated, relative };
}
