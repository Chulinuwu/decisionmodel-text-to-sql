import type { DatabaseSchema, Expression, Field, RelationName } from '../shared/query-schema.js';
import { fieldColumn } from './schema-graph.js';

export const expressionKey = (expression: Expression) => JSON.stringify(expression);
export const fieldSql = (field: Field) => `"${field.relation}"."${field.column}"`;
export function expressionLabel(expression: Expression) {
  if (expression.kind === 'column') return `${expression.field.relation}.${expression.field.column}`;
  if (expression.kind === 'bucket') return `${expression.unit}(${expression.field.relation}.${expression.field.column})`;
  return `${expression.fn.toUpperCase()}(${expression.distinct ? 'DISTINCT ' : ''}${expression.field ? `${expression.field.relation}.${expression.field.column}` : '*'})`;
}

export function expressionAlias(expression: Expression) {
  if (expression.kind === 'column') return `${expression.field.relation}_${expression.field.column}`;
  if (expression.kind === 'bucket') return `${expression.unit}_${expression.field.relation}_${expression.field.column}`;
  return `${expression.fn}_${expression.distinct ? 'distinct_' : ''}${expression.field ? `${expression.field.relation}_${expression.field.column}` : 'rows'}`;
}

export function expressionSql(expression: Expression, root: RelationName, schema: DatabaseSchema) {
  if (!expression.field) {
    if (expression.kind !== 'aggregate' || expression.fn !== 'count' || expression.distinct) throw new Error('Only COUNT(*) may omit a field');
    return 'count(*)';
  }
  const column = fieldColumn(schema, expression.field), sql = fieldSql(expression.field);
  if (expression.kind === 'column') return sql;
  if (expression.kind === 'bucket') {
    if (column.type !== 'timestamp' && column.type !== 'date') throw new Error('Time bucket needs a date column');
    return `date_trunc('${expression.unit}', ${sql})::date`;
  }
  if ((expression.fn === 'sum' || expression.fn === 'avg') && column.type !== 'number') throw new Error('SUM/AVG needs numeric data');
  if (expression.field.relation !== root && ['sum', 'avg'].includes(expression.fn)) throw new Error('Aggregating a parent measure from child grain would duplicate values. Choose the parent relation or ask a separate query.');
  if (expression.distinct && expression.fn !== 'count') throw new Error('Only COUNT DISTINCT is supported');
  if (expression.fn === 'count' && !expression.distinct && expression.field.relation !== root) throw new Error('Counting a parent field from child grain repeats it per child row; use COUNT DISTINCT.');
  return `${expression.fn}(${expression.distinct ? 'DISTINCT ' : ''}${sql})`;
}
