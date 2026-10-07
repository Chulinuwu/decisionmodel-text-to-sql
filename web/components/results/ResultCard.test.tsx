import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ResultCard } from './ResultCard';
import { anomalyColumns, anomalyPlan, anomalyRows, answered, monthlyPlan } from '../../test/fixtures';

const capNote = 'มีข้อมูลมากกว่าที่แสดง';

test('outlier rows are highlighted and no zero-outlier note is shown when outliers exist', () => {
  const html = renderToStaticMarkup(<ResultCard response={answered(anomalyPlan, anomalyColumns, anomalyRows(true))} question="q" />);
  assert.equal(html.match(/class="outlier-row"/g)?.length, 1);
  assert.ok(html.includes('ผิดปกติ'));
  assert.ok(html.includes('5.12'));
  assert.ok(!html.includes('ไม่พบค่าผิดปกติ'));
});

test('an anomaly result without outliers explains the threshold', () => {
  const html = renderToStaticMarkup(<ResultCard response={answered(anomalyPlan, anomalyColumns, anomalyRows(false))} question="q" />);
  assert.ok(html.includes('ไม่พบค่าผิดปกติตามเกณฑ์ modified z-score 3.5'));
  assert.ok(!html.includes('outlier-row'));
});

test('the more-rows footer appears only for the default cap, not for an explicit top-N', () => {
  const rows = [{ month_items_purchased_at: '2017-01-01', sum_items_price: '10' }];
  const columns = ['month_items_purchased_at', 'sum_items_price'];
  assert.ok(!renderToStaticMarkup(<ResultCard response={answered(monthlyPlan, columns, rows, true)} question="q" />).includes(capNote));
  assert.ok(renderToStaticMarkup(<ResultCard response={answered({ ...monthlyPlan, limit: 100 }, columns, rows, true)} question="q" />).includes(capNote));
});
