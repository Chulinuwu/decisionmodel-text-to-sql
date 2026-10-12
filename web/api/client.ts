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

export const fetchDataset = (url: string, signal: AbortSignal) => request<DatasetInfo>(url, signal);
export const fetchQuery = (url: string, question: string, signal: AbortSignal) => request<QueryResponse>(url, signal, { question });
export const fetchExecute = (url: string, offerId: string, interpretationId: string, signal: AbortSignal) => request<QueryResponse>(url, signal, { offerId, interpretationId });
