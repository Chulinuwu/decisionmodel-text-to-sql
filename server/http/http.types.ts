import type { DatasetInfo, QueryResponse } from '../../shared/schema.js';

export type HttpFailure = { status: number; error: string };
export type ConcurrencyGate = { tryEnter: () => boolean; leave: () => void };
export type AppDependencies = {
  answerQuestion: (question: string, signal: AbortSignal) => Promise<QueryResponse>;
  executeInterpretation: (offerId: string, interpretationId: string, signal: AbortSignal) => Promise<QueryResponse>;
  datasetInfo: () => Promise<DatasetInfo>;
};
