import assert from 'node:assert/strict';
import { test } from 'node:test';
import { answerMeterQuestion } from '../server/meter/answer-question.js';

test('expired meter context requests clarification without model calls', async () => {
  const before = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('Unexpected model request'); };
  try {
    const result = await answerMeterQuestion({ question: 'And yesterday?', contextId: 'f'.repeat(32) });
    assert.equal(result.status, 'clarify');
    assert.equal(result.usage.cost, 0);
    assert.equal(result.trace.length, 0);
  } finally { globalThis.fetch = before; }
});
