import type { DatasetInfo, Interpretation, QueryResponse } from '../../shared/schema';

export type DatasetState =
  | { status: 'loading' }
  | { status: 'ready'; data: DatasetInfo }
  | { status: 'error'; message: string };

export type QueryRequest =
  | { kind: 'question'; question: string }
  | { kind: 'execute'; question: string; offerId: string; interpretation: Interpretation };

export type QueryState =
  | { status: 'idle' }
  | { status: 'loading'; request: QueryRequest }
  | { status: 'done'; request: QueryRequest; response: QueryResponse; id: number }
  | { status: 'error'; request: QueryRequest; message: string }
  | { status: 'cancelled'; request: QueryRequest };

export type AnsweredResponse = Extract<QueryResponse, { status: 'ok' }>;
export type ChooseResponse = Extract<QueryResponse, { status: 'choose' }>;
export type UnsupportedResponse = Extract<QueryResponse, { status: 'unsupported' }>;
export type ExecuteInterpretation = (interpretation: Interpretation) => void;
export type ExecuteOffer = (offerId: string, interpretation: Interpretation) => void;

export type ChartPoint = { label: string; value: number };
export type ChartData = { title: string; points: ChartPoint[] };
