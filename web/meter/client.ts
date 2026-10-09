import type { MeterDataset, MeterResponse } from '../../shared/meter-api';

async function request<T>(path: string, signal: AbortSignal, body?: unknown): Promise<T> {
  const response = await fetch(path, { signal, ...(body === undefined ? {} : {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }) });
  if (!response.ok) throw new Error(`Meter request failed (${response.status}).`);
  return response.json();
}
export const fetchMeterDataset = (signal: AbortSignal) => request<MeterDataset>('/api/meter/dataset', signal);
export const fetchMeterAnswer = (question: string, contextId: string | undefined, signal: AbortSignal) =>
  request<MeterResponse>('/api/meter/query', signal, { question, contextId });
