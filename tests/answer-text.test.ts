import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answerText } from '../server/query/answer-text.js';
import type { AnomalyPlan, Expression, PeriodChangePlan, SelectPlan } from '../shared/query-schema.js';

const price: Expression = { kind: 'aggregate', fn: 'sum', field: { relation: 'items', column: 'price' }, distinct: false };
const state: Expression = { kind: 'column', field: { relation: 'items', column: 'seller_state' } };
const where = { connector: 'and' as const, predicates: [] };
const select = (overrides: Partial<SelectPlan>): SelectPlan => ({ kind: 'select', from: 'items', select: [price], joins: [], where, groupBy: [], orderBy: null, limit: 100, ...overrides });
const anomaly: AnomalyPlan = { kind: 'anomaly', from: 'items', joins: [], where, unit: { kind: 'column', field: { relation: 'items', column: 'seller_state' } }, measure: price, direction: 'both', limit: 20 };
const change = (groupBy: Expression[]): PeriodChangePlan => ({ kind: 'period_change', from: 'items', joins: [], where, measure: price, anchor: { relation: 'items', column: 'purchased_at' },
  current: { value: '2018-08-01', upper: '2018-09-01', source: 'relative', text: 'latest_month', start: null, end: null }, previous: null, groupBy, orderBy: groupBy.length ? 'pct_desc' : null, limit: 100 });

test('select answers state a single value, rank grouped rows and never total truncated rows', () => {
  assert.equal(answerText(select({}), [], false), 'ไม่พบข้อมูลที่ตรงกับคำถามนี้');
  const single = answerText(select({}), [{ sum_items_price: '1234.5' }], false);
  assert.match(single, /1,234\.5$/);
  const grouped = select({ select: [state, price], groupBy: [state], orderBy: { expression: price, direction: 'desc' } });
  const rows = [{ items_seller_state: 'SP', sum_items_price: '900' }, { items_seller_state: 'RJ', sum_items_price: '100' }];
  assert.match(answerText(grouped, rows, false), /^พบ 2 แถว อันดับแรกคือ .*SP, .*900$/);
  assert.match(answerText(grouped, rows, true), /^แสดง 2 แถวแรก ยังมีแถวอื่นที่ไม่ได้แสดง/);
  assert.match(answerText({ ...grouped, limit: 2 }, rows, true), /^แสดง 2 อันดับตามที่ขอ/);
  assert.ok(!answerText(grouped, rows, true).includes('1,000'));
});

test('anomaly answers count outliers, name the top one and hedge when every shown row is an outlier', () => {
  const rows = [
    { items_seller_state: 'SP', value: '900.5', baseline: '100', score: '5.1234', is_outlier: true },
    { items_seller_state: 'RJ', value: '120', baseline: '100', score: '0.4', is_outlier: false },
  ];
  const text = answerText(anomaly, rows, false);
  assert.match(text, / 1 รายการ ผิดปกติมากที่สุดคือ SP \(.*900\.5 เทียบค่ามัธยฐาน 100, score 5\.12\)$/);
  assert.ok(!text.includes('อย่างน้อย'));
  assert.match(answerText(anomaly, [rows[0]], true), /อย่างน้อย 1 รายการ/);
  assert.equal(answerText(anomaly, [rows[1]], false), 'ไม่พบค่าผิดปกติตามเกณฑ์ modified z-score 3.5 ใน 1 หน่วยที่แสดง');
});

test('period change answers compare current with previous and explain a missing percentage', () => {
  const total = answerText(change([]), [{ current_value: '200', previous_value: '100', change: '100', pct_change: '100' }], false);
  assert.match(total, /ช่วงปัจจุบัน 200 เทียบกับช่วงก่อนหน้า 100 เปลี่ยนแปลง \+100\.0%$/);
  assert.match(answerText(change([]), [{ current_value: '200', previous_value: '0', change: '200', pct_change: null }], false), /คำนวณร้อยละไม่ได้/);
  const grouped = answerText(change([state]), [{ items_seller_state: 'SP', current_value: '50', previous_value: '100', change: '-50', pct_change: '-50' }], false);
  assert.match(grouped, /^พบ 1 แถว อันดับแรกคือ .*SP: .*เปลี่ยนแปลง -50\.0%$/);
});

test('one-sided anomaly results that were cut off never claim an exact or zero outlier count', () => {
  const high: AnomalyPlan = { ...anomaly, direction: 'high' };
  const shown = [
    { items_seller_state: 'RJ', value: '1', baseline: '100', score: '-6', is_outlier: false },
    { items_seller_state: 'SP', value: '900', baseline: '100', score: '5', is_outlier: true },
  ];
  assert.match(answerText(high, shown, true), /อย่างน้อย 1 รายการ/);
  assert.equal(answerText(high, [shown[0]], true), 'ไม่พบค่าผิดปกติใน 1 หน่วยที่แสดง แต่หน่วยที่ไม่ได้แสดงอาจมีค่าผิดปกติ');
  assert.ok(!answerText(high, shown, false).includes('อย่างน้อย'));
});

test('an unordered explicit cap says rows, not ranks, and booleans read in Thai', () => {
  const rows = [{ items_seller_state: 'SP' }, { items_seller_state: 'RJ' }];
  assert.match(answerText(select({ select: [state], limit: 2 }), rows, true), /^แสดง 2 แถวตามที่ขอ แถวแรกคือ /);
  assert.match(answerText(select({ select: [state] }), [{ items_seller_state: true }], false), / ใช่$/);
});
