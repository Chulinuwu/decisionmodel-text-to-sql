import { useEffect, useRef, useState } from 'react';
import { fetchDataset } from '../api/client';
import { databases } from '../config/databases';
import { fetchMeterDataset } from '../meter/client';
import type { DatabaseDetail, DatabaseDetailState, DatabaseEntry } from '../types/database';

const load = (database: DatabaseEntry, signal: AbortSignal) => database.engine === 'chat'
  ? fetchDataset(database.endpoints.detail, signal).then((info): DatabaseDetail => ({ engine: 'chat', info }))
  : fetchMeterDataset(database.endpoints.detail, signal).then((info): DatabaseDetail => ({ engine: 'meter', info }));

// Every registered database is probed up front so the sidebar can show a status dot for each one.
export function useDatabaseDetails() {
  const [details, setDetails] = useState<Partial<Record<string, DatabaseDetailState>>>({});
  const controllers = useRef(new Map<string, AbortController>());

  function reload(database: DatabaseEntry) {
    controllers.current.get(database.id)?.abort();
    const controller = new AbortController();
    controllers.current.set(database.id, controller);
    const put = (state: DatabaseDetailState) => { if (!controller.signal.aborted) setDetails(current => ({ ...current, [database.id]: state })); };
    put({ status: 'loading' });
    load(database, controller.signal).then(
      data => put({ status: 'ready', data }),
      error => put({ status: 'error', message: error instanceof Error ? error.message : 'อ่านข้อมูลไม่สำเร็จ' }),
    );
  }

  useEffect(() => {
    databases.forEach(reload);
    const running = controllers.current;
    return () => running.forEach(controller => controller.abort());
  }, []);

  return { detailOf: (id: string): DatabaseDetailState => details[id] ?? { status: 'loading' }, reload };
}
