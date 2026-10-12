import { findDatabase } from '../config/databases';
import { maxStoredThreads, threadStorageKey } from '../config/storage';
import type { MeterResponse } from '../../shared/meter-api';
import type { QueryResponse } from '../../shared/schema';
import type { DatabaseEntry } from '../types/database';
import type { ChatThreadRecord, QuestionRequest, StoredThread, StoredTurn, ThreadRecord, ThreadStorage, Turn } from '../types/state';
import { browserStorage, readStored } from './storage';

type AnyTurn = Turn<{ question: string }, QueryResponse | MeterResponse>;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

export const isChatThread = (thread: ThreadRecord): thread is ChatThreadRecord => thread.database.engine === 'chat';

// A pending request does not survive a reload or a thread switch, so it reads as cancelled.
export function settleTurn<Request extends { question: string }, Response>(turn: Turn<Request, Response>): Turn<Request, Response> {
  return turn.reply.status === 'loading' ? { ...turn, reply: { status: 'cancelled' } } : turn;
}

export function createThread(database: DatabaseEntry): ThreadRecord {
  const base = { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now() };
  return database.engine === 'chat' ? { ...base, database, turns: [] } : { ...base, database, turns: [] };
}

function toStoredTurn({ request: { question }, reply }: AnyTurn): StoredTurn<QueryResponse | MeterResponse> {
  if (reply.status === 'done') return { question, status: 'done', response: reply.response };
  return { question, status: reply.status === 'error' ? 'error' : 'cancelled' };
}

function toStoredThread(thread: ThreadRecord): StoredThread {
  const turns: AnyTurn[] = thread.turns;
  return { id: thread.id, createdAt: thread.createdAt, databaseId: thread.database.id, turns: turns.map(toStoredTurn) };
}

const isStoredTurn = (value: unknown) => isRecord(value) && typeof value.question === 'string'
  && (value.status === 'error' || value.status === 'cancelled' || (value.status === 'done' && isRecord(value.response)));

function fromStoredTurns<Response>(turns: StoredTurn<Response>[]) {
  return turns.map(({ question, status, response }, index): Turn<QuestionRequest, Response> => ({
    id: index + 1,
    request: { kind: 'question', question },
    reply: status === 'done' && response !== undefined ? { status, response }
      : status === 'error' ? { status, message: 'ค้นหาข้อมูลไม่สำเร็จ' } : { status: 'cancelled' },
  }));
}

function hydrateThread(value: unknown): ThreadRecord[] {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.createdAt !== 'number' || !Array.isArray(value.turns)) return [];
  const database = findDatabase(typeof value.databaseId === 'string' ? value.databaseId : null);
  // Responses were written by saveThreads from API payloads, which the client already trusts unvalidated, so only the envelope is checked.
  const turns = value.turns.filter(isStoredTurn);
  if (!database || turns.length === 0) return [];
  const base = { id: value.id, createdAt: value.createdAt };
  return [database.engine === 'chat'
    ? { ...base, database, turns: fromStoredTurns<QueryResponse>(turns) }
    : { ...base, database, turns: fromStoredTurns<MeterResponse>(turns) }];
}

export function loadThreads(storage = browserStorage()): ThreadRecord[] {
  try {
    const parsed: unknown = JSON.parse(readStored(threadStorageKey, storage) ?? '[]');
    return Array.isArray(parsed) ? parsed.flatMap(hydrateThread) : [];
  } catch { return []; }
}

export function saveThreads(threads: ThreadRecord[], storage: ThreadStorage | undefined = browserStorage()) {
  if (!storage) return;
  let stored = threads.filter(thread => thread.turns.length > 0)
    .sort((a, b) => b.createdAt - a.createdAt).slice(0, maxStoredThreads).map(toStoredThread);
  // Drop the oldest threads until the payload fits the storage quota.
  for (;;) {
    try { storage.setItem(threadStorageKey, JSON.stringify(stored)); return; } catch {
      if (stored.length === 0) return;
      stored = stored.slice(0, -1);
    }
  }
}
