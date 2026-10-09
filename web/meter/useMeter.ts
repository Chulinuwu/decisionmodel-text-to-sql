import { useEffect, useRef, useState } from 'react';
import type { MeterDataset, MeterResponse } from '../../shared/meter-api';
import { fetchMeterAnswer, fetchMeterDataset } from './client';

export function useMeter() {
  const [dataset, setDataset] = useState<MeterDataset | null>(null);
  const [response, setResponse] = useState<MeterResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const context = useRef<string | undefined>(undefined);
  const active = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetchMeterDataset(controller.signal).then(setDataset).catch(error => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Meter fixture unavailable.');
    });
    return () => { controller.abort(); active.current?.abort(); };
  }, []);
  function reset() {
    active.current?.abort(); active.current = null; context.current = undefined;
    setResponse(null); setLoading(false); setError('');
  }
  async function ask(question: string) {
    active.current?.abort();
    const controller = new AbortController(); active.current = controller;
    setLoading(true); setError('');
    try {
      const result = await fetchMeterAnswer(question, context.current, controller.signal);
      if (controller.signal.aborted) return;
      if (result.status === 'ok') context.current = result.contextId;
      setResponse(result);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Meter request failed.');
    } finally {
      if (active.current === controller) { active.current = null; setLoading(false); }
    }
  }
  return { dataset, response, error, loading, ask, reset };
}
