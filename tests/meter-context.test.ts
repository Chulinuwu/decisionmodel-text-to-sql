import assert from 'node:assert/strict';
import { test } from 'node:test';
import { MeterContextStore, continueMeterConversation } from '../server/meter/context-store.js';
import { config } from '../server/config.js';
import type { MeterConversation, MeterDataset } from '../shared/meter-api.js';

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

test('expired, unknown or other-clock meter context restarts the conversation instead of blocking', () => {
  let now = 0;
  const store = new MeterContextStore(() => now);
  const context = { asOf: '2026-10-09T05:00:00Z', timezone: 'Asia/Bangkok' as const };
  const dataset: MeterDataset = { context, resources: [], buildings: [], floors: [], synthetic: true, fingerprint: 'test' };
  const id = store.save({ datasetFingerprint: 'test', context, plan: { intent: 'total', period: 'today', resource: null, building: null, floor: null, limit: 10, staleMinutes: 60 } });
  assert.deepEqual(continueMeterConversation(store, undefined, dataset), { previous: null, contextReset: false });
  assert.equal(continueMeterConversation(store, id, dataset).contextReset, false);
  assert.equal(continueMeterConversation(store, id, { ...dataset, fingerprint: 'other' }).contextReset, true);
  assert.equal(continueMeterConversation(store, 'f'.repeat(32), dataset).contextReset, true);
  now += config.offerTtlMs;
  assert.deepEqual(continueMeterConversation(store, id, dataset), { previous: null, contextReset: true });
});
