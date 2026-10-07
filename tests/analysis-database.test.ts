import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import pg from 'pg';
import { compile } from '../server/compiler.js';
import { config } from '../server/config.js';
import { databaseSchema } from '../server/schema-client.js';
import { pool } from '../server/db-client.js';
import { relativeLiteral } from '../server/compile/relative-periods.js';
import { runInterpretation } from '../server/query/query-runner.js';
import { AnalysisNotApplicableError } from '../server/query/query-errors.js';
import type { AnomalyPlan, DatabaseSchema, Literal, PeriodChangePlan, Plan, SelectPlan } from '../shared/query-schema.js';

const importer = new pg.Client({ host: config.dbHost, port: config.dbPort, database: config.database, ...config.importer });
let schema: DatabaseSchema;
before(async () => { await importer.connect(); schema = await databaseSchema(); });
after(async () => { await importer.end(); await pool.end(); });

const round = (value: unknown) => value === null ? null : Number(Number(value).toFixed(6));
const rowsOf = (result: pg.QueryResult) => result.rows.map(row => Object.values(row).map(value => typeof value === 'boolean' || value === null ? value : Number.isNaN(Number(value)) || /^\d{4}-\d{2}-\d{2}/.test(String(value)) ? String(value).slice(0, 10) : round(value)));
async function compare(plan: Plan, gold: string, question = '', limit?: number) {
  const compiled = compile(plan, schema, question);
  const actual = rowsOf(await importer.query(compiled.sql, compiled.values)).slice(0, limit ?? plan.limit);
  const expected = rowsOf(await importer.query(gold)).slice(0, limit ?? plan.limit);
  assert.ok(expected.length > 0);
  assert.deepEqual(actual, expected);
  return compiled;
}
const coverage = () => relativeLiteral('coverage', schema.coverage);
const period = (literal: Literal) => ({ field: { relation: 'orders' as const, column: 'purchased_at' }, operator: 'period' as const, value: literal });
const anomaly = (overrides: Partial<AnomalyPlan>): AnomalyPlan => ({ kind: 'anomaly', from: 'orders', joins: [], where: { connector: 'and', predicates: [] }, unit: { kind: 'column', field: { relation: 'orders', column: 'order_id' } }, measure: { kind: 'column', field: { relation: 'orders', column: 'revenue' } }, direction: 'both', limit: 20, ...overrides });

// Independent modified z-score over a (unit, value) relation written as nested subqueries.
const goldScores = (units: string, outlier = 'abs(score) >= 3.5') => `
  SELECT unit, value, baseline, score, ${outlier} AS is_outlier FROM (
    SELECT u.unit, u.value, m.median AS baseline,
      CASE WHEN d.mad > 0 THEN 0.6745 * (u.value - m.median) / d.mad WHEN d.mean_ad > 0 THEN (u.value - m.median) / (1.253314 * d.mean_ad) ELSE 0 END AS score
    FROM (${units}) u,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY value) AS median, count(*) AS n FROM (${units}) x) m,
      (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY abs(x.value - m2.median)) AS mad, avg(abs(x.value - m2.median)) AS mean_ad
         FROM (${units}) x, (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY value) AS median FROM (${units}) y) m2) d
    WHERE m.n >= 8
  ) scored ORDER BY abs(score) DESC, unit ASC`;

test('coverage is the complete-month window and latest_month is the last complete month', () => {
  assert.deepEqual(schema.coverage, { start: '2017-01-01', end: '2018-09-01' });
  assert.deepEqual([relativeLiteral('latest_month', schema.coverage).value, relativeLiteral('latest_month', schema.coverage).upper], ['2018-08-01', '2018-09-01']);
});

test('relative periods recompute their bounds and reject forged ones', async () => {
  const latest = relativeLiteral('latest_month', schema.coverage);
  const count: SelectPlan = { kind: 'select', from: 'orders', select: [{ kind: 'aggregate', fn: 'count', field: null, distinct: false }], joins: [], where: { connector: 'and', predicates: [period(latest)] }, groupBy: [], orderBy: null, limit: 100 };
  await compare(count, `SELECT count(*) FROM raw.orders WHERE order_purchase_timestamp::timestamp >= '2018-08-01' AND order_purchase_timestamp::timestamp < '2018-09-01'`);
  for (const forged of [{ ...latest, value: '2018-09-01', upper: '2018-10-01' }, { ...latest, text: 'yesterday' }, { ...latest, start: 0, end: 3 }]) {
    assert.throws(() => compile({ ...count, where: { connector: 'and', predicates: [period(forged)] } }, schema, ''), /complete-data window/);
  }
});

test('record-level anomaly over order values matches raw per-order item revenue', async () => {
  await compare(anomaly({}), goldScores('SELECT order_id AS unit, sum(price::numeric) AS value FROM raw.items GROUP BY order_id'));
});

test('grouped anomaly by purchase month within coverage matches raw monthly counts', async () => {
  const month = { kind: 'bucket' as const, field: { relation: 'orders' as const, column: 'purchased_at' }, unit: 'month' as const };
  await compare(anomaly({ unit: month, measure: { kind: 'aggregate', fn: 'count', field: null, distinct: false }, where: { connector: 'and', predicates: [period(coverage())] } }),
    goldScores(`SELECT date_trunc('month', order_purchase_timestamp::timestamp)::date AS unit, count(*)::numeric AS value FROM raw.orders WHERE order_purchase_timestamp::timestamp >= '2017-01-01' AND order_purchase_timestamp::timestamp < '2018-09-01' GROUP BY 1`));
});

test('grouped anomaly by a categorical dimension matches raw per-state counts, high direction', async () => {
  await compare(anomaly({ unit: { kind: 'column', field: { relation: 'orders', column: 'customer_state' } }, measure: { kind: 'aggregate', fn: 'count', field: null, distinct: false }, direction: 'high' }),
    goldScores('SELECT c.customer_state AS unit, count(*)::numeric AS value FROM raw.orders o JOIN raw.customers c USING (customer_id) GROUP BY 1', 'score >= 3.5'));
});

test('MAD of zero falls back to the mean absolute deviation scale; fewer than 8 units yields no rows', async () => {
  await importer.query('BEGIN');
  try {
    await importer.query("CREATE TEMP TABLE orders(order_id text, revenue numeric); INSERT INTO orders VALUES ('a',10),('b',10),('c',10),('d',10),('e',10),('f',10),('g',10),('h',20),('i',50)");
    const compiled = compile(anomaly({}), schema, '');
    const { rows } = await importer.query(compiled.sql.replaceAll('analytics.', 'pg_temp.'), compiled.values);
    const meanAd = (10 + 40) / 9;
    assert.equal(rows[0]?.unit ?? rows[0]?.orders_order_id, 'i');
    assert.equal(round(rows[0]?.score), round(40 / (1.253314 * meanAd)));
    assert.equal(rows[0]?.is_outlier, true);
    assert.equal(rows.find(row => row.orders_order_id === 'h')?.is_outlier, false);
    await importer.query("DELETE FROM orders WHERE order_id IN ('a','b')");
    assert.equal((await importer.query(compiled.sql.replaceAll('analytics.', 'pg_temp.'), compiled.values)).rows.length, 0);
    assert.ok(compiled.emptyResult);
  } finally { await importer.query('ROLLBACK'); }
});

test('an anomaly population below 8 units surfaces as a not-applicable analysis', async () => {
  const states = 'SP or RJ';
  const plan = anomaly({ unit: { kind: 'column', field: { relation: 'orders', column: 'customer_state' } }, measure: { kind: 'aggregate', fn: 'count', field: null, distinct: false },
    where: { connector: 'and', predicates: [{ field: { relation: 'orders', column: 'customer_state' }, operator: 'in', values: ['SP', 'RJ'].map((value): Literal => ({ value, source: 'question', text: value, start: states.indexOf(value), end: states.indexOf(value) + 2 })) }] } });
  const interpretation = { id: 'r_0', plan, summary: '', parts: [], probability: null };
  await assert.rejects(runInterpretation(states, interpretation, compile(plan, schema, states), { offerId: null, alternatives: [], trace: [], usage: { input_tokens: 0, output_tokens: 0, cost: 0 }, start: 0 }), AnalysisNotApplicableError);
});

const change = (overrides: Partial<PeriodChangePlan>): PeriodChangePlan => ({
  kind: 'period_change', from: 'items', joins: [], where: { connector: 'and', predicates: [] },
  measure: { kind: 'aggregate', fn: 'sum', field: { relation: 'items', column: 'price' }, distinct: false },
  anchor: { relation: 'items', column: 'purchased_at' }, current: relativeLiteral('latest_month', schema.coverage), previous: null, groupBy: [], orderBy: null, limit: 100, ...overrides,
});
const itemSums = (start: string, end: string, group = '') => `SELECT ${group ? `${group} AS grp, ` : ''}sum(i.price::numeric) AS value FROM raw.items i JOIN raw.orders o USING (order_id)${group ? ' JOIN raw.products p USING (product_id) LEFT JOIN raw.category_translation t USING (product_category_name)' : ''} WHERE o.order_purchase_timestamp::timestamp >= '${start}' AND o.order_purchase_timestamp::timestamp < '${end}'${group ? ' GROUP BY 1' : ''}`;
const categorySql = "coalesce(t.product_category_name_english, p.product_category_name, 'unknown')";

test('period change without a group compares the latest complete month with the month before', async () => {
  await compare(change({}), `SELECT c.value AS cur, p.value AS prev, c.value - p.value AS change, (c.value - p.value) / p.value * 100 AS pct FROM (${itemSums('2018-08-01', '2018-09-01')}) c, (${itemSums('2018-07-01', '2018-08-01')}) p`);
});

test('period change by category ranks percent growth excluding tiny previous bases', async () => {
  const category = { kind: 'column' as const, field: { relation: 'items' as const, column: 'category' } };
  const joined = `SELECT coalesce(c.grp, p.grp) AS grp, c.value AS cur, p.value AS prev FROM (${itemSums('2018-08-01', '2018-09-01', categorySql)}) c FULL JOIN (${itemSums('2018-07-01', '2018-08-01', categorySql)}) p ON c.grp = p.grp`;
  const pct = 'CASE WHEN prev IS NULL OR prev = 0 THEN NULL ELSE (cur - prev) / prev * 100 END';
  await compare(change({ groupBy: [category], orderBy: 'pct_desc', limit: 10 }), `SELECT grp, cur, prev, cur - prev, ${pct} AS pct FROM (${joined}) j WHERE prev >= 0.05 * (SELECT max(prev) FROM (${joined}) m) ORDER BY pct DESC NULLS LAST, grp`);
  const run = (plan: Plan) => { const compiled = compile(plan, schema, ''); return importer.query(compiled.sql, compiled.values); };
  const listed = await run(change({ groupBy: [category], orderBy: 'change_desc' }));
  const guarded = await run(change({ groupBy: [category], orderBy: 'pct_desc' }));
  assert.ok(listed.rows.length > guarded.rows.length);
});

test('explicit years compare equal spans clipped to the complete-data window', async () => {
  const question = 'revenue 2018 vs 2017';
  const year = (text: string, value: string, upper: string): Literal => ({ value, source: 'question', text, start: question.indexOf(text), end: question.indexOf(text) + 4, upper });
  await compare(change({ current: year('2018', '2018-01-01', '2019-01-01'), previous: year('2017', '2017-01-01', '2018-01-01') }),
    `SELECT c.value AS cur, p.value AS prev, c.value - p.value AS change, (c.value - p.value) / p.value * 100 AS pct FROM (${itemSums('2018-01-01', '2018-09-01')}) c, (${itemSums('2017-01-01', '2017-09-01')}) p`, question);
  assert.throws(() => compile(change({ current: year('2017', '2017-01-01', '2018-01-01'), previous: null }), schema, question), /complete-data window/);
});

test('late-delivery column comparison counts orders delivered after the estimate', async () => {
  const late: SelectPlan = { kind: 'select', from: 'orders', select: [{ kind: 'aggregate', fn: 'count', field: null, distinct: false }], joins: [], where: { connector: 'and', predicates: [{ field: { relation: 'orders', column: 'delivered_at' }, operator: 'gt', other: { relation: 'orders', column: 'estimated_delivery_at' } }] }, groupBy: [], orderBy: null, limit: 100 };
  await compare(late, 'SELECT count(*) FROM raw.orders WHERE order_delivered_customer_date::timestamp > order_estimated_delivery_date::timestamp');
  assert.throws(() => compile({ ...late, where: { connector: 'and', predicates: [{ field: { relation: 'orders', column: 'delivered_at' }, operator: 'gt', other: { relation: 'orders', column: 'revenue' } }] } }, schema, ''), /two numeric or two date/);
});
