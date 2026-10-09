import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MeterContextStore } from '../server/meter/context-store.js';
import { config } from '../server/config.js';
import type { MeterConversation } from '../shared/meter-api.js';

test('meter context is immutable, bounded and expires', () => {
  let now = 0;
  const store = new MeterContextStore(() => now);
  const value: MeterConversation = { datasetFingerprint: 'test', context: { asOf: '2026-10-09T05:00:00Z', timezone: 'Asia/Bangkok' },
    plan: { intent: 'total', period: 'today', resource: 'DI Water', building: null, floor: 3, limit: 10, staleMinutes: 60 } };
  const id = store.save(value);
  value.plan.floor = 5;
  assert.equal(store.get(id)?.plan.floor, 3);
  const copy = store.get(id)!; copy.plan.floor = 9;
  assert.equal(store.get(id)?.plan.floor, 3);
  for (let i = 0; i < config.offerLimit; i++) store.save(value);
  assert.equal(store.get(id), null);
  const fresh = store.save(value);
  now += config.offerTtlMs;
  assert.equal(store.get(fresh), null);
});
