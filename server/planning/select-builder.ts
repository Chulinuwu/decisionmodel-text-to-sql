import type { Expression, Field, SelectPlan } from '../../shared/query-schema.js';
import { relativeLiteral } from '../compile/relative-periods.js';
import { fieldColumn } from '../schema-graph.js';
import type { BuildContext, Combo, ListMeasure, Measure, PlanParts } from './planning.types.js';
import { measureExpression, purchaseField } from './plan-parts.js';
import { planningLimits } from './planning-limits.js';

function detailSelection(ctx: BuildContext, measure: ListMeasure, combo: Combo, parts: PlanParts) {
  const detail = ctx.details.get(measure.id);
  const order = combo.order ?? 'none';
  let sort: Field | null = null;
  if (order !== 'none') {
    sort = detail?.sortFields.get(combo[detail.sortId] ?? 'none') ?? null;
    const isDate = sort !== null && ['timestamp', 'date'].includes(fieldColumn(ctx.schema, sort).type);
    if (order.startsWith('time') && !isDate) sort = purchaseField(ctx, parts.resolver);
    if (!sort) return null;
  }
  const keys = [...measure.keys, ...(sort ? [sort] : []), ...(detail?.columns ?? [])];
  const fields = [...new Map(keys.map(field => [`${field.relation}.${field.column}`, field])).values()].slice(0, planningLimits.maxSelect);
  return {
    select: fields.map((field): Expression => ({ kind: 'column', field })),
    orderBy: sort ? { expression: { kind: 'column' as const, field: sort }, direction: order.endsWith('desc') ? 'desc' as const : 'asc' as const } : null,
  };
}

export function buildSelect(ctx: BuildContext, measure: Measure, realization: number, combo: Combo, parts: PlanParts): SelectPlan | null {
  const { groups } = parts, root = parts.resolver.root;
  const predicates = [...parts.predicates];
  if (parts.relative) {
    const field = purchaseField(ctx, parts.resolver);
    if (!field) return null;
    predicates.push({ field, operator: 'period', value: relativeLiteral(parts.relative, ctx.schema.coverage) });
  }
  if (predicates.length > planningLimits.maxPredicates) return null;
  const where = { connector: 'and' as const, predicates };
  if (measure.kind === 'list') {
    if (groups.length) return null;
    const selection = detailSelection(ctx, measure, combo, parts);
    return selection && { kind: 'select', from: root, ...selection, joins: [], where, groupBy: [], limit: parts.limit };
  }
  const value = measureExpression(measure, realization, combo);
  if (!value) return null;
  const order = combo.order ?? 'none';
  let orderBy: SelectPlan['orderBy'] = null;
  if (order === 'value_desc' || order === 'value_asc') orderBy = { expression: value, direction: order === 'value_desc' ? 'desc' : 'asc' };
  if (order === 'time_desc' || order === 'time_asc') {
    const bucket = groups.find(expression => expression.kind === 'bucket');
    if (!bucket && groups.length) return null;
    orderBy = bucket ? { expression: bucket, direction: order === 'time_desc' ? 'desc' : 'asc' } : null;
  }
  return { kind: 'select', from: root, select: [...groups, value], joins: [], where, groupBy: groups, orderBy, limit: parts.limit };
}
