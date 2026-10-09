import { useEffect, useState } from 'react';
import { fetchDataset } from '../api/client';
import type { DatasetState } from '../types/state';

export function useDataset() {
  const [dataset, setDataset] = useState<DatasetState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setDataset({ status: 'loading' });
    fetchDataset(controller.signal)
      .then(data => { if (!controller.signal.aborted) setDataset({ status: 'ready', data }); })
      .catch(error => {
        if (!controller.signal.aborted) setDataset({ status: 'error', message: error instanceof Error ? error.message : 'อ่านข้อมูลไม่สำเร็จ' });
      });
    return () => controller.abort();
  }, [attempt]);

  return { dataset, reloadDataset: () => setAttempt(value => value + 1) };
}
