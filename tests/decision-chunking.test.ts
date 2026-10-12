import { test } from 'node:test';
import assert from 'node:assert/strict';
import { finalRound, mergeAnswers, splitWideChoices } from '../server/decision-chunking.js';
import type { Question } from '../server/decision-schema.js';

const criteria = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`o${i}`, `option ${i}`]));

test('wide choice questions split into gateway-sized parts and a finalist round', () => {
  const questions: Record<string, Question> = { wide: { type: 'choice', instructions: 'pick', criteria: criteria(40) }, small: { type: 'choice', instructions: 'pick', criteria: criteria(3) } };
  const { split, wide } = splitWideChoices(questions, 37);
  assert.deepEqual(Object.keys(split).sort(), ['small', 'wide__part0', 'wide__part1']);
  assert.ok(Object.values(split).every(q => Object.keys(q.criteria).length <= 37));
  const first = {
    small: { type: 'choice' as const, choice: 'o1', probabilities: { o1: 1 } },
    wide__part0: { type: 'choice' as const, choice: 'o3', probabilities: { o3: 0.7, o1: 0.2, o0: 0.1 } },
    wide__part1: { type: 'choice' as const, choice: 'o30', probabilities: { o30: 0.9, o21: 0.1 } },
  };
  const final = finalRound(questions, wide, first, 2);
  assert.deepEqual(Object.keys(final.wide?.criteria ?? {}), ['o3', 'o1', 'o30', 'o21']);
  const merged = mergeAnswers(first, wide, { wide: { type: 'choice', choice: 'o30', probabilities: { o30: 0.6, o3: 0.4 } } });
  assert.deepEqual(Object.keys(merged).sort(), ['small', 'wide']);
});