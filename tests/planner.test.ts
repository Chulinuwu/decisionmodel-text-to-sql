import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { planQuestion } from '../server/planning/planner.js';
import { compile } from '../server/compiler.js';
import { config } from '../server/config.js';
import type { PlanResult } from '../server/planning/planning.types.js';
import type { Plan, SelectPlan } from '../shared/query-schema.js';
import { buildCatalog } from '../server/planning/semantic-catalog.js';
import { extractSlots } from '../server/planning/slots.js';
import { fixtureSchema as schema } from './schema-fixture.js';

type Scripted = Record<string, Record<string, number> | number>;
const requestSchema = z.object({ questions: z.record(z.string(), z.object({ type: z.enum(['choice', 'noul']), criteria: z.record(z.string(), z.string()) })) });
const defaults = ['none', 'not_filter', 'default'];

function mockDecisions(t: TestContext, script: Scripted) {
  const key = process.env.OPENROUTER_KEY;
  process.env.OPENROUTER_KEY = 'test-placeholder';
  t.after(() => { if (key === undefined) delete process.env.OPENROUTER_KEY; else process.env.OPENROUTER_KEY = key; });
  const requests: z.infer<typeof requestSchema>[] = [];
  t.mock.method(globalThis, 'fetch', async (_url: unknown, init?: RequestInit) => {
    const request = requestSchema.parse(JSON.parse(typeof init?.body === 'string' ? init.body : '{}'));
    requests.push(request);
    const answers = Object.fromEntries(Object.entries(request.questions).map(([id, question]) => {
      const scripted = script[id];
      if (question.type === 'noul') return [id, { type: 'noul', noul: typeof scripted === 'number' ? scripted : 0 }];
      const keys = Object.keys(question.criteria);
      const fallback = defaults.find(option => keys.includes(option)) ?? keys[0] ?? '';
      const probabilities = typeof scripted === 'object' ? Object.fromEntries(Object.entries(scripted).filter(([option]) => keys.includes(option))) : { [fallback]: 1 };
      const choice = Object.entries(probabilities).sort((a, b) => b[1] - a[1])[0]?.[0] ?? fallback;
      return [id, { type: 'choice', choice, probabilities }];
    }));
    return new Response(JSON.stringify({ id: 'test', model: config.model, provider: config.provider, answers, usage: { input_tokens: 1, output_tokens: 0, cost: 0 } }), { status: 200 });
  });
  return requests;
}

const allPlans = (result: PlanResult) => result.status === 'ok' ? [result.chosen, ...result.alternatives].map(entry => entry.plan) : result.status === 'choose' ? result.interpretations.map(entry => entry.plan) : [];
const plansOf = (result: PlanResult) => allPlans(result).flatMap(plan => plan.kind === 'select' ? [plan] : []);
const asSelect = (plan: Plan): SelectPlan => {
  if (plan.kind !== 'select') throw new Error('expected a select plan');
  return plan;
};
const rankCriteria = (requests: z.infer<typeof requestSchema>[]) => Object.keys(requests.at(-1)?.questions.rank?.criteria ?? {}).filter(key => key.startsWith('r_') || key === 'none');

test('best-month Thai revenue question yields one grouped, filtered, ranked plan in two calls', async t => {
  const question = 'ยอดขายปี 2017 เดือนไหนขายดีสุดอะ';
  const requests = mockDecisions(t, {
    target: { revenue: 0.9, count_orders: 0.05 }, operation: { total: 0.92, maximum: 0.05 }, group1: { month_purchase: 0.88, year_purchase: 0.06 },
    order: { value_desc: 0.9, none: 0.05 }, limit: { one: 0.85, default: 0.1 }, slot_0: { a_purchase: 0.93, not_filter: 0.03 }, rank: { r_0: 0.9, none: 0.05 },
  });
  const result = await planQuestion(question, schema);
  assert.equal(requests.length, 2);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  const plan = asSelect(result.chosen.plan);
  const sum = plan.select.find(expression => expression.kind === 'aggregate');
  assert.ok(sum?.kind === 'aggregate' && sum.fn === 'sum');
  assert.ok(['items.price', 'orders.revenue'].includes(`${sum.field?.relation}.${sum.field?.column}`));
  assert.deepEqual(plan.groupBy.map(expression => expression.kind === 'bucket' ? [expression.unit, expression.field.column] : null), [['month', 'purchased_at']]);
  const [period] = plan.where.predicates;
  assert.ok(period && period.operator === 'period' && 'value' in period);
  assert.deepEqual([period.value.value, period.value.upper], ['2017-01-01', '2018-01-01']);
  assert.deepEqual(plan.orderBy, { expression: sum, direction: 'desc' });
  assert.equal(plan.limit, 1);
  assert.match(compile(plan, schema, question).sql, /ORDER BY sum\(.*\) DESC/);
  assert.match(result.chosen.summary, /ยอดขายสินค้ารวม แยกตามเดือนของวันที่ซื้อ เฉพาะวันที่ซื้อในปี 2017 เรียงจากมากไปน้อย แสดง 1 อันดับ/);
  assert.deepEqual(new Set(result.trace.map(entry => entry.stage)), new Set(['shape', 'rank']));
});

test('split distributions become distinct candidates and a split rank asks the user to choose', async t => {
  const question = 'ยอดขายปี 2017 เดือนไหนขายดีสุดอะ';
  mockDecisions(t, {
    target: { revenue: 0.9 }, operation: { total: 0.5, maximum: 0.4, average: 0.1 }, group1: { month_purchase: 0.9 },
    order: { value_desc: 0.9 }, limit: { one: 0.9 }, slot_0: { a_purchase: 0.9 }, rank: { r_0: 0.48, r_1: 0.42, none: 0.1 },
  });
  const result = await planQuestion(question, schema);
  assert.equal(result.status, 'choose');
  const plans = plansOf(result);
  assert.ok(plans.length >= 2);
  const functions = plans.map(plan => plan.select.flatMap(expression => expression.kind === 'aggregate' ? [expression.fn] : []).join());
  assert.ok(functions.includes('sum') && functions.includes('max'));
  for (const plan of plans) assert.doesNotThrow(() => compile(plan, schema, question));
});

test('sorting a single-row count collapses into one candidate', async t => {
  const requests = mockDecisions(t, { target: { count_orders: 0.9 }, order: { value_desc: 0.5, none: 0.45 }, limit: { one: 0.5, default: 0.5 }, slot_0: { a_purchase: 0.9 }, rank: { r_0: 0.9 } });
  const result = await planQuestion('How many orders were placed in 2017?', schema);
  assert.deepEqual(rankCriteria(requests), ['r_0', 'none']);
  assert.equal(result.status, 'ok');
  if (result.status === 'ok') assert.deepEqual([asSelect(result.chosen.plan).orderBy, asSelect(result.chosen.plan).limit, result.alternatives.length], [null, 100, 0]);
});

test('two enum values bound to the same field build one IN predicate', async t => {
  const question = 'Count orders whose customer state is SP or RJ';
  mockDecisions(t, { target: { count_orders: 0.9 }, slot_0: { customer_state_eq: 0.85, seller_state_eq: 0.1 }, slot_1: { customer_state_eq: 0.85, seller_state_eq: 0.1 }, rank: { r_0: 0.9 } });
  const result = await planQuestion(question, schema);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  const { plan } = result.chosen;
  assert.equal(plan.where.predicates.length, 1);
  const [predicate] = plan.where.predicates;
  assert.ok(predicate && predicate.operator === 'in' && 'values' in predicate);
  assert.deepEqual([predicate.field, predicate.values.map(literal => literal.value)], [{ relation: 'orders', column: 'customer_state' }, ['SP', 'RJ']]);
  assert.match(compile(plan, schema, question).sql, /IN \(\$1, \$2\)/);
});

test('target mass on unanswerable intents refuses without a rank call', async t => {
  const requests = mockDecisions(t, { target: { un_net_sales: 0.3, un_ratio: 0.25, revenue: 0.4 } });
  const result = await planQuestion('Net revenue after refunds and discounts', schema);
  assert.equal(result.status, 'unsupported');
  assert.equal(requests.length, 1);
});

test('rank choosing none refuses even with valid candidates', async t => {
  mockDecisions(t, { target: { count_orders: 0.9 }, rank: { none: 0.6, r_0: 0.4 } });
  const result = await planQuestion('How many orders are repeat purchases within 30 days?', schema);
  assert.equal(result.status, 'unsupported');
});

test('a dimension unreachable from every realization root is skipped, not thrown', async t => {
  const requests = mockDecisions(t, { target: { installments: 0.9 }, operation: { average: 0.9 }, group1: { category: 0.6, none: 0.4 }, rank: { r_0: 0.9 } });
  const result = await planQuestion('Average installments per category', schema);
  assert.equal(result.status, 'ok');
  assert.deepEqual(rankCriteria(requests), ['r_0', 'none']);
  for (const plan of plansOf(result)) assert.deepEqual([plan.from, plan.groupBy], ['payments', []]);
  const unreachable = mockDecisions(t, { target: { installments: 0.9 }, operation: { average: 0.9 }, group1: { category: 0.95 } });
  const refused = await planQuestion('Average installments per category', schema);
  assert.equal(refused.status, 'unsupported');
  assert.equal(unreachable.length, 1);
});

test('an exact dataset value is waived only when the model confidently says it is not a filter', async t => {
  const question = 'Average installments for credit_card payments';
  const waived = mockDecisions(t, { target: { installments: 0.9 }, operation: { average: 0.9 }, slot_0: { not_filter: 0.9, payment_type_eq: 0.1 }, rank: { r_0: 0.9 } });
  const unfiltered = await planQuestion(question, schema);
  assert.equal(unfiltered.status, 'ok');
  assert.deepEqual(rankCriteria(waived).filter(key => key.startsWith('r_')), ['r_0']);
  const weak = mockDecisions(t, { target: { installments: 0.9 }, operation: { average: 0.9 }, slot_0: { payment_type_eq: 0.85, not_filter: 0.15 }, rank: { r_0: 0.9 } });
  const filtered = await planQuestion(question, schema);
  assert.deepEqual(rankCriteria(weak).filter(key => key.startsWith('r_')), ['r_0']);
  assert.deepEqual(plansOf(filtered)[0]?.where.predicates.map(predicate => predicate.operator), ['eq']);
});

test('list targets ask a detail call and select requested columns with sorting', async t => {
  const requests = mockDecisions(t, { target: { list_products: 0.9 }, order: { value_desc: 0.9 }, limit: { n_5: 0.9 }, slot_0: { limit_value: 0.9 }, list_products__col_4: 0.9, list_products__sort: { s_product_weight_g: 0.9 }, rank: { r_0: 0.9 } });
  const result = await planQuestion('Show the 5 heaviest products', schema);
  assert.equal(requests.length, 3);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  const plan = asSelect(result.chosen.plan);
  assert.equal(plan.from, 'products');
  assert.equal(plan.limit, 5);
  assert.deepEqual(plan.orderBy, { expression: { kind: 'column', field: { relation: 'products', column: 'product_weight_g' } }, direction: 'desc' });
  assert.ok(plan.select.some(expression => expression.kind === 'column' && expression.field.column === 'product_id'));
});

test('provider failures still throw instead of becoming interpretation outcomes', async t => {
  const key = process.env.OPENROUTER_KEY;
  process.env.OPENROUTER_KEY = 'test-placeholder';
  t.after(() => { if (key === undefined) delete process.env.OPENROUTER_KEY; else process.env.OPENROUTER_KEY = key; });
  t.mock.method(globalThis, 'fetch', async () => new Response('{}', { status: 500 }));
  await assert.rejects(planQuestion('How many orders?', schema), /Decisions API returned HTTP 500/);
});

test('a year bucket fixed by a same-year filter and an implied not_null collapse into one plain count', async t => {
  const requests = mockDecisions(t, {
    target: { count_items: 0.9 }, group1: { year_shipping_limit: 0.5, none: 0.4 }, missing: { shipping_limit_not_null: 0.5, none: 0.45 },
    slot_0: { a_shipping_limit: 0.9 }, rank: { r_0: 0.9 },
  });
  const result = await planQuestion('Count items whose shipping deadline was in 2017.', schema);
  assert.deepEqual(rankCriteria(requests), ['r_0', 'none']);
  const [plan] = plansOf(result);
  assert.deepEqual([plan?.groupBy, plan?.where.predicates.map(predicate => predicate.operator), plan?.limit], [[], ['period'], 100]);
});

test('value linking binds a Thai phrase to a dataset value without exact text and excludes it', async t => {
  const question = 'ยอดขายสินค้าในปี 2017 ไม่รวมออเดอร์ยกเลิก';
  mockDecisions(t, {
    target: { revenue: 0.9 }, operation: { total: 0.9 }, slot_0: { a_purchase: 0.9 },
    link_order_status: { canceled: 0.85, none: 0.1 }, link_order_status_mode: { ne: 0.9 }, rank: { r_0: 0.9 },
  });
  const result = await planQuestion(question, schema);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  const status = asSelect(result.chosen.plan).where.predicates.find(predicate => predicate.field.column === 'order_status');
  assert.ok(status && status.operator === 'ne' && 'value' in status);
  assert.deepEqual(status.value, { value: 'canceled', source: 'dataset', text: 'canceled', start: null, end: null });
  assert.match(compile(asSelect(result.chosen.plan), schema, question).sql, /"order_status" <> \$/);
});

test('several linked values of one field become an IN predicate', async t => {
  mockDecisions(t, { target: { count_orders: 0.9 }, link_customer_state: { SP: 0.5, RJ: 0.4, none: 0.1 }, link_customer_state_mode: { eq_several: 0.8, eq: 0.2 }, rank: { r_0: 0.9 } });
  const result = await planQuestion('How many orders came from São Paulo or Rio de Janeiro customers?', schema);
  const predicates = plansOf(result)[0]?.where.predicates ?? [];
  const states = predicates.find(predicate => predicate.operator === 'in');
  assert.ok(states && 'values' in states);
  assert.deepEqual(states.values.map(literal => literal.value).sort(), ['RJ', 'SP']);
});

test('order summary columns are fallback realizations, never standalone measures or filter targets', () => {
  const catalog = buildCatalog(schema);
  const ids = catalog.measures.map(measure => measure.id);
  assert.ok(!ids.includes('orders_review_score') && !ids.includes('orders_payment_total'));
  assert.ok(!catalog.numericFields.some(entry => ['payment_total', 'review_score'].includes(entry.field.column) && entry.field.relation === 'orders'));
  const review = catalog.measures.find(measure => measure.id === 'review_score');
  assert.deepEqual(review?.kind === 'numeric' ? review.realizations.map(entry => entry.root) : [], ['reviews', 'orders']);
  const freight = catalog.numericFields.filter(entry => entry.field.column.includes('freight')).map(entry => entry.label.en);
  assert.ok(freight.some(text => /each order item/.test(text)) && freight.some(text => /whole order/.test(text)));
});

test('every list target in the beam gets detail questions, not only the top target', async t => {
  const requests = mockDecisions(t, {
    target: { product_weight: 0.42, list_products: 0.34, list_items: 0.14 }, operation: { maximum: 0.8 }, order: { value_desc: 0.9 }, limit: { n_5: 0.9 },
    slot_0: { limit_value: 0.9 }, list_products__sort: { s_product_weight_g: 0.9 }, rank: { r_1: 0.8, r_0: 0.1 },
  });
  const result = await planQuestion('List the 5 heaviest products with their weight', schema);
  assert.equal(requests.length, 3);
  const detailIds = Object.keys(requests[1]?.questions ?? {});
  assert.ok(detailIds.some(id => id.startsWith('list_products__')) && detailIds.some(id => id.startsWith('list_items__')));
  assert.ok(plansOf(result).some(plan => plan.from === 'products' && !plan.select.some(expression => expression.kind === 'aggregate')));
});

test('read-only policy refuses modification requests before any decision call', async t => {
  const requests = mockDecisions(t, {});
  for (const question of ['Delete all canceled orders and show the remaining count', 'ลบคำสั่งซื้อที่ยกเลิกทั้งหมด', 'update orders set status']) {
    const result = await planQuestion(question, schema);
    assert.equal(result.status, 'unsupported');
  }
  assert.equal(requests.length, 0);
});

test('a rank vote for an unanswerable intent beats partial plans', async t => {
  mockDecisions(t, { target: { count_buyers: 0.7, un_repeat: 0.2 }, rank: { un_repeat: 0.6, r_0: 0.3 } });
  const result = await planQuestion('ลูกค้าซื้อซ้ำภายใน 30 วันมีกี่คน', schema);
  assert.equal(result.status, 'unsupported');
  if (result.status === 'unsupported') assert.match(result.detail, /ซื้อซ้ำ/);
});

test('grouped results cut below the default without an ordering are invalid', async t => {
  const requests = mockDecisions(t, { target: { count_orders: 0.9 }, group1: { customer_state: 0.9 }, order: { none: 0.7, value_desc: 0.3 }, limit: { one: 0.9 }, rank: { r_0: 0.9 } });
  await planQuestion('Which customer state has the most orders?', schema);
  assert.deepEqual(rankCriteria(requests), ['r_0', 'none']);
  assert.match(requests.at(-1)?.questions.rank?.criteria.r_0 ?? '', /sort COUNT\(\*\) desc/);
});

test('interpretation ids are the rank keys', async t => {
  mockDecisions(t, { target: { revenue: 0.9 }, operation: { total: 0.5, maximum: 0.4 }, group1: { month_purchase: 0.9 }, order: { value_desc: 0.9 }, limit: { one: 0.9 }, slot_0: { a_purchase: 0.9 }, rank: { r_1: 0.45, r_0: 0.4 } });
  const result = await planQuestion('ยอดขายปี 2017 เดือนไหนขายดีสุดอะ', schema);
  assert.equal(result.status, 'choose');
  if (result.status === 'choose') assert.deepEqual(result.interpretations.map(entry => entry.id), ['r_1', 'r_0']);
});

test('single-option choices are resolved locally and never sent to the Decisions API', async t => {
  const requests = mockDecisions(t, { target: { list_sellers: 1 } });
  await planQuestion('Which seller sells the most?', schema);
  const sent = requests.flatMap(request => Object.values(request.questions)).filter(question => question.type === 'choice');
  assert.ok(requests.some(request => Object.keys(request.questions).some(id => id.startsWith('list_sellers__'))));
  assert.ok(sent.every(question => Object.keys(question.criteria).length >= 2));
});

const latestMonth = { value: '2018-08-01', upper: '2018-09-01', source: 'relative', text: 'latest_month', start: null, end: null };

test('anomaly path: unusual sales days within a named year', async t => {
  const question = 'วันไหนในปี 2017 ที่ยอดขายพุ่งผิดปกติ';
  const requests = mockDecisions(t, { analysis: { anomaly: 0.8, select: 0.2 }, target: { revenue: 0.9 }, operation: { total: 0.9 }, group1: { day_purchase: 0.9 }, slot_0: { a_purchase: 0.9 }, anomaly_direction: { high: 0.9 }, rank: { r_0: 0.9 } });
  const result = await planQuestion(question, schema);
  assert.ok(requests.length <= 3);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  const plan = result.chosen.plan;
  assert.equal(plan.kind, 'anomaly');
  if (plan.kind !== 'anomaly') return;
  assert.deepEqual([plan.unit, plan.measure, plan.direction, plan.limit], [{ kind: 'bucket', field: { relation: 'items', column: 'purchased_at' }, unit: 'day' }, { kind: 'aggregate', fn: 'sum', field: { relation: 'items', column: 'price' }, distinct: false }, 'high', 20]);
  assert.deepEqual(plan.where.predicates.map(predicate => predicate.operator), ['period']);
  assert.doesNotThrow(() => compile(plan, schema, question));
  assert.match(result.chosen.summary, /หาค่าผิดปกติ/);
});

test('anomaly without a period is scoped to the complete-data window', async t => {
  mockDecisions(t, { analysis: { anomaly: 0.9 }, target: { count_orders: 0.9 }, group1: { customer_state: 0.9 }, rank: { r_0: 0.9 } });
  const result = await planQuestion('Which states have an unusual number of orders?', schema);
  const plan = result.status === 'ok' ? result.chosen.plan : null;
  assert.equal(plan?.kind, 'anomaly');
  const scope = plan?.where.predicates[0];
  assert.ok(scope && 'value' in scope);
  assert.equal(scope.value.text, 'coverage');
});

test('period change path: latest month against the previous month', async t => {
  const question = 'ยอดขายเดือนนี้เทียบกับเดือนที่แล้วเป็นยังไง';
  const requests = mockDecisions(t, { analysis: { period_change: 0.85 }, target: { revenue: 0.9 }, operation: { total: 0.9 }, relative_period: { latest_month: 0.8 }, rank: { r_0: 0.9 } });
  const result = await planQuestion(question, schema);
  assert.ok(requests.length <= 3);
  const plan = result.status === 'ok' ? result.chosen.plan : null;
  assert.equal(plan?.kind, 'period_change');
  if (plan?.kind !== 'period_change') return;
  assert.deepEqual([plan.current, plan.previous, plan.groupBy], [latestMonth, null, []]);
  assert.match(compile(plan, schema, question).sql, /previous_period/);
});

test('period change by category ranks growth', async t => {
  mockDecisions(t, { analysis: { period_change: 0.85 }, target: { revenue: 0.9 }, operation: { total: 0.9 }, group1: { category: 0.8 }, change_order: { pct_desc: 0.8 }, rank: { r_0: 0.9 } });
  const result = await planQuestion('หมวดสินค้าไหนโตเร็วที่สุด', schema);
  const plan = result.status === 'ok' ? result.chosen.plan : null;
  assert.ok(plan?.kind === 'period_change' && plan.orderBy === 'pct_desc' && plan.groupBy.length === 1);
});

test('condition path: a declared column comparison becomes a predicate', async t => {
  const question = 'ออเดอร์ที่ส่งช้ากว่ากำหนดมีกี่รายการ';
  mockDecisions(t, { target: { count_orders: 0.9 }, condition: { late_delivery: 0.8, none: 0.15 }, rank: { r_0: 0.8, r_1: 0.1 } });
  const result = await planQuestion(question, schema);
  assert.equal(result.status, 'ok');
  if (result.status !== 'ok') return;
  const [predicate] = asSelect(result.chosen.plan).where.predicates;
  assert.ok(predicate && 'other' in predicate);
  assert.deepEqual([predicate.field.column, predicate.operator, predicate.other.column], ['delivered_at', 'gt', 'estimated_delivery_at']);
  assert.match(result.chosen.summary, /ช้ากว่าวันส่งถึงโดยประมาณ/);
});

test('relative period path: "this month" filters the latest complete month', async t => {
  const question = 'ยอดขายเดือนนี้';
  mockDecisions(t, { target: { revenue: 0.9 }, operation: { total: 0.9 }, relative_period: { latest_month: 0.85 }, rank: { r_0: 0.9 } });
  const result = await planQuestion(question, schema);
  const plan = result.status === 'ok' ? asSelect(result.chosen.plan) : null;
  const [predicate] = plan?.where.predicates ?? [];
  assert.ok(plan && predicate && 'value' in predicate);
  assert.deepEqual(predicate.value, latestMonth);
  assert.doesNotThrow(() => compile(plan, schema, question));
});

test('cause questions are refused with the cause reason', async t => {
  const requests = mockDecisions(t, { target: { un_cause: 0.65, revenue: 0.3 } });
  const result = await planQuestion('ทำไมยอดขายเดือนที่แล้วถึงตก', schema);
  assert.equal(result.status, 'unsupported');
  if (result.status === 'unsupported') assert.match(result.detail, /สาเหตุ/);
  assert.equal(requests.length, 1);
});

test('an evidence-less value link keeps the unlinked reading for ranking', async t => {
  const requests = mockDecisions(t, { target: { count_buyers: 0.9 }, group1: { customer_state: 0.9 }, order: { value_desc: 0.9 }, limit: { one: 0.9 }, link_customer_state: { SP: 0.7, RJ: 0.2, none: 0.02 }, rank: { r_1: 0.8, r_0: 0.2 } });
  const result = await planQuestion('รัฐไหนมีลูกค้ามากที่สุด', schema);
  const criteria = Object.values(requests.at(-1)?.questions.rank?.criteria ?? {});
  assert.ok(criteria.some(text => text.includes('IN') || / eq /.test(text)));
  assert.ok(criteria.some(text => text.startsWith('report') && !text.includes('where')));
  assert.ok(plansOf(result).some(plan => plan.groupBy.length === 1 && plan.where.predicates.length === 0));
});

test('regression: top-10 categories of 2017 is answerable despite the dual 2017 slot and a stray category link', async t => {
  const question = '10 อันดับหมวดสินค้าที่ขายดีที่สุดปี 2017';
  const requests = mockDecisions(t, {
    target: { revenue: 0.7, count_items: 0.2 }, operation: { total: 0.9 }, group1: { category: 0.85 }, order: { value_desc: 0.9 }, limit: { n_10: 0.9 },
    slot_0: { limit_value: 0.8, not_filter: 0.2 }, slot_1: { a_purchase: 0.9 }, slot_2: { not_filter: 0.9 }, link_category: { watches_gifts: 0.85, none: 0.05 }, rank: { r_0: 0.6, r_1: 0.3 },
  });
  const result = await planQuestion(question, schema);
  assert.ok(requests.length <= 3);
  assert.notEqual(result.status, 'unsupported');
  assert.ok(plansOf(result).some(plan => plan.limit === 10 && plan.groupBy.some(expression => expression.kind === 'column' && expression.field.column === 'category') && plan.where.predicates.length === 1 && plan.where.predicates[0]?.operator === 'period'));
});

test('identity dimensions group by individual sellers', async t => {
  const question = 'Which seller has the highest revenue?';
  mockDecisions(t, { target: { revenue: 0.9 }, operation: { total: 0.9 }, group1: { seller: 0.8 }, order: { value_desc: 0.9 }, limit: { one: 0.9 }, rank: { r_0: 0.9 } });
  const result = await planQuestion(question, schema);
  const plan = result.status === 'ok' ? asSelect(result.chosen.plan) : null;
  assert.deepEqual(plan?.groupBy, [{ kind: 'column', field: { relation: 'items', column: 'seller_id' } }]);
  assert.equal(plan?.limit, 1);
});

test('named Thai months parse into month periods and swallow their inner year', () => {
  const kinds = extractSlots('มีออเดอร์ไหนยอดสูงผิดปกติในเดือน พ.ย. 2017 บ้าง', schema, buildCatalog(schema)).map(slot => `${slot.kind}:${slot.text}`);
  assert.deepEqual(kinds, ['period:พ.ย. 2017']);
});
