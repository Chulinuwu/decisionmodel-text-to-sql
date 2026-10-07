import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateLiteralCoverage } from '../server/literal-coverage.js';
import type { DatabaseSchema, Literal, SelectPlan } from '../shared/query-schema.js';
const schema: DatabaseSchema = { edges: [], coverage: { start: '2017-01-01', end: '2018-09-01' }, relations: [
  { name: 'payments', grain: 'payment record', description: 'Payments', columns: [{ name: 'payment_type', type: 'text', nullable: false, description: 'Payment type', values: ['credit_card', 'boleto', 'TO'] }] },
  { name: 'products', grain: 'product', description: 'Products', columns: [{ name: 'product_category_name', type: 'text', nullable: true, description: 'Category', values: ['beleza_saude'] }] },
] };
const plan: SelectPlan = { kind: 'select', from: 'payments', select: [{ kind: 'aggregate', fn: 'avg', field: { relation: 'payments', column: 'payment_installments' }, distinct: false }], where: { connector: 'and', predicates: [] }, joins: [], groupBy: [], orderBy: null, limit: 100 };
const dataset = (value: string): Literal => ({ value, source: 'dataset', text: value, start: null, end: null });
const field = { relation: 'payments' as const, column: 'payment_type' };
const withPredicates = (predicates: SelectPlan['where']['predicates']): SelectPlan => ({ ...plan, where: { connector: 'and', predicates } });
test('explicit dataset value cannot be silently omitted', () => {
  assert.deepEqual(validateLiteralCoverage('Average installments for credit_card payments', plan, schema), ['credit_card']);
  assert.deepEqual(validateLiteralCoverage('Average installments for credit_card payments', withPredicates([{ field, operator: 'eq', value: dataset('credit_card') }]), schema), []);
  assert.deepEqual(validateLiteralCoverage('Average installments across payments', plan, schema), []);
});
test('quoted unknown constants also require consumption and tokens do not match inside words', () => {
  assert.deepEqual(validateLiteralCoverage('Payments in "a new value"', plan, schema), ['a new value']);
  assert.deepEqual(validateLiteralCoverage('Payments for credit_cardholder', plan, schema), []);
});
test('upper-case codes match case-sensitively so ordinary words are not treated as values', () => {
  assert.deepEqual(validateLiteralCoverage('Payments sent to customers', plan, schema), []);
  assert.deepEqual(validateLiteralCoverage('Payments in TO', plan, schema), ['to']);
});
test('IN lists consume every listed value', () => {
  assert.deepEqual(validateLiteralCoverage('credit_card or boleto payments', withPredicates([{ field, operator: 'in', values: [dataset('credit_card'), dataset('boleto')] }]), schema), []);
  assert.deepEqual(validateLiteralCoverage('credit_card or boleto payments', withPredicates([{ field, operator: 'eq', value: dataset('credit_card') }]), schema), ['boleto']);
});
test('repeated explicit values require separately consumed predicates; quotes do not double count', () => {
  const single = withPredicates([{ field, operator: 'eq', value: dataset('credit_card') }]);
  assert.deepEqual(validateLiteralCoverage('credit_card on this field and credit_card on another field', single, schema), ['credit_card']);
  assert.deepEqual(validateLiteralCoverage('Only "credit_card" payments', single, schema), []);
});
test('a mentioned value the plan root cannot reach is still unanswered', () => {
  assert.deepEqual(validateLiteralCoverage('Average installments for beleza_saude', plan, schema), ['beleza_saude']);
});
test('spans the model confidently marked as not a filter are waived', () => {
  const question = 'Average installments for credit_card payments';
  const start = question.indexOf('credit_card');
  assert.deepEqual(validateLiteralCoverage(question, plan, schema, [{ start, end: start + 'credit_card'.length }]), []);
});
