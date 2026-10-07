import type { DatabaseSchema, PeriodChangePlan } from '../../shared/query-schema.js';
import { expressionAlias, fieldSql } from '../expression.js';
import { validateLiteral } from '../literal-candidates.js';
import { fieldColumn } from '../schema-graph.js';
import type { Compiled } from './compile.types.js';
import { changeRules } from './analysis-config.js';
import { changeWindows } from './relative-periods.js';
import { grainOf, sqlBase } from './sql-base.js';

const orderSql = { change_desc: 'change DESC', change_asc: 'change ASC', pct_desc: 'pct_change DESC', pct_asc: 'pct_change ASC' };

export function compilePeriodChange(plan: PeriodChangePlan, schema: DatabaseSchema, question: string): Compiled {
  if (plan.measure.kind !== 'aggregate') throw new Error('Period change measure must be an aggregate');
  const [group] = plan.groupBy;
  if (group && group.kind !== 'column') throw new Error('Period change groups must be categorical columns');
  const anchor = fieldColumn(schema, plan.anchor);
  if (anchor.type !== 'timestamp' && anchor.type !== 'date') throw new Error('Period change anchor must be a date');
  for (const literal of [plan.current, ...(plan.previous ? [plan.previous] : [])]) validateLiteral(literal, question, anchor, schema.coverage);
  const windows = changeWindows(plan.current, plan.previous, schema.coverage);
  const base = sqlBase(plan, schema, question), value = base.render(plan.measure), anchorSql = fieldSql(plan.anchor);
  const groupSql = group ? base.render(group) : null;
  const period = (name: string, window: { start: string; end: string }) => [
    `${name} AS (SELECT ${groupSql ? `${groupSql} AS grp, ` : ''}(${value})::numeric AS value`, ...base.from,
    base.where([`${anchorSql} >= ${base.bind(window.start)}::timestamp`, `${anchorSql} < ${base.bind(window.end)}::timestamp`]),
    `${groupSql ? `GROUP BY ${groupSql}` : ''})`,
  ].filter(Boolean).join('\n');
  const combined = groupSql
    // A key union with NULL-safe left joins; PostgreSQL cannot FULL JOIN on IS NOT DISTINCT FROM, and NULL is a valid group.
    ? 'keys AS (SELECT grp FROM current_period UNION SELECT grp FROM previous_period),\ncombined AS (SELECT k.grp, c.value AS current_value, p.value AS previous_value FROM keys k LEFT JOIN current_period c ON c.grp IS NOT DISTINCT FROM k.grp LEFT JOIN previous_period p ON p.grp IS NOT DISTINCT FROM k.grp)'
    : 'combined AS (SELECT c.value AS current_value, p.value AS previous_value FROM current_period c CROSS JOIN previous_period p)';
  const pctOrder = plan.orderBy === 'pct_desc' || plan.orderBy === 'pct_asc';
  const ordering = [...(plan.orderBy ? [`${orderSql[plan.orderBy]} NULLS LAST`] : []), ...(groupSql ? ['grp ASC NULLS LAST'] : [])];
  const sql = [
    `WITH ${period('current_period', windows.current)},`,
    `${period('previous_period', windows.previous)},`,
    combined,
    `SELECT ${groupSql && group ? `grp AS "${expressionAlias(group)}", ` : ''}current_value, previous_value, current_value - previous_value AS change,`,
    '  CASE WHEN previous_value IS NULL OR previous_value = 0 THEN NULL ELSE (current_value - previous_value) / previous_value * 100 END AS pct_change',
    'FROM combined',
    pctOrder && groupSql ? `WHERE previous_value >= ${changeRules.tinyBaseShare} * (SELECT max(previous_value) FROM combined)` : '',
    ordering.length ? `ORDER BY ${ordering.join(', ')}` : '',
    `LIMIT ${base.bind(plan.limit + 1)}`,
  ].filter(Boolean).join('\n');
  return { sql, values: base.values, grain: grainOf(plan, schema), emptyResult: null };
}
