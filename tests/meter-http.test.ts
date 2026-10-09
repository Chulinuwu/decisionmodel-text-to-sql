import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { request } from 'node:http';
import { createApp } from '../server/http/app.js';
import { config } from '../server/config.js';

test('meter HTTP validates requests and never accepts a client plan or clock', async () => {
  let calls = 0;
  const server = createApp({
    answerQuestion: async () => { throw new Error('Not used'); },
    executeInterpretation: async () => { throw new Error('Not used'); },
    datasetInfo: async () => { throw new Error('Not used'); },
    answerMeterQuestion: async ({ question }) => {
      calls++;
      return { status: 'clarify', question, message: 'Specify a meter.', trace: [], provider: '', contextReset: false,
        usage: { input_tokens: 0, output_tokens: 0, cost: 0 } };
    },
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert(address && typeof address !== 'string');
    const post = (body: unknown) => new Promise<{ status: number }>((resolve, reject) => {
      const call = request({ hostname: '127.0.0.1', port: address.port, path: '/api/meter/query', method: 'POST',
        headers: { host: `localhost:${config.port}`, 'Content-Type': 'application/json' } }, response => {
        response.resume(); response.on('end', () => resolve({ status: response.statusCode ?? 0 }));
      });
      call.on('error', reject); call.end(JSON.stringify(body));
    });
    for (const body of [{ question: 'Usage today', plan: {} }, { question: 'Usage today', asOf: '2026-10-09' },
      { question: 'Usage today', contextId: 'forged' }, { question: 'x'.repeat(601) }]) {
      assert.equal((await post(body)).status, 400);
    }
    assert.equal(calls, 0);
    assert.equal((await post({ question: 'Usage today' })).status, 200);
    assert.equal(calls, 1);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
