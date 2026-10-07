import type { DatasetInfo, QueryResponse } from '../../shared/schema';

async function request<T>(url: string, signal: AbortSignal, body?: unknown): Promise<T> {
  const response = await fetch(url, {
    signal,
    ...(body === undefined ? {} : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    throw new Error(payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
      ? payload.error : `เชื่อมต่อไม่สำเร็จ (${response.status})`);
  }
  return response.json();
}

export const fetchDataset = (signal: AbortSignal) => request<DatasetInfo>('/api/dataset', signal);
export const fetchQuery = (question: string, signal: AbortSignal) => request<QueryResponse>('/api/query', signal, { question });
export const fetchExecute = (offerId: string, interpretationId: string, signal: AbortSignal) => request<QueryResponse>('/api/execute', signal, { offerId, interpretationId });
