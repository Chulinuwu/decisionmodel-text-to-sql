import assert from 'node:assert/strict';
import { request as httpRequest, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { after, before, test } from 'node:test';
import { config } from '../server/config.js';
import { pool } from '../server/db-client.js';
import { createApp } from '../server/http/app.js';
import type { AppDependencies } from '../server/http/http.types.js';
import { executeInterpretation } from '../server/query/execute-interpretation.js';
import { offers } from '../server/query/offer-store.js';
import type { Plan } from '../shared/query-schema.js';
import type { DatasetInfo, Interpretation, QueryResponse } from '../shared/schema.js';

type Reply = { status: number; body: unknown };
type Options = { path: string; body?: string; headers?: Record<string, string> };

const localHeaders = { host: `localhost:${config.port}`, 'content-type': 'application/json' };
const unsupported = (question: string): QueryResponse => ({ status: 'unsupported', question, message: 'no', detail: 'no', trace: [], usage: { input_tokens: 0, output_tokens: 0, cost: 0 } });
let release: () => void = () => {};
let entered = 0;
const dependencies: AppDependencies = {
  async answerQuestion(question) {
    if (question === 'slow question') {
      entered++;
      await new Promise<void>(resolve => { release = resolve; });
    }
    if (question === 'timeout question') throw new DOMException('timed out', 'TimeoutError');
    return unsupported(question);
  },
  executeInterpretation,
  datasetInfo: () => Promise.reject(new Error('not used')),
};
let server: Server;
let port = 0;

function send({ path, body, headers = localHeaders }: Options): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const outgoing = httpRequest({ host: config.host, port, path, method: body === undefined ? 'GET' : 'POST', headers }, incoming => {
      let text = '';
      incoming.setEncoding('utf8');
      incoming.on('data', chunk => { text += chunk; });
      incoming.on('end', () => resolve({ status: incoming.statusCode ?? 0, body: text ? JSON.parse(text) : null }));
    });
    outgoing.on('error', reject);
    outgoing.end(body);
  });
}

const field = (body: unknown, key: string) => body && typeof body === 'object' && key in body ? Reflect.get(body, key) : undefined;
const countPlan = (distinctCustomers: boolean): Plan => ({
  kind: 'select', from: 'orders', joins: [], where: { connector: 'and', predicates: [] }, groupBy: [], orderBy: null, limit: 100,
  select: [{ kind: 'aggregate', fn: 'count', field: distinctCustomers ? { relation: 'orders', column: 'customer_unique_id' } : null, distinct: distinctCustomers }],
});
const reading = (id: string, plan: Plan): Interpretation => ({ id, plan, summary: id, parts: [], probability: 0.5 });

before(async () => {
  server = createApp(dependencies).listen(0, config.host);
  await new Promise(resolve => server.once('listening', resolve));
  const address: AddressInfo | string | null = server.address();
  port = address && typeof address === 'object' ? address.port : 0;
});
after(async () => { server.close(); await pool.end(); });

test('foreign Host is rejected before routing', async () => {
  const reply = await send({ path: '/api/query', body: JSON.stringify({ question: 'How many orders?' }), headers: { ...localHeaders, host: `evil.test:${config.port}` } });
  assert.equal(reply.status, 403);
});

test('foreign Origin is rejected', async () => {
  const reply = await send({ path: '/api/query', body: JSON.stringify({ question: 'How many orders?' }), headers: { ...localHeaders, origin: 'http://evil.test' } });
  assert.equal(reply.status, 403);
});

test('non-JSON bodies are rejected with 415', async () => {
  const reply = await send({ path: '/api/execute', body: 'offerId=x', headers: { ...localHeaders, 'content-type': 'text/plain' } });
  assert.equal(reply.status, 415);
});

test('malformed JSON returns a JSON error without a stack trace', async () => {
  const reply = await send({ path: '/api/query', body: '{"question":' });
  assert.equal(reply.status, 400);
  assert.ok(!JSON.stringify(reply.body).includes('at '));
});

test('a third concurrent request is rejected with 429 across endpoints', async () => {
  entered = 0;
  const first = send({ path: '/api/query', body: JSON.stringify({ question: 'slow question' }) });
  while (entered < 1) await new Promise(resolve => setImmediate(resolve));
  const releaseFirst = release;
  const second = send({ path: '/api/query', body: JSON.stringify({ question: 'slow question' }) });
  while (entered < 2) await new Promise(resolve => setImmediate(resolve));
  const third = await send({ path: '/api/execute', body: JSON.stringify({ offerId: '0'.repeat(32), interpretationId: 'r_0' }) });
  assert.equal(third.status, 429);
  releaseFirst();
  release();
  assert.deepEqual((await Promise.all([first, second])).map(reply => reply.status), [200, 200]);
});

test('timeouts map to 504 instead of a generic failure', async () => {
  const reply = await send({ path: '/api/query', body: JSON.stringify({ question: 'timeout question' }) });
  assert.equal(reply.status, 504);
});

test('execute rejects a client-supplied plan and an unknown offer', async () => {
  const withPlan = await send({ path: '/api/execute', body: JSON.stringify({ question: 'How many orders are there?', plan: countPlan(false) }) });
  assert.equal(withPlan.status, 400);
  const unknown = await send({ path: '/api/execute', body: JSON.stringify({ offerId: 'f'.repeat(32), interpretationId: 'r_0' }) });
  assert.equal(unknown.status, 404);
});

test('execute runs a stored interpretation and keeps the other readings of the same offer', async () => {
  const offerId = offers.save('How many orders are there?', [reading('r_0', countPlan(false)), reading('r_1', countPlan(true))]);
  const reply = await send({ path: '/api/execute', body: JSON.stringify({ offerId, interpretationId: 'r_1' }) });
  assert.equal(reply.status, 200);
  assert.equal(field(reply.body, 'status'), 'ok');
  assert.equal(field(reply.body, 'offerId'), offerId);
  assert.equal(field(reply.body, 'question'), 'How many orders are there?');
  assert.deepEqual(field(field(reply.body, 'interpretation'), 'id'), 'r_1');
  const alternatives = field(reply.body, 'alternatives');
  assert.ok(Array.isArray(alternatives));
  assert.deepEqual(alternatives.map(alternative => field(alternative, 'id')), ['r_0']);
  const rows = field(reply.body, 'rows');
  assert.ok(Array.isArray(rows) && rows.length === 1);
});
