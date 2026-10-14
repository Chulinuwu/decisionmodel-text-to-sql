import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { allowedHosts, parseEnv } from '../server/env.js';

test('allowed hosts default to localhost and the bind host, accept a list, and * disables the allowlist', () => {
  assert.deepEqual(allowedHosts(undefined, '127.0.0.1', 4317), ['localhost:4317', '127.0.0.1:4317']);
  assert.deepEqual(allowedHosts('', '0.0.0.0', 80), ['localhost:80', '0.0.0.0:80']);
  assert.deepEqual(allowedHosts(' Example.com , localhost:4391 ', '0.0.0.0', 4317), ['example.com', 'localhost:4391']);
  assert.equal(allowedHosts('*', '0.0.0.0', 4317), null);
});

test('a decisions override is opt-in, validated, and plain HTTP is limited to loopback', () => {
  const ok = (source: NodeJS.ProcessEnv) => { const result = parseEnv(source); assert.ok(result.success); return result.data; };
  assert.equal(ok({}).DECISIONS_URL, undefined);
  ok({ DECISIONS_URL: 'http://127.0.0.1:8790/decisions', DECISIONS_MODEL: 'local/d1-omni-600m', DECISIONS_KEY: 'k' });
  ok({ DECISIONS_URL: 'http://[::1]:8790/decisions' });
  ok({ DECISIONS_URL: 'https://decisions.example.com/v1' });
  for (const invalid of [
    { DECISIONS_URL: 'http://192.168.1.5:8790/decisions' }, { DECISIONS_URL: 'not a url' }, { DECISIONS_URL: 'ftp://localhost/x' },
    { DECISIONS_MODEL: 'local/m' }, { DECISIONS_KEY: 'k' }, { DECISIONS_URL: 'http://localhost:8790/decisions', DECISIONS_MODEL: ' ' },
  ]) assert.equal(parseEnv(invalid).success, false, JSON.stringify(invalid));
});

test('an overridden endpoint gets its own model and key, never COPILOT_API_KEY, and wide choices are not split', () => {
  const script = `
    const { decide } = await import('./server/decisions-client.ts');
    const seen = [];
    globalThis.fetch = async (url, init) => { const body = JSON.parse(init.body); seen.push({ url, headers: init.headers, model: body.model, options: Object.keys(body.questions.q.criteria).length });
      return Response.json({ model: body.model, answers: { q: { type: 'choice', choice: 'o0', probabilities: { o0: 1 } } }, usage: { input_tokens: 1, output_tokens: 0 } }); };
    const criteria = Object.fromEntries(Array.from({ length: 60 }, (_, index) => ['o' + index, 'option ' + index]));
    await decide('s', { q: { type: 'choice', instructions: 'Pick', criteria } });
    console.log(JSON.stringify({ calls: seen.length, ...seen[0] }));`;
  const run = (extra: Record<string, string>) => JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', script], {
    env: { PATH: process.env.PATH, COPILOT_API_KEY: 'secret-copilot', DECISIONS_URL: 'http://localhost:8790/decisions', DECISIONS_MODEL: 'local/m', ...extra },
    encoding: 'utf8',
  }).trim().split('\n').at(-1)!);
  assert.deepEqual(run({}), { calls: 1, url: 'http://localhost:8790/decisions', headers: { 'Content-Type': 'application/json' }, model: 'local/m', options: 60 });
  assert.equal(run({ DECISIONS_KEY: 'local-key' }).headers.Authorization, 'Bearer local-key');
});
