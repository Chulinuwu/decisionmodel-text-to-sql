import { useEffect, useState } from 'react';
import { browseRowLimits } from '../../shared/limits';
import { fetchTableRows } from '../api/client';
import type { TableRowsState } from '../types/database';

export function useTableRows(tablesUrl: string, table: string) {
  const [offset, setOffset] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<TableRowsState>({ status: 'loading' });

  // The cleanup abort covers fast paging, leaving the data view and closing the dialog alike.
  useEffect(() => {
    const controller = new AbortController();
    const put = (next: TableRowsState) => { if (!controller.signal.aborted) setState(next); };
    put({ status: 'loading' });
    fetchTableRows(tablesUrl, table, offset, controller.signal).then(
      page => put({ status: 'ready', page }),
      error => put({ status: 'error', message: error instanceof Error ? error.message : 'อ่านแถวข้อมูลไม่สำเร็จ' }),
    );
    return () => controller.abort();
  }, [tablesUrl, table, offset, attempt]);

  return {
    state,
    previous: () => setOffset(current => Math.max(0, current - browseRowLimits.default)),
    next: () => setOffset(current => current + browseRowLimits.default),
    retry: () => setAttempt(current => current + 1),
  };
}
