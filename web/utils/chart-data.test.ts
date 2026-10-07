import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resultChartData } from './chart-data';
import { anomalyColumns, anomalyPlan, anomalyRows, answered, changePlan, monthlyPlan } from '../test/fixtures';

test('select chart uses the aggregate column per group', () => {
  const chart = resultChartData(answered({ ...monthlyPlan, limit: 100 }, ['month_items_purchased_at', 'sum_items_price'], [{ month_items_purchased_at: '2017-01-01', sum_items_price: '10' }, { month_items_purchased_at: '2017-02-01', sum_items_price: '20' }]));
  assert.deepEqual(chart?.points.map(point => point.value), [10, 20]);
});

test('anomaly chart plots value per unit and marks outliers', () => {
  const chart = resultChartData(answered(anomalyPlan, anomalyColumns, anomalyRows(true)));
  assert.deepEqual(chart?.points.map(point => [point.label, point.value, point.highlight]), [['SP', 900.5, true], ['RJ', 120, false]]);
});

test('period change chart pairs current with previous per group and tolerates a missing previous value', () => {
  const chart = resultChartData(answered(changePlan, ['items_seller_state', 'current_value', 'previous_value', 'change', 'pct_change'], [
    { items_seller_state: 'SP', current_value: '30', previous_value: '20', change: '10', pct_change: '50' },
    { items_seller_state: 'RJ', current_value: '5', previous_value: null, change: null, pct_change: null },
  ]));
  assert.deepEqual(chart?.points.map(point => [point.label, point.value, point.compare]), [['SP', 30, 20], ['RJ', 5, null]]);
});
