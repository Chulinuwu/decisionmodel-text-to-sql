import type { DatasetInfo, Interpretation, QueryResponse } from '../../shared/schema';

export type DatasetState =
  | { status: 'loading' }
  | { status: 'ready'; data: DatasetInfo }
  | { status: 'error'; message: string };

export type QueryRequest =
  | { kind: 'question'; question: string }
  | { kind: 'execute'; question: string; offerId: string; interpretation: Interpretation };

export type ChatReply =
  | { status: 'loading' }
  | { status: 'done'; response: QueryResponse }
  | { status: 'error'; message: string }
  | { status: 'cancelled' };

// request is the latest call for this turn: picking an interpretation replaces the question with an execute request.
export type ChatTurn = { id: number; request: QueryRequest; reply: ChatReply };

export type AnsweredResponse = Extract<QueryResponse, { status: 'ok' }>;
export type ChooseResponse = Extract<QueryResponse, { status: 'choose' }>;
export type UnsupportedResponse = Extract<QueryResponse, { status: 'unsupported' }>;
export type ExecuteInterpretation = (interpretation: Interpretation) => void;
export type ExecuteTurnOffer = (turnId: number, offerId: string, interpretation: Interpretation) => void;

// compare is the previous-period value for period_change charts; highlight marks anomaly outliers.
export type ChartPoint = { label: string; value: number; compare: number | null; highlight: boolean };
export type ChartData = { title: string; points: ChartPoint[] };
