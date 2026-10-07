import type { DatabaseSchema, SelectPlan } from '../../shared/query-schema.js';
import { expressionAlias, expressionKey } from '../expression.js';
import type { Compiled } from './compile.types.js';
import { grainOf, sqlBase } from './sql-base.js';

export function compileSelect(plan: SelectPlan, schema: DatabaseSchema, question: string): Compiled {
  if (new Set(plan.select.map(expressionKey)).size !== plan.select.length) throw new Error('Duplicate projections');
  const aggregates = plan.select.some(expression => expression.kind === 'aggregate');
  if (plan.groupBy.some(expression => expression.kind === 'aggregate')) throw new Error('Cannot group by aggregate');
  if (!aggregates && plan.groupBy.length) throw new Error('Grouping requires an aggregate projection');
  const groupKeys = plan.groupBy.map(expressionKey);
  if (aggregates && plan.select.some(expression => expression.kind !== 'aggregate' && !groupKeys.includes(expressionKey(expression)))) throw new Error('Every non-aggregate projection must be grouped');
  if (plan.groupBy.some(expression => !plan.select.some(selected => expressionKey(selected) === expressionKey(expression)))) throw new Error('Grouping must be visible in the projection');
  if (aggregates && plan.orderBy && plan.orderBy.expression.kind !== 'aggregate' && !groupKeys.includes(expressionKey(plan.orderBy.expression))) throw new Error('Aggregate query cannot order by an ungrouped field');
  const base = sqlBase(plan, schema, question), { render } = base;
  const selections = plan.select.map(expression => `${render(expression)} AS "${expressionAlias(expression)}"`);
  const ordering = [...(plan.orderBy ? [`${render(plan.orderBy.expression)} ${plan.orderBy.direction.toUpperCase()} NULLS LAST`] : []), ...plan.select.filter(expression => expression.kind !== 'aggregate').map(expression => `${render(expression)} ASC NULLS LAST`)];
  const sql = [`SELECT ${selections.join(',\n       ')}`, ...base.from, base.where(), plan.groupBy.length ? `GROUP BY ${plan.groupBy.map(render).join(', ')}` : '', ordering.length ? `ORDER BY ${[...new Set(ordering)].join(', ')}` : '', `LIMIT ${base.bind(plan.limit + 1)}`].filter(Boolean).join('\n');
  return { sql, values: base.values, grain: grainOf(plan, schema), emptyResult: null };
}
