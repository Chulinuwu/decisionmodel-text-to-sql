import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isArbitraryTruncation, normalizePlan } from '../server/planning/plan-normalization.js';
import type { Expression, Literal, Plan, Predicate, SelectPlan } from '../shared/query-schema.js';

const field = { relation: 'orders' as const, column: 'purchased_at' };
const status = { relation: 'orders' as const, column: 'order_status' };
const count: Expression = { kind: 'aggregate', fn: 'count', field: null, distinct: false };
const bucket = (unit: 'day' | 'month' | 'year'): Expression => ({ kind: 'bucket', field, unit });
const period = (text: string): Predicate => ({ field, operator: 'period', value: { value: '2017-01-01', upper: '2018-01-01', source: 'question', text, start: 0, end: text.length } });
const delivered: Literal = { value: 'delivered', source: 'dataset', text: 'delivered', start: null, end: null };
const asSelect = (plan: Plan): SelectPlan => {
  if (plan.kind !== 'select') throw new Error('expected a select plan');
  return plan;
};
const plan = (overrides: Partial<SelectPlan>): SelectPlan => ({ kind: 'select', from: 'orders', select: [count], joins: [], where: { connector: 'and', predicates: [] }, groupBy: [], orderBy: null, limit: 100, ...overrides });

test('a date bucket at or above the filtered period granularity is constant and removed', () => {
  const grouped = plan({ select: [bucket('year'), count], groupBy: [bucket('year')], where: { connector: 'and', predicates: [period('2017')] }, orderBy: { expression: bucket('year'), direction: 'asc' }, limit: 1 });
  assert.deepEqual(asSelect(normalizePlan(grouped)), plan({ where: { connector: 'and', predicates: [period('2017')] } }));
  const monthly = plan({ select: [bucket('month'), count], groupBy: [bucket('month')], where: { connector: 'and', predicates: [period('2017')] } });
  assert.deepEqual(asSelect(normalizePlan(monthly)).groupBy, [bucket('month')]);
});

test('a categorical group pinned by a single eq filter is removed; IN keeps it', () => {
  const column: Expression = { kind: 'column', field: status };
  const pinned = plan({ select: [column, count], groupBy: [column], where: { connector: 'and', predicates: [{ field: status, operator: 'eq', value: delivered }] } });
  assert.deepEqual(asSelect(normalizePlan(pinned)).groupBy, []);
  const listed = plan({ select: [column, count], groupBy: [column], where: { connector: 'and', predicates: [{ field: status, operator: 'in', values: [delivered, { ...delivered, value: 'shipped', text: 'shipped' }] }] } });
  assert.deepEqual(asSelect(normalizePlan(listed)).groupBy, [column]);
});

test('not_null implied by another predicate on the same field is dropped; single-row sort and limit reset', () => {
  const result = asSelect(normalizePlan(plan({ where: { connector: 'and', predicates: [period('2017'), { field, operator: 'not_null' }] }, orderBy: { expression: count, direction: 'desc' }, limit: 1 })));
  assert.deepEqual([result.where.predicates.map(predicate => predicate.operator), result.orderBy, result.limit], [['period'], null, 100]);
  assert.deepEqual(asSelect(normalizePlan(plan({ where: { connector: 'and', predicates: [{ field, operator: 'not_null' }] } }))).where.predicates.length, 1);
});

test('multi-row results truncated without ordering are arbitrary', () => {
  const column: Expression = { kind: 'column', field: status };
  assert.equal(isArbitraryTruncation(plan({ select: [column, count], groupBy: [column], limit: 1 })), true);
  assert.equal(isArbitraryTruncation(plan({ select: [column, count], groupBy: [column], limit: 1, orderBy: { expression: count, direction: 'desc' } })), false);
  assert.equal(isArbitraryTruncation(plan({ select: [column], limit: 5 })), true);
  assert.equal(isArbitraryTruncation(plan({ limit: 1 })), false);
});
