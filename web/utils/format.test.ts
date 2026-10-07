import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterLabels, formatCell, probabilityLabel } from './format';
import { anomalyPlan, changePlan, monthlyPlan } from '../test/fixtures';

test('filter labels render period, membership and value-less null predicates', () => {
  assert.deepEqual(filterLabels(monthlyPlan), [
    'items.purchased_at อยู่ในช่วง 2017-01-01 ถึงก่อน 2018-01-01',
    'items.customer_state เป็นหนึ่งใน SP, RJ',
    'items.order_status มีค่า',
  ]);
});

test('probability label uses one decimal percent', () => {
  assert.equal(probabilityLabel(0.4567), '45.7%');
});

test('filter labels render column comparisons and relative periods', () => {
  assert.deepEqual(filterLabels(anomalyPlan), ['items.freight_value > items.price']);
  assert.deepEqual(filterLabels({ ...changePlan, where: { connector: 'and', predicates: [{ field: changePlan.anchor, operator: 'period', value: changePlan.current }] } }), ['items.purchased_at อยู่ในช่วง เดือนล่าสุดที่ข้อมูลครบ (2018-08-01 ถึงก่อน 2018-09-01)']);
});

test('analysis cells format score, percent change and booleans', () => {
  assert.equal(formatCell('5.12345', 'score'), '5.12');
  assert.equal(formatCell('-12.345', 'pct_change'), '-12.3%');
  assert.equal(formatCell(true, 'is_outlier'), 'ผิดปกติ');
  assert.equal(formatCell(false, 'is_outlier'), 'ปกติ');
  assert.equal(formatCell(true, 'other'), 'ใช่');
  assert.equal(formatCell(null, 'pct_change'), 'NULL');
});
