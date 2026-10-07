import type { Column, DatabaseSchema, Literal, Predicate } from '../shared/query-schema.js';
import { fieldSql } from './expression.js';
import { fieldColumn } from './schema-graph.js';
import { validateLiteral } from './literal-candidates.js';

const comparisonSql = { eq: '=', ne: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' };
const typeClass = (column: Column) => column.type === 'timestamp' || column.type === 'date' ? 'date' : column.type;

function checkLiteralType(literal: Literal, column: Column) {
  if (column.type === 'number' && typeof literal.value !== 'number') throw new Error('Numeric filter requires a numeric literal');
  if (column.type !== 'number' && typeof literal.value !== 'string') throw new Error('Text/date filter requires a string literal');
}

export function predicateSql(predicate: Predicate, question: string, schema: DatabaseSchema, bind: (value: string | number) => string) {
  const column = fieldColumn(schema, predicate.field), sql = fieldSql(predicate.field);
  if (predicate.operator === 'is_null' || predicate.operator === 'not_null') return `${sql} IS ${predicate.operator === 'not_null' ? 'NOT ' : ''}NULL`;
  if ('other' in predicate) {
    const other = fieldColumn(schema, predicate.other);
    if (typeClass(column) !== typeClass(other) || typeClass(column) === 'text') throw new Error('Column comparisons need two numeric or two date fields');
    return `${sql} ${comparisonSql[predicate.operator]} ${fieldSql(predicate.other)}`;
  }
  if (predicate.operator === 'in' || predicate.operator === 'not_in') {
    if (column.type !== 'text' && column.type !== 'number') throw new Error('IN lists require text or numeric fields');
    for (const literal of predicate.values) {
      validateLiteral(literal, question, column, schema.coverage);
      checkLiteralType(literal, column);
    }
    return `${sql} ${predicate.operator === 'not_in' ? 'NOT ' : ''}IN (${predicate.values.map(literal => bind(literal.value)).join(', ')})`;
  }
  if (!('value' in predicate)) throw new Error('Filter value is missing');
  const { value } = predicate;
  validateLiteral(value, question, column, schema.coverage);
  if (predicate.operator === 'period') {
    if (!['timestamp', 'date'].includes(column.type) || typeof value.value !== 'string' || !value.upper) throw new Error('Period predicate requires a grounded date interval');
    return `(${sql} >= ${bind(value.value)}::timestamp AND ${sql} < ${bind(value.upper)}::timestamp)`;
  }
  checkLiteralType(value, column);
  if (['timestamp', 'date'].includes(column.type) && (value.source !== 'question' || !/^20\d{2}-\d{2}-\d{2}$/.test(value.text))) throw new Error('Date comparisons require an explicit ISO day. Use calendar-period filters for year/month.');
  if (predicate.operator === 'contains') {
    if (column.type !== 'text') throw new Error('Contains requires text');
    return `${sql} ILIKE ${bind('%' + String(value.value).replace(/[\\%_]/g, '\\$&') + '%')} ESCAPE '\\'`;
  }
  return `${sql} ${comparisonSql[predicate.operator]} ${bind(value.value)}`;
}
