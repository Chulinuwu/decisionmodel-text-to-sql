import { useEffect, useRef, useState } from 'react';
import { fetchDataset, fetchExecute, fetchQuery } from '../api/client';
import type { Interpretation } from '../../shared/schema';
import type { DatasetState, QueryRequest, QueryState } from '../types/state';

const send = (request: QueryRequest, signal: AbortSignal) => request.kind === 'execute'
  ? fetchExecute(request.offerId, request.interpretation.id, signal)
  : fetchQuery(request.question, signal);

export function useExplorer() {
  const [dataset, setDataset] = useState<DatasetState>({ status: 'loading' });
  const [query, setQuery] = useState<QueryState>({ status: 'idle' });
  const [datasetAttempt, setDatasetAttempt] = useState(0);
  const activeQuery = useRef<AbortController | null>(null);
  const sequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    setDataset({ status: 'loading' });
    fetchDataset(controller.signal)
      .then(data => { if (!controller.signal.aborted) setDataset({ status: 'ready', data }); })
      .catch(error => {
        if (!controller.signal.aborted) setDataset({ status: 'error', message: error instanceof Error ? error.message : 'อ่านข้อมูลไม่สำเร็จ' });
      });
    return () => controller.abort();
  }, [datasetAttempt]);

  useEffect(() => () => activeQuery.current?.abort(), []);

  async function submit(request: QueryRequest) {
    activeQuery.current?.abort();
    const controller = new AbortController();
    activeQuery.current = controller;
    setQuery({ status: 'loading', request });
    try {
      const response = await send(request, controller.signal);
      if (!controller.signal.aborted) setQuery({ status: 'done', request, response, id: ++sequence.current });
    } catch (error) {
      if (!controller.signal.aborted) setQuery({ status: 'error', request, message: error instanceof Error ? error.message : 'ค้นหาข้อมูลไม่สำเร็จ' });
    } finally {
      if (activeQuery.current === controller) activeQuery.current = null;
    }
  }

  function cancel() {
    activeQuery.current?.abort();
    activeQuery.current = null;
    setQuery(current => current.status === 'loading' ? { status: 'cancelled', request: current.request } : current);
  }

  return {
    dataset, query, cancel, retry: submit,
    run: (question: string) => submit({ kind: 'question', question }),
    execute: (question: string, offerId: string, interpretation: Interpretation) => submit({ kind: 'execute', question, offerId, interpretation }),
    reloadDataset: () => setDatasetAttempt(value => value + 1),
  };
}
