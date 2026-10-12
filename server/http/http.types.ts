import type { BrowsePage, DatasetInfo, QueryResponse, TableRowsPage } from '../../shared/schema.js';
import type { MeterDataset, MeterResponse } from '../../shared/meter-api.js';

export type HttpFailure = { status: number; error: string };
export type ConcurrencyGate = { tryEnter: () => boolean; leave: () => void };
export type AppDependencies = {
  answerQuestion: (question: string, signal: AbortSignal) => Promise<QueryResponse>;
  executeInterpretation: (offerId: string, interpretationId: string, signal: AbortSignal) => Promise<QueryResponse>;
  datasetInfo: () => Promise<DatasetInfo>;
  answerMeterQuestion?: (input: { question: string; contextId?: string }, signal: AbortSignal) => Promise<MeterResponse>;
  meterDataset?: () => Promise<MeterDataset>;
  // relation is always a qualified name from the browse allowlist, never raw request input.
  tableRows?: (relation: string, page: BrowsePage) => Promise<TableRowsPage>;
};
