import { useEffect, useState } from 'react';
import { defaultDatabase, findDatabase } from '../config/databases';
import { databaseStorageKey } from '../config/storage';
import type { DatabaseEntry } from '../types/database';
import type { ThreadRecord } from '../types/state';
import { readStored, writeStored } from '../utils/storage';
import { createThread, loadThreads, saveThreads } from '../utils/thread-store';

// The connected database is always the active thread's database, so connecting means starting a thread bound to it.
export function useWorkspace() {
  const [threads, setThreads] = useState(() => [createThread(findDatabase(readStored(databaseStorageKey)) ?? defaultDatabase), ...loadThreads()]);
  const [activeId, setActiveId] = useState(() => threads[0].id);
  const active = threads.find(thread => thread.id === activeId) ?? threads[0];

  useEffect(() => saveThreads(threads), [threads]);
  useEffect(() => writeStored(databaseStorageKey, active.database.id), [active.database.id]);

  // An untouched empty thread is dropped as soon as the user moves elsewhere, so the list only holds real chats.
  const keep = (thread: ThreadRecord, id: string) => thread.turns.length > 0 || thread.id === id;

  function connect(database: DatabaseEntry) {
    const fresh = createThread(database);
    setThreads(current => [fresh, ...current.filter(thread => keep(thread, fresh.id))]);
    setActiveId(fresh.id);
  }

  return {
    threads, active, connect,
    newChat: () => connect(active.database),
    open: (id: string) => { setThreads(current => current.filter(thread => keep(thread, id))); setActiveId(id); },
    update: (next: ThreadRecord) => setThreads(current => current.map(thread => thread.id === next.id ? next : thread)),
  };
}
