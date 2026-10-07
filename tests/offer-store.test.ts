import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createOfferStore } from '../server/query/offer-store.js';

test('offers expire after the TTL and the oldest entry is evicted at the limit', () => {
  let now = 0;
  const store = createOfferStore({ limit: 2, ttlMs: 100, now: () => now });
  const first = store.save('a', []);
  const second = store.save('b', []);
  assert.match(first, /^[a-f0-9]{32}$/);
  const third = store.save('c', []);
  assert.equal(store.find(first), undefined);
  assert.equal(store.find(second)?.question, 'b');
  assert.equal(store.size, 2);
  now = 150;
  assert.equal(store.find(third), undefined);
  store.save('d', []);
  assert.equal(store.size, 1);
});
