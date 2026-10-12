import assert from 'node:assert/strict';
import { test } from 'node:test';
import { databases } from '../config/databases';
import { maxStoredThreads, threadStorageKey } from '../config/storage';
import { anomalyColumns, anomalyPlan, anomalyRows, answered } from '../test/fixtures';
import type { MeterResponse } from '../../shared/meter-api';
import type { ChatThreadRecord, MeterThreadRecord, ThreadRecord, ThreadStorage } from '../types/state';
import { isChatThread, loadThreads, saveThreads } from './thread-store';

const [chatDatabase, meterDatabase] = databases;
if (chatDatabase.engine !== 'chat' || meterDatabase.engine !== 'meter') throw new Error('Registry order changed');

const memory = (limit = Infinity) => {
  const items = new Map<string, string>();
  const storage: ThreadStorage = {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => { if (value.length > limit) throw new Error('QuotaExceededError'); items.set(key, value); },
  };
  return { storage, items };
};

const ok = answered(anomalyPlan, anomalyColumns, anomalyRows(true));
const clarify: MeterResponse = { status: 'clarify', message: 'Which building?', contextReset: false, question: 'q', trace: [], usage: { input_tokens: 0, output_tokens: 0, cost: 0 }, provider: '' };
const chatThread = (createdAt: number): ChatThreadRecord => ({ id: `chat-${createdAt}`, createdAt, database: chatDatabase, turns: [
  { id: 1, request: { kind: 'question', question: `question ${createdAt}` }, reply: { status: 'done', response: ok } },
] });

test('threads round-trip with their database, and pending or failed turns come back settled', () => {
  const { storage } = memory();
  const meter: MeterThreadRecord = { id: 'meter', createdAt: 2, database: meterDatabase, turns: [
    { id: 1, request: { kind: 'question', question: 'usage today' }, reply: { status: 'done', response: clarify } },
    { id: 2, request: { kind: 'question', question: 'and yesterday' }, reply: { status: 'loading' } },
  ] };
  const chat = chatThread(1);
  chat.turns.push({ id: 2, request: { kind: 'execute', question: 'picked', offerId: 'o', interpretation: ok.interpretation }, reply: { status: 'error', message: 'boom' } });
  const empty: ThreadRecord = { id: 'empty', createdAt: 3, database: chatDatabase, turns: [] };
  saveThreads([empty, meter, chat], storage);

  const loaded = loadThreads(storage);
  assert.deepEqual(loaded.map(thread => [thread.id, thread.database.id]), [['meter', meterDatabase.id], ['chat-1', chatDatabase.id]]);
  const [loadedMeter, loadedChat] = loaded;
  assert.ok(!isChatThread(loadedMeter) && isChatThread(loadedChat));
  assert.deepEqual(loadedMeter.turns.map(turn => turn.reply.status), ['done', 'cancelled']);
  assert.deepEqual(loadedMeter.turns[0].reply, { status: 'done', response: clarify });
  assert.deepEqual(loadedChat.turns.map(turn => [turn.request, turn.reply.status]), [[{ kind: 'question', question: 'question 1' }, 'done'], [{ kind: 'question', question: 'picked' }, 'error']]);
});

test('only the newest threads are kept, and quota failures drop the oldest until the payload fits', () => {
  const threads = Array.from({ length: maxStoredThreads + 5 }, (_, index) => chatThread(index));
  const capped = memory();
  saveThreads(threads, capped.storage);
  const kept = loadThreads(capped.storage);
  assert.equal(kept.length, maxStoredThreads);
  assert.equal(kept[0].createdAt, maxStoredThreads + 4);
  assert.equal(kept.at(-1)?.createdAt, 5);

  const tight = memory(JSON.stringify(JSON.parse(capped.items.get(threadStorageKey) ?? '[]').slice(0, 3)).length);
  saveThreads(threads, tight.storage);
  assert.deepEqual(loadThreads(tight.storage).map(thread => thread.createdAt), [maxStoredThreads + 4, maxStoredThreads + 3, maxStoredThreads + 2]);
});

test('missing, broken or foreign storage reads as no threads without throwing', () => {
  assert.deepEqual(loadThreads(undefined), []);
  assert.doesNotThrow(() => saveThreads([chatThread(1)], undefined));
  assert.deepEqual(loadThreads({ getItem: () => { throw new Error('denied'); }, setItem: () => {} }), []);
  assert.doesNotThrow(() => saveThreads([chatThread(1)], { getItem: () => null, setItem: () => { throw new Error('denied'); } }));
  const { storage } = memory();
  storage.setItem(threadStorageKey, '{not json');
  assert.deepEqual(loadThreads(storage), []);
  storage.setItem(threadStorageKey, JSON.stringify([{ id: 'x', createdAt: 1, databaseId: 'gone', turns: [{ question: 'q', status: 'cancelled' }] }, { id: 'y' }]));
  assert.deepEqual(loadThreads(storage), []);
});
