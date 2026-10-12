import assert from 'node:assert/strict';
import { once } from 'node:events';
import { request } from 'node:http';
import { test } from 'node:test';
import { browseRelations } from '../server/browse/browse-config.js';
import { browseRelation } from '../server/browse/browse-relation.js';
import { config } from '../server/config.js';
import { createApp } from '../server/http/app.js';
import type { BrowsePage } from '../shared/schema.js';

test('the browse allowlist holds exactly the expected qualified relations', () => {
  assert.deepEqual(browseRelations, {
    'brazilian-ecommerce': {
      orders: 'analytics."orders"', items: 'analytics."items"', customers: 'analytics."customers"', products: 'analytics."products"',
      sellers: 'analytics."sellers"', payments: 'analytics."payments"', reviews: 'analytics."reviews"',
      geolocation: 'analytics."geolocation"', category_translation: 'analytics."category_translation"',
    },
    'synthetic-meters': { meters: 'metering.meters', readings: 'metering.readings' },
  });
  assert.equal(browseRelation('brazilian-ecommerce', 'constructor'), undefined);
  assert.equal(browseRelation('__proto__', 'orders'), undefined);
  assert.equal(browseRelation('synthetic-meters', 'fixture_manifest'), undefined);
});

test('rows endpoint resolves tables through the allowlist and validates the page', async () => {
  const calls: { relation: string; page: BrowsePage }[] = [];
  const unused = async () => { throw new Error('Not used'); };
  const server = createApp({
    answerQuestion: unused, executeInterpretation: unused, datasetInfo: unused,
    tableRows: async (relation, page) => {
      calls.push({ relation, page });
      return { columns: ['id'], rows: [{ id: 'm1' }], ...page, hasMore: false };
    },
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const address = server.address();
    assert(address && typeof address !== 'string');
    const get = (path: string) => new Promise<{ status: number; body: unknown }>((resolve, reject) => {
      const call = request({ hostname: '127.0.0.1', port: address.port, path, headers: { host: `localhost:${config.port}` } }, response => {
        let text = '';
        response.setEncoding('utf8');
        response.on('data', chunk => { text += chunk; });
        response.on('end', () => resolve({ status: response.statusCode ?? 0, body: JSON.parse(text) }));
      });
      call.on('error', reject); call.end();
    });
    assert.equal((await get('/api/databases/brazilian-ecommerce/tables/raw.orders/rows')).status, 404);
    assert.equal((await get('/api/databases/unknown/tables/orders/rows')).status, 404);
    for (const query of ['limit=0', 'limit=101', 'limit=abc', 'offset=-1', 'offset=1.5', 'offset=1000001', 'extra=1']) {
      assert.equal((await get(`/api/databases/brazilian-ecommerce/tables/orders/rows?${query}`)).status, 400, query);
    }
    assert.equal(calls.length, 0);
    const reply = await get('/api/databases/synthetic-meters/tables/readings/rows?offset=100&limit=25');
    assert.equal(reply.status, 200);
    assert.deepEqual(reply.body, { columns: ['id'], rows: [{ id: 'm1' }], offset: 100, limit: 25, hasMore: false });
    await get('/api/databases/brazilian-ecommerce/tables/orders/rows');
    assert.deepEqual(calls, [
      { relation: 'metering.readings', page: { offset: 100, limit: 25 } },
      { relation: 'analytics."orders"', page: { offset: 0, limit: 50 } },
    ]);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});
