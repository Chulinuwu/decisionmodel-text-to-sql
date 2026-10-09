import type { AnomalyPlan, Field, Literal, PeriodChangePlan, SelectPlan } from '../../shared/query-schema';
import type { Interpretation } from '../../shared/schema';
import type { AnsweredResponse } from '../types/state';

const literal = (value: string, start: number): Literal => ({ value, source: 'question', text: value, start, end: start + value.length });

export const monthlyPlan: SelectPlan = {
  kind: 'select',
  from: 'items',
  select: [{ kind: 'bucket', field: { relation: 'items', column: 'purchased_at' }, unit: 'month' }, { kind: 'aggregate', fn: 'sum', field: { relation: 'items', column: 'price' }, distinct: false }],
  joins: [],
  where: { connector: 'and', predicates: [
    { field: { relation: 'items', column: 'purchased_at' }, operator: 'period', value: { ...literal('2017-01-01', 7), text: '2017', end: 11, upper: '2018-01-01' } },
    { field: { relation: 'items', column: 'customer_state' }, operator: 'in', values: [literal('SP', 20), literal('RJ', 26)] },
    { field: { relation: 'items', column: 'order_status' }, operator: 'not_null' },
  ] },
  groupBy: [{ kind: 'bucket', field: { relation: 'items', column: 'purchased_at' }, unit: 'month' }],
  orderBy: { expression: { kind: 'aggregate', fn: 'sum', field: { relation: 'items', column: 'price' }, distinct: false }, direction: 'desc' },
  limit: 1,
};

export const interpretations: Interpretation[] = [
  { id: 'r_0', plan: monthlyPlan, summary: 'ยอดขายสินค้ารวม แยกตามเดือนของวันที่ซื้อ แสดง 1 อันดับ', parts: [{ label: 'วัดอะไร', value: 'ยอดขายสินค้ารวม' }, { label: 'แยกตาม', value: 'เดือนของวันที่ซื้อ' }], probability: 0.48 },
  { id: 'r_1', plan: { ...monthlyPlan, limit: 100 }, summary: 'ยอดขายสินค้ารวม แยกตามเดือนของวันที่ซื้อ', parts: [{ label: 'วัดอะไร', value: 'ยอดขายสินค้ารวม' }], probability: null },
];

const latestMonth: Literal = { value: '2018-08-01', upper: '2018-09-01', source: 'relative', text: 'latest_month', start: null, end: null };
const sellerState: Field = { relation: 'items', column: 'seller_state' };

export const anomalyPlan: AnomalyPlan = {
  kind: 'anomaly', from: 'items', joins: [],
  where: { connector: 'and', predicates: [{ field: { relation: 'items', column: 'freight_value' }, operator: 'gt', other: { relation: 'items', column: 'price' } }] },
  unit: { kind: 'column', field: sellerState }, measure: { kind: 'aggregate', fn: 'sum', field: { relation: 'items', column: 'price' }, distinct: false },
  direction: 'both', limit: 20,
};

export const changePlan: PeriodChangePlan = {
  kind: 'period_change', from: 'items', joins: [], where: { connector: 'and', predicates: [] },
  measure: { kind: 'aggregate', fn: 'sum', field: { relation: 'items', column: 'price' }, distinct: false },
  anchor: { relation: 'items', column: 'purchased_at' }, current: latestMonth, previous: null,
  groupBy: [{ kind: 'column', field: sellerState }], orderBy: 'pct_desc', limit: 5,
};

const usage = { input_tokens: 0, output_tokens: 0, cost: 0 };

export function answered(plan: AnsweredResponse['plan'], columns: string[], rows: AnsweredResponse['rows'], truncated = false): AnsweredResponse {
  return {
    status: 'ok', question: 'q', answer: 'a', plan, interpretation: { id: 'r_0', plan, summary: 's', parts: [], probability: null }, alternatives: [], offerId: null,
    sql: '', parameters: [], columns, rows, truncated, trace: [], usage, model: '', provider: '', elapsedMs: 0, warnings: [],
  };
}

export const anomalyColumns = ['items_seller_state', 'value', 'baseline', 'score', 'is_outlier'];
export const anomalyRows = (outlier: boolean): AnsweredResponse['rows'] => [
  { items_seller_state: 'SP', value: '900.5', baseline: '100', score: '5.1234', is_outlier: outlier },
  { items_seller_state: 'RJ', value: '120', baseline: '100', score: '0.4', is_outlier: false },
];
