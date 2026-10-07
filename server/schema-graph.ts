import type { DatabaseSchema, Expression, Field, Plan, RelationName } from '../shared/query-schema.js';

export function fieldColumn(schema: DatabaseSchema, field: Field) {
  const column = schema.relations.find(relation => relation.name === field.relation)?.columns.find(column => column.name === field.column);
  if (!column) throw new Error('Unknown schema field');
  return column;
}

export function reachableRelations(schema: DatabaseSchema, root: RelationName) {
  const paths = new Map<RelationName, string[]>([[root, []]]);
  for (let level = 0; level < 3; level++) for (const edge of schema.edges) {
    const parent = paths.get(edge.from);
    if (parent && !paths.has(edge.to) && parent.length < 3) paths.set(edge.to, [...parent, edge.id]);
  }
  return paths;
}

export function planExpressions(plan: Plan): Expression[] {
  if (plan.kind === 'anomaly') return [plan.unit, plan.measure];
  if (plan.kind === 'period_change') return [plan.measure, ...plan.groupBy];
  return [...plan.select, ...plan.groupBy, ...(plan.orderBy ? [plan.orderBy.expression] : [])];
}

export function planFields(plan: Plan): Field[] {
  const fields = planExpressions(plan).flatMap(expression => expression.field ? [expression.field] : []);
  if (plan.kind === 'period_change') fields.push(plan.anchor);
  for (const predicate of plan.where.predicates) fields.push(predicate.field, ...('other' in predicate ? [predicate.other] : []));
  return fields;
}

export function requiredJoins(plan: Plan, schema: DatabaseSchema) {
  const paths = reachableRelations(schema, plan.from), edges = new Set<string>();
  for (const field of planFields(plan)) {
    fieldColumn(schema, field);
    const path = paths.get(field.relation);
    if (!path) throw new Error('No declared many-to-one join path. This query requires an unsupported grain or EXISTS strategy.');
    path.forEach(edge => edges.add(edge));
  }
  if (edges.size > 3) throw new Error('This query exceeds the three-join bound');
  return [...edges];
}
