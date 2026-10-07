import assert from 'node:assert/strict';
import test from 'node:test';
import { compile } from '../server/compiler.js';
import { literalCandidates } from '../server/literal-candidates.js';
import { queryPlanSchema, type DatabaseSchema, type Expression, type Literal, type Plan, type SelectPlan } from '../shared/query-schema.js';

const schema: DatabaseSchema = {
  relations: [
    { name: 'orders', description: '', grain: 'One row per order', columns: [
      { name: 'order_id', type: 'text', nullable: false, description: '', values: [] },
      { name: 'customer_city', type: 'text', nullable: true, description: '', values: [] },
      { name: 'purchased_at', type: 'timestamp', nullable: false, description: '', values: [] },
      { name: 'payment_total', type: 'number', nullable: true, description: '', values: [] },
    ] },
    { name: 'items', description: '', grain: 'One row per item', columns: [
      { name: 'order_id', type: 'text', nullable: false, description: '', values: [] },
      { name: 'price', type: 'number', nullable: false, description: '', values: [] },
      { name: 'freight_value', type: 'number', nullable: false, description: '', values: [] },
    ] },
    { name: 'geolocation', description: '', grain: 'One row per observation', columns: [
      { name: 'geolocation_city', type: 'text', nullable: false, description: '', values: [] },
    ] },
  ],
  edges: [{ id: 'items_orders', from: 'items', to: 'orders', fromColumn: 'order_id', toColumn: 'order_id', cardinality: 'many-to-one' }],
  coverage: { start: '2017-01-01', end: '2018-09-01' },
};
const count: Expression = { kind: 'aggregate', fn: 'count', field: null, distinct: false };
const city: Expression = { kind: 'column', field: { relation: 'orders', column: 'customer_city' } };
const plan = (overrides: Partial<SelectPlan> = {}): SelectPlan => ({ kind: 'select', from: 'orders', select: [count], joins: [], where: { connector: 'and', predicates: [] }, groupBy: [], orderBy: null, limit: 100, ...overrides });
const literal = (question: string, text: string, value: string | number = text): Literal => ({ source: 'question', text, value, start: question.indexOf(text), end: question.indexOf(text) + text.length });

test('SQL injection remains a bound literal and limit includes one truncation sentinel', () => {
  const attack = "x'); DROP TABLE raw.orders; --";
  const question = `City equals "${attack}"`;
  const compiled = compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'eq', value: literal(question, attack) }] } }), schema, question);
  assert.deepEqual(compiled.values, [attack, 101]);
  assert.ok(!compiled.sql.includes(attack));
  assert.match(compiled.sql, /"orders"\."customer_city" = \$1/);
});

test('substring predicates escape SQL wildcard characters', () => {
  const question = 'City contains "50%_\\"';
  const compiled = compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'contains', value: literal(question, '50%_\\') }] } }), schema, question);
  assert.equal(compiled.values[0], '%50\\%\\_\\\\%');
});

test('unknown schema fields and injected identifiers are rejected', () => {
  assert.throws(() => compile(plan({ select: [{ kind: 'column', field: { relation: 'orders', column: 'missing' } }] }), schema, ''), /Unknown schema field/);
  assert.throws(() => compile(plan({ select: [{ kind: 'column', field: { relation: 'orders', column: 'order_id;drop' } }] }), schema, ''));
});

test('declared joins must exactly match the connected required path', () => {
  assert.throws(() => compile(plan({ kind: 'select', from: 'items', select: [city] }), schema, ''), /Join paths/);
  assert.throws(() => compile(plan({ joins: ['items_orders'] }), schema, ''), /Join paths/);
  assert.throws(() => compile(plan({ select: [{ kind: 'column', field: { relation: 'geolocation', column: 'geolocation_city' } }] }), schema, ''), /No declared many-to-one/);
});

test('SUM and AVG of parent measures cannot be repeated at child grain', () => {
  for (const fn of ['sum', 'avg'] as const) assert.throws(() => compile(plan({ kind: 'select', from: 'items', joins: ['items_orders'], select: [{ kind: 'aggregate', fn, field: { relation: 'orders', column: 'payment_total' }, distinct: false }] }), schema, ''), /parent measure/);
});

test('aggregate grouping and ungrouped projections or ordering are rejected', () => {
  assert.throws(() => compile(plan({ groupBy: [count] }), schema, ''), /Cannot group by aggregate/);
  assert.throws(() => compile(plan({ select: [count, city] }), schema, ''), /must be grouped/);
  assert.throws(() => compile(plan({ orderBy: { expression: city, direction: 'asc' } }), schema, ''), /ungrouped/);
});

test('invalid aggregate types, COUNT DISTINCT star and text time buckets fail closed', () => {
  assert.throws(() => compile(plan({ select: [{ kind: 'aggregate', fn: 'sum', field: city.field, distinct: false }] }), schema, ''), /numeric/);
  assert.throws(() => compile(plan({ select: [{ kind: 'aggregate', fn: 'count', field: null, distinct: true }] }), schema, ''), /COUNT/);
  assert.throws(() => compile(plan({ select: [{ kind: 'bucket', field: city.field, unit: 'month' }] }), schema, ''), /date column/);
});

test('invented values and forged question spans are rejected', () => {
  const question = 'City equals "Sao Paulo"';
  for (const value of [{ ...literal(question, 'Sao Paulo'), value: 'Rio' }, { ...literal(question, 'Sao Paulo'), start: 0 }]) assert.throws(() => compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'eq', value }] } }), schema, question), /grounded|provenance/);
});

test('invalid date and interval bounds are rejected rather than rolled forward', () => {
  const field = { relation: 'orders', column: 'purchased_at' } as const;
  const question = 'Orders in 2017-02-30';
  assert.throws(() => compile(plan({ where: { connector: 'and', predicates: [{ field, operator: 'period', value: { ...literal(question, '2017-02-30'), upper: '2017-03-03' } }] } }), schema, question), /grounded/);
  const valid = 'Orders in 2017';
  assert.throws(() => compile(plan({ where: { connector: 'and', predicates: [{ field, operator: 'period', value: { ...literal(valid, '2017', '2017-01-01'), upper: '2019-01-01' } }] } }), schema, valid), /grounded/);
});

test('year periods use exact half-open bounds; comparison does not approximate a year', () => {
  const question = 'Orders in 2017';
  const field = { relation: 'orders', column: 'purchased_at' } as const;
  const value = { ...literal(question, '2017', '2017-01-01'), upper: '2018-01-01' };
  const compiled = compile(plan({ where: { connector: 'and', predicates: [{ field, operator: 'period', value }] } }), schema, question);
  assert.deepEqual(compiled.values, ['2017-01-01', '2018-01-01', 101]);
  assert.match(compiled.sql, />= \$1::timestamp AND .* < \$2::timestamp/);
  assert.throws(() => compile(plan({ where: { connector: 'and', predicates: [{ field, operator: 'gt', value }] } }), schema, question), /explicit ISO day/);
});

test('NULL operators reject literal values and non-NULL operators require them', () => {
  const where = (predicate: unknown) => queryPlanSchema.safeParse({ ...plan(), where: { connector: 'and', predicates: [predicate] } }).success;
  assert.equal(where({ field: city.field, operator: 'is_null', value: literal('SP', 'SP') }), false);
  assert.equal(where({ field: city.field, operator: 'eq', value: null }), false);
  assert.equal(where({ field: city.field, operator: 'eq' }), false);
  assert.match(compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'is_null' }] } }), schema, '').sql, /"orders"\."customer_city" IS NULL/);
});

test('IN and NOT IN bind every grounded value and require at least two values', () => {
  const question = 'Orders in city "Rio" or "Lima"';
  const values = [literal(question, 'Rio'), literal(question, 'Lima')];
  const included = compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'in', values }] } }), schema, question);
  assert.match(included.sql, /"orders"\."customer_city" IN \(\$1, \$2\)/);
  assert.deepEqual(included.values, ['Rio', 'Lima', 101]);
  const excluded = compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'not_in', values }] } }), schema, question);
  assert.match(excluded.sql, /NOT IN \(\$1, \$2\)/);
  assert.throws(() => compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'in', values: [values[0], { ...values[1], value: 'Paris' }] }] } }), schema, question), /grounded/);
  assert.throws(() => compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'in', values: [values[0]] }] } }), schema, question));
  assert.throws(() => compile(plan({ where: { connector: 'and', predicates: [{ field: { relation: 'orders', column: 'purchased_at' }, operator: 'in', values }] } }), schema, question), /IN lists/);
});

test('non-distinct COUNT of a parent field from child grain is rejected; COUNT DISTINCT is allowed', () => {
  const field = { relation: 'orders' as const, column: 'order_id' };
  assert.throws(() => compile(plan({ kind: 'select', from: 'items', joins: ['items_orders'], select: [{ kind: 'aggregate', fn: 'count', field, distinct: false }] }), schema, ''), /COUNT DISTINCT/);
  assert.doesNotThrow(() => compile(plan({ kind: 'select', from: 'items', joins: ['items_orders'], select: [{ kind: 'aggregate', fn: 'count', field, distinct: true }] }), schema, ''));
});

test('dataset literals are validated field by field against the column values', () => {
  const states: DatabaseSchema = { ...schema, relations: schema.relations.map(relation => relation.name === 'orders' ? { ...relation, columns: relation.columns.map(column => column.name === 'customer_city' ? { ...column, values: ['Rio'] } : column) } : relation) };
  const rio: Literal = { value: 'Rio', source: 'dataset', text: 'Rio', start: null, end: null };
  assert.doesNotThrow(() => compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'eq', value: rio }] } }), states, 'any wording'));
  assert.doesNotThrow(() => compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'eq', value: { end: null, start: null, text: 'Rio', source: 'dataset', value: 'Rio' } }] } }), states, ''));
  assert.throws(() => compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'eq', value: { ...rio, value: 'Lima', text: 'Lima' } }] } }), states, ''), /grounded/);
  assert.throws(() => compile(plan({ where: { connector: 'and', predicates: [{ field: city.field, operator: 'eq', value: { ...rio, text: 'rio' } }] } }), states, ''), /grounded/);
});

test('unsupported operators and out-of-bound limits fail schema validation', () => {
  assert.equal(queryPlanSchema.safeParse({ ...plan(), limit: 0 }).success, false);
  assert.equal(queryPlanSchema.safeParse({ ...plan(), limit: 101 }).success, false);
  assert.equal(queryPlanSchema.safeParse({ ...plan(), where: { connector: 'and', predicates: [{ field: city.field, operator: 'eq;DROP', value: null }] } }).success, false);
});

test('literal candidates retain one semantic value across repeated spans and enum sources', () => {
  const values = literalCandidates('SP or SP', { name: 'state', type: 'text', nullable: false, description: '', values: ['SP'] });
  assert.equal(values.filter(value => value.value === 'SP').length, 1);
  assert.equal(values.find(value => value.value === 'SP')?.source, 'question');
});

test('equal numbers in separate spans preserve each local source span through compilation', () => {
  const question = 'Items with price greater than 20 and freight less than 20';
  const column = { name: 'price', type: 'number' as const, nullable: false, description: '', values: [] };
  const span = (start: number) => ({ start, end: start + 2 });
  const first = literalCandidates(question, column, span(question.indexOf('20'))).find(literal => literal.value === 20);
  const second = literalCandidates(question, column, span(question.lastIndexOf('20'))).find(literal => literal.value === 20);
  assert.ok(first);
  assert.ok(second);
  assert.equal(first.start, question.indexOf('20'));
  assert.equal(second.start, question.lastIndexOf('20'));
  const compiled = compile(plan({ kind: 'select', from: 'items', where: { connector: 'and', predicates: [
    { field: { relation: 'items', column: 'price' }, operator: 'gt', value: first },
    { field: { relation: 'items', column: 'freight_value' }, operator: 'lt', value: second },
  ] } }), schema, question);
  assert.deepEqual(compiled.values, [20, 20, 101]);
});

test('quoted text containing AND, OR and commas stays one literal', () => {
  const question = 'Cities named "rock and roll, or jazz" and price greater than 20';
  const column = { name: 'customer_city', type: 'text' as const, nullable: true, description: '', values: [] };
  const value = literalCandidates(question, column).find(literal => literal.value === 'rock and roll, or jazz');
  assert.ok(value);
  assert.equal(question.slice(value.start ?? 0, value.end ?? 0), 'rock and roll, or jazz');
});
