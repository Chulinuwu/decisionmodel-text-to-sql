import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { after, before, test } from 'node:test';
import pg from 'pg';
import { compile } from '../server/compiler.js';
import { config } from '../server/config.js';
import { databaseSchema } from '../server/schema-client.js';
import { pool } from '../server/db-client.js';
import { buildCatalog } from '../server/planning/semantic-catalog.js';
import { extractSlots } from '../server/planning/slots.js';
import { buildDetailQuestions, buildShapeQuestions } from '../server/planning/shape-questions.js';
import type { DatabaseSchema, Expression, Literal, Plan, Predicate, SelectPlan } from '../shared/query-schema.js';

const importer = new pg.Client({ host: config.dbHost, port: config.dbPort, database: config.database, ...config.importer });
let schema: DatabaseSchema;
before(async () => { await importer.connect(); schema = await databaseSchema(); });
after(async () => { await importer.end(); await pool.end(); });

const aggregate = (relation: Plan['from'], column: string | null, fn: 'count' | 'sum' | 'avg' = 'count', distinct = false): Expression => ({ kind: 'aggregate', fn, field: column ? { relation, column } : null, distinct });
const column = (relation: Plan['from'], name: string): Expression => ({ kind: 'column', field: { relation, column: name } });
const plan = (from: Plan['from'], select: Expression[], overrides: Partial<SelectPlan> = {}): SelectPlan => ({ kind: 'select', from, select, joins: [], where: { connector: 'and', predicates: [] }, groupBy: [], orderBy: null, limit: 100, ...overrides });
const literal = (question: string, text: string, value: string | number = text): Literal => ({ source: 'question', text, value, start: question.indexOf(text), end: question.indexOf(text) + text.length });
const period = (question: string, relation: Plan['from'], name: string, text: string, start: string, upper: string): Predicate => ({ field: { relation, column: name }, operator: 'period', value: { ...literal(question, text, start), upper } });

async function compare(input: Plan, question: string, gold: string) {
  const compiled = compile(input, schema, question);
  const actual = await importer.query(compiled.sql, compiled.values);
  const expected = await importer.query(gold);
  assert.deepEqual(actual.rows.map(row => Object.values(row)), expected.rows.map(row => Object.values(row)));
}

test('all nine source relations retain typed views and order/item row and financial totals', async () => {
  assert.equal(schema.relations.length, 9);
  const { rows: [counts] } = await importer.query(`SELECT
    (SELECT count(*) FROM raw.orders) = (SELECT count(*) FROM analytics.orders) AS orders,
    (SELECT count(*) FROM raw.items) = (SELECT count(*) FROM analytics.items) AS items,
    (SELECT sum(price::numeric) FROM raw.items) = (SELECT sum(revenue) FROM analytics.orders) AS revenue,
    (SELECT sum(payment_value::numeric) FROM raw.payments) = (SELECT sum(payment_total) FROM analytics.orders) AS payments`);
  assert.deepEqual(counts, { orders: true, items: true, revenue: true, payments: true });
  for (const relation of ['customers', 'sellers', 'geolocation'] as const) assert.equal(schema.relations.find(entry => entry.name === relation)?.columns.find(entry => entry.name.endsWith('zip_code_prefix'))?.type, 'text');
});

test('declared many-to-one targets are unique and joins preserve base-row counts', async () => {
  for (const edge of schema.edges) {
    const { rows } = await importer.query(`SELECT "${edge.toColumn}" FROM analytics."${edge.to}" WHERE "${edge.toColumn}" IS NOT NULL GROUP BY "${edge.toColumn}" HAVING count(*) > 1 LIMIT 1`);
    assert.equal(rows.length, 0, edge.id);
    const { rows: [counts] } = await importer.query(`SELECT (SELECT count(*) FROM analytics."${edge.from}") AS base, (SELECT count(*) FROM analytics."${edge.from}" f LEFT JOIN analytics."${edge.to}" t ON f."${edge.fromColumn}" = t."${edge.toColumn}") AS joined`);
    assert.equal(counts.base, counts.joined, edge.id);
  }
});

test('distinct buyers in 2017 match the raw customer identity, not order-linked IDs', async () => {
  const question = 'Distinct buyers in 2017';
  await compare(plan('orders', [aggregate('customers', 'customer_unique_id', 'count', true)], { joins: ['orders_customers'], where: { connector: 'and', predicates: [period(question, 'orders', 'purchased_at', '2017', '2017-01-01', '2018-01-01')] } }), question,
    `SELECT count(DISTINCT c.customer_unique_id) FROM raw.orders o JOIN raw.customers c USING(customer_id) WHERE o.order_purchase_timestamp::timestamp >= timestamp '2017-01-01' AND o.order_purchase_timestamp::timestamp < timestamp '2018-01-01'`);
});

test('payment type totals preserve payment-row grain', async () => {
  const type = column('payments', 'payment_type'), total = aggregate('payments', 'payment_value', 'sum');
  await compare(plan('payments', [type, total], { groupBy: [type], orderBy: { expression: total, direction: 'desc' } }), 'Payment total by type',
    'SELECT payment_type, sum(payment_value::numeric) AS total FROM raw.payments GROUP BY payment_type ORDER BY total DESC NULLS LAST, payment_type');
});

test('strict numeric bounds differ from text comparison and inclusive thresholds', async () => {
  const question = 'Items with price over 100 and freight under 20';
  await compare(plan('items', [aggregate('items', null)], { where: { connector: 'and', predicates: [
    { field: { relation: 'items', column: 'price' }, operator: 'gt', value: literal(question, '100', 100) },
    { field: { relation: 'items', column: 'freight_value' }, operator: 'lt', value: literal(question, '20', 20) },
  ] } }), question, 'SELECT count(*) FROM raw.items WHERE price::numeric > 100 AND freight_value::numeric < 20');
});

test('seller-state revenue uses the seller join and excludes freight', async () => {
  const state = column('sellers', 'seller_state'), total = aggregate('items', 'price', 'sum');
  await compare(plan('items', [state, total], { joins: ['items_sellers'], groupBy: [state], orderBy: { expression: total, direction: 'desc' } }), 'Item revenue by seller state',
    'SELECT s.seller_state, sum(i.price::numeric) AS revenue FROM raw.items i JOIN raw.sellers s USING(seller_id) GROUP BY s.seller_state ORDER BY revenue DESC NULLS LAST, s.seller_state');
});

test('translated product-category filters use the declared two-edge path', async () => {
  const question = 'Item revenue in health_beauty';
  await compare(plan('items', [aggregate('items', 'price', 'sum')], { joins: ['items_products', 'products_translation'], where: { connector: 'and', predicates: [{ field: { relation: 'category_translation', column: 'product_category_name_english' }, operator: 'eq', value: literal(question, 'health_beauty') }] } }), question,
    `SELECT sum(i.price::numeric) FROM raw.items i JOIN raw.products p USING(product_id) JOIN raw.category_translation t USING(product_category_name) WHERE t.product_category_name_english = 'health_beauty'`);
});

test('purchase-day and shipping-year filters preserve the requested date anchor', async () => {
  const day = 'Orders on 2017-01-01';
  await compare(plan('orders', [aggregate('orders', null)], { where: { connector: 'and', predicates: [period(day, 'orders', 'purchased_at', '2017-01-01', '2017-01-01', '2017-01-02')] } }), day,
    `SELECT count(*) FROM raw.orders WHERE order_purchase_timestamp::timestamp >= timestamp '2017-01-01' AND order_purchase_timestamp::timestamp < timestamp '2017-01-02'`);
  const year = 'Items with shipping deadline in 2017';
  await compare(plan('items', [aggregate('items', null)], { where: { connector: 'and', predicates: [period(year, 'items', 'shipping_limit_at', '2017', '2017-01-01', '2018-01-01')] } }), year,
    `SELECT count(*) FROM raw.items WHERE shipping_limit_date::timestamp >= timestamp '2017-01-01' AND shipping_limit_date::timestamp < timestamp '2018-01-01'`);
});

test('missing delivery timestamps use NULL semantics independent of order status', async () => {
  await compare(plan('orders', [aggregate('orders', null)], { where: { connector: 'and', predicates: [{ field: { relation: 'orders', column: 'delivered_at' }, operator: 'is_null' }] } }), 'Orders without delivery timestamp',
    'SELECT count(*) FROM raw.orders WHERE order_delivered_customer_date IS NULL');
});

test('rollback-only fixtures expose repeat-buyer identity, join fanout and date boundaries', async () => {
  await importer.query('BEGIN');
  try {
    await importer.query(await readFile(new URL('./fixtures.sql', import.meta.url), 'utf8'));
    const executeFixture = async (input: Plan, question = '') => {
      const compiled = compile(input, schema, question);
      return importer.query(compiled.sql.replaceAll('analytics.', 'pg_temp.'), compiled.values);
    };
    const { rows: [buyers] } = await executeFixture(plan('orders', [aggregate('customers', 'customer_unique_id', 'count', true), aggregate('customers', 'customer_id', 'count', true)], { joins: ['orders_customers'] }));
    assert.deepEqual(Object.values(buyers), ['2', '3']);
    const { rows: [sum] } = await executeFixture(plan('orders', [aggregate('orders', 'payment_total', 'sum')]));
    assert.deepEqual(Object.values(sum), ['95']);
    const { rows: [naive] } = await importer.query('SELECT sum(p.payment_value) AS total FROM pg_temp.orders o JOIN pg_temp.items i USING(order_id) JOIN pg_temp.payments p USING(order_id) JOIN pg_temp.reviews r USING(order_id)');
    assert.equal(naive.total, '210');
    assert.notEqual(naive.total, Object.values(sum)[0]);
    const question = 'Orders on 2017-01-01';
    const { rows: [day] } = await executeFixture(plan('orders', [aggregate('orders', null)], { where: { connector: 'and', predicates: [period(question, 'orders', 'purchased_at', '2017-01-01', '2017-01-01', '2017-01-02')] } }), question);
    assert.deepEqual(Object.values(day), ['2']);
    for (const [name, operator, number, expected] of [['price', 'gt', 20, '1'], ['freight_value', 'lt', 2, '2']] as const) {
      const question = `Items with ${name} ${operator} ${number}`;
      const { rows: [count] } = await executeFixture(plan('items', [aggregate('items', null)], { where: { connector: 'and', predicates: [{ field: { relation: 'items', column: name }, operator, value: literal(question, String(number), number) }] } }), question);
      assert.deepEqual(Object.values(count), [expected]);
    }
    const states = 'Orders from SP or RJ';
    const { rows: [stateCount] } = await executeFixture(plan('orders', [aggregate('orders', null)], { joins: ['orders_customers'], where: { connector: 'or', predicates: ['SP', 'RJ'].map(state => ({ field: { relation: 'customers', column: 'customer_state' }, operator: 'eq', value: literal(states, state) })) } }), states);
    assert.deepEqual(Object.values(stateCount), ['3']);
    const { rows: [stateList] } = await executeFixture(plan('orders', [aggregate('orders', null)], { joins: ['orders_customers'], where: { connector: 'and', predicates: [{ field: { relation: 'customers', column: 'customer_state' }, operator: 'in', values: ['SP', 'RJ'].map(state => literal(states, state)) }] } }), states);
    assert.deepEqual(Object.values(stateList), ['3']);
    const { rows: [notSp] } = await executeFixture(plan('orders', [aggregate('orders', null)], { joins: ['orders_customers'], where: { connector: 'and', predicates: [{ field: { relation: 'customers', column: 'customer_state' }, operator: 'not_in', values: ['SP', 'RJ'].map(state => literal(states, state)) }] } }), states);
    assert.deepEqual(Object.values(notSp), ['0']);
    const { rows: [scores] } = await importer.query('SELECT (SELECT avg(review_score) FROM pg_temp.reviews) AS raw_reviews, (SELECT avg(review_score) FROM pg_temp.orders) AS order_means');
    assert.equal(Number(scores.raw_reviews), 3.5);
    assert.notEqual(Number(scores.raw_reviews), Number(scores.order_means));
  } finally { await importer.query('ROLLBACK'); }
});

test('application analyst cannot read raw data or write analytics', async () => {
  await assert.rejects(pool.query('SELECT * FROM raw.orders LIMIT 1'), /permission denied/);
  await assert.rejects(pool.query('UPDATE analytics.customers SET customer_city = customer_city WHERE false'), /read-only|permission denied/);
});

test('phase-1 (with value linking) and detail decision payloads for a long Thai question stay within the client budgets', () => {
  const base = 'ยอดขายรวมและจำนวนคำสั่งซื้อของลูกค้าในรัฐ SP หรือ RJ หรือ MG ที่จ่ายด้วย credit_card สถานะ delivered ในปี 2017 และเดือน 2018-03 ราคามากกว่า 100 แต่ไม่เกิน 500 หมวด "health_beauty" แยกตามเดือนของวันที่ซื้อ แสดง 10 อันดับ ';
  let question = base;
  while (Buffer.byteLength(question + base) <= config.maxQuestionBytes) question += base;
  assert.ok(Buffer.byteLength(question) <= config.maxQuestionBytes);
  const catalog = buildCatalog(schema), slots = extractSlots(question, schema, catalog);
  assert.ok(slots.length >= 8);
  const { questions } = buildShapeQuestions(question, schema, catalog, slots);
  assert.ok(Object.keys(questions).some(id => id.startsWith('link_')));
  for (const id of ['analysis', 'relative_period', 'condition', 'anomaly_direction', 'change_order']) assert.ok(id in questions, id);
  const numeric = `${'ราคามากกว่า 100 ค่าส่งน้อยกว่า 20 จำนวน 3 งวด น้ำหนัก 500 '.repeat(3)}ยอดขายปี 2017 เทียบกับ 2018`;
  const numericSlots = extractSlots(numeric, schema, catalog);
  assert.equal(numericSlots.length, 8);
  assert.ok(Buffer.byteLength(JSON.stringify({ model: config.model, state: numeric, questions: buildShapeQuestions(numeric, schema, catalog, numericSlots).questions })) < 32000);
  assert.ok(Buffer.byteLength(question) <= 2600);
  assert.ok(Buffer.byteLength(JSON.stringify({ model: config.model, state: question, questions })) < 32000);
  const lists = catalog.measures.flatMap(measure => measure.kind === 'list' ? [measure] : []);
  assert.ok(Buffer.byteLength(JSON.stringify({ model: config.model, state: question, questions: buildDetailQuestions(lists, schema).questions })) < 32000);
});
