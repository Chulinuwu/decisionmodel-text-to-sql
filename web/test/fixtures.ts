import type { Literal, Plan } from '../../shared/query-schema';
import type { Interpretation } from '../../shared/schema';

const literal = (value: string, start: number): Literal => ({ value, source: 'question', text: value, start, end: start + value.length });

export const monthlyPlan: Plan = {
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
