import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databases, defaultDatabase, findDatabase } from './databases';

test('registry resolves each database by id and rejects unknown or missing ids', () => {
  assert.equal(new Set(databases.map(database => database.id)).size, databases.length);
  for (const database of databases) assert.equal(findDatabase(database.id), database);
  assert.equal(findDatabase('unknown'), undefined);
  assert.equal(findDatabase(null), undefined);
  assert.equal(defaultDatabase.name, 'Brazilian E-Commerce');
  assert.deepEqual(databases.map(database => [database.engine, database.endpoints.detail]), [['chat', '/api/dataset'], ['meter', '/api/meter/dataset']]);
});
