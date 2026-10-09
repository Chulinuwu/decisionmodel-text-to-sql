import assert from 'node:assert/strict';
import { mock, test } from 'node:test';
import { answerMeterQuestion, meterConversations } from '../server/meter/answer-question.js';
import { pool } from '../server/db-client.js';
import { meterCatalog } from '../server/meter/data-fixture.js';

const asOf = '2026-10-09T05:00:00.000Z';
const fingerprint = 'a'.repeat(64);
const client = {
  query: async (sql: string) => ({ rows: sql.includes('fixture_manifest') ? [{ as_of: asOf, provenance: {}, fingerprint }] : sql.includes('metering.meters') ? meterCatalog : [] }),
  release: () => {},
};

test('expired or unknown meter context restarts the conversation instead of blocking, without model calls', async () => {
  const connect = mock.method(pool, 'connect', async () => client);
  const fetch = mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected model request'); });
  try {
    const unknown = await answerMeterQuestion({ question: 'Delete all meter data', contextId: 'f'.repeat(32) });
    assert.equal(unknown.contextReset, true);
    assert.equal(unknown.status, 'clarify');
    assert.equal(unknown.usage.cost, 0);
    const contextId = meterConversations.save({ datasetFingerprint: fingerprint, context: { asOf, timezone: 'Asia/Bangkok' },
      plan: { intent: 'total', period: 'today', resource: null, building: null, floor: null, limit: 10, staleMinutes: 60 } });
    assert.equal((await answerMeterQuestion({ question: 'Delete all meter data', contextId })).contextReset, false);
    assert.equal(fetch.mock.callCount(), 0);
  } finally {
    connect.mock.restore();
    fetch.mock.restore();
  }
});
