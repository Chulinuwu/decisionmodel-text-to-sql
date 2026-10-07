import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { FieldDef, QueryResult } from 'pg';
import { compareToGold } from '../scripts/gold-compare.js';
import type { QueryResponse } from '../shared/schema.js';

const fieldDef = (name: string, dataTypeID: number): FieldDef => ({ name, dataTypeID, tableID: 0, columnID: 0, dataTypeSize: -1, dataTypeModifier: -1, format: 'text' });
const gold = (fields: FieldDef[], rows: Record<string, unknown>[]): QueryResult => ({ command: 'SELECT', rowCount: rows.length, oid: 0, fields, rows });
const answered = (columns: string[], rows: Record<string, string | number | null>[]): Extract<QueryResponse, { status: 'ok' }> => ({
  status: 'ok', question: 'q', plan: { kind: 'select', from: 'orders', select: [{ kind: 'aggregate', fn: 'count', field: null, distinct: false }], joins: [], where: { connector: 'and', predicates: [] }, groupBy: [], orderBy: null, limit: 100 },
  interpretation: { id: 'r_0', plan: { kind: 'select', from: 'orders', select: [{ kind: 'aggregate', fn: 'count', field: null, distinct: false }], joins: [], where: { connector: 'and', predicates: [] }, groupBy: [], orderBy: null, limit: 100 }, summary: '', parts: [], probability: null },
  alternatives: [], offerId: null, sql: '', parameters: [], columns, rows, truncated: false, trace: [], usage: { input_tokens: 0, output_tokens: 0, cost: 0 }, model: '', provider: '', elapsedMs: 0, warnings: [],
});

test('columns are matched by values regardless of names and order, with dates normalized', () => {
  const expected = gold([fieldDef('date_trunc', 1082), fieldDef('sum', 1700)], [{ date_trunc: '2017-11-01', sum: '1010271.37' }, { date_trunc: '2017-12-01', sum: '743914.17' }]);
  const response = answered(['total_sales', 'purchase_month'], [{ total_sales: '743914.170', purchase_month: '2017-12-01 00:00:00' }, { total_sales: '1010271.37', purchase_month: '2017-11-01' }]);
  const result = compareToGold(response, expected, false);
  assert.equal(result.correct, true);
  assert.deepEqual(result.mapping, ['purchase_month', 'total_sales']);
  assert.equal(compareToGold(response, expected, true).correct, false);
});

test('extra columns or different values do not match', () => {
  const expected = gold([fieldDef('count', 20)], [{ count: '99441' }]);
  assert.equal(compareToGold(answered(['a', 'b'], [{ a: 99441, b: 1 }]), expected, false).correct, false);
  assert.equal(compareToGold(answered(['a'], [{ a: 99440 }]), expected, false).correct, false);
  assert.equal(compareToGold(answered(['a'], [{ a: '99441' }]), expected, false).correct, true);
});
