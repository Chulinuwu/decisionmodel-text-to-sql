import { test } from 'node:test';
import assert from 'node:assert/strict';
import { enumerateCombos } from '../server/planning/beam.js';
import type { Distributions } from '../server/planning/planning.types.js';

test('combos without a valid plan do not consume the combo budget', () => {
  const options = (count: number) => Array.from({ length: count }, (_, index) => ({ key: `o${index}`, p: 0.3 - index * 0.01 }));
  const distributions: Distributions = { a: options(3), b: options(3), c: options(3), d: options(3), e: options(3) };
  const valid = (combo: Record<string, string>) => combo.a === 'o2' && combo.b === 'o2' && combo.c === 'o2' && combo.d === 'o2';
  const result = enumerateCombos(distributions, combo => valid(combo) ? JSON.stringify(combo) : null);
  assert.ok(result.length >= 1);
  assert.ok(result.every(valid));
});

test('combos sharing a canonical key count once and come out best-first', () => {
  const distributions: Distributions = { a: [{ key: 'x', p: 0.6 }, { key: 'y', p: 0.4 }], b: [{ key: 'u', p: 0.7 }, { key: 'v', p: 0.3 }] };
  const result = enumerateCombos(distributions, combo => combo.a ?? null);
  assert.deepEqual(result, [{ a: 'x', b: 'u' }, { a: 'y', b: 'u' }]);
});
