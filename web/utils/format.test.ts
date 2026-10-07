import assert from 'node:assert/strict';
import { test } from 'node:test';
import { filterLabels, probabilityLabel } from './format';
import { monthlyPlan } from '../test/fixtures';

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
