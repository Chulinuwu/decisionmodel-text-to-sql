import assert from 'node:assert/strict';
import { test } from 'node:test';
import { allowedHosts } from '../server/env.js';

test('allowed hosts default to localhost and the bind host, accept a list, and * disables the allowlist', () => {
  assert.deepEqual(allowedHosts(undefined, '127.0.0.1', 4317), ['localhost:4317', '127.0.0.1:4317']);
  assert.deepEqual(allowedHosts('', '0.0.0.0', 80), ['localhost:80', '0.0.0.0:80']);
  assert.deepEqual(allowedHosts(' Example.com , localhost:4391 ', '0.0.0.0', 4317), ['example.com', 'localhost:4391']);
  assert.equal(allowedHosts('*', '0.0.0.0', 4317), null);
});
