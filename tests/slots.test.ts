import { test } from 'node:test';
import assert from 'node:assert/strict';
import { literalCandidates } from '../server/literal-candidates.js';
import { extractSlots } from '../server/planning/slots.js';
import { buildCatalog } from '../server/planning/semantic-catalog.js';
import { fixtureSchema as schema } from './schema-fixture.js';

const date = { name: 'purchased_at', type: 'timestamp' as const, nullable: false, description: '', values: [] };
const kinds = (question: string) => extractSlots(question, schema, buildCatalog(schema)).map(slot => `${slot.kind}:${slot.text}`);

test('25xx is a Buddhist year only after a Thai year word', () => {
  assert.deepEqual(literalCandidates('price over 2500', date), []);
  assert.deepEqual(literalCandidates('ยอดขายปี 2560', date).map(literal => [literal.value, literal.upper]), [['2017-01-01', '2018-01-01']]);
  assert.deepEqual(literalCandidates('ยอดขาย พ.ศ. 2560', date).map(literal => literal.value), ['2017-01-01']);
});

test('numbers that look like years keep a number slot so the decision can bind a threshold', () => {
  assert.deepEqual(kinds('Items with price over 2500'), ['number:2500']);
  assert.deepEqual(kinds('Items with price over 2017'), ['period:2017', 'number:2017']);
  assert.deepEqual(kinds('Orders in 2017-05'), ['period:2017-05']);
});
