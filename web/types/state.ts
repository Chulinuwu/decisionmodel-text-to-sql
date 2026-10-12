import type { MeterResponse } from '../../shared/meter-api';
import type { Interpretation, QueryResponse } from '../../shared/schema';
import type { ChatDatabase, MeterDatabase } from './database';

export type QueryRequest =
  | { kind: 'question'; question: string }
  | { kind: 'execute'; question: string; offerId: string; interpretation: Interpretation };
export type QuestionRequest = Extract<QueryRequest, { kind: 'question' }>;

export type Reply<Response> =
  | { status: 'loading' }
  | { status: 'done'; response: Response }
  | { status: 'error'; message: string }
  | { status: 'cancelled' };

// request is the latest call for this turn: picking an interpretation replaces the question with an execute request.
export type Turn<Request extends { question: string }, Response> = { id: number; request: Request; reply: Reply<Response> };
export type ChatTurn = Turn<QueryRequest, QueryResponse>;
export type MeterTurn = Turn<QuestionRequest, MeterResponse>;
export type SendTurn<Request extends { question: string }, Response> =
  (request: Request, history: Turn<Request, Response>[], signal: AbortSignal) => Promise<Response>;

type ThreadBase = { id: string; createdAt: number };
export type ChatThreadRecord = ThreadBase & { database: ChatDatabase; turns: ChatTurn[] };
export type MeterThreadRecord = ThreadBase & { database: MeterDatabase; turns: MeterTurn[] };
export type ThreadRecord = ChatThreadRecord | MeterThreadRecord;
// Persisted form keeps only the question, the turn status and the response JSON; the database is re-resolved from the registry.
export type StoredTurn<Response> = { question: string; status: 'done' | 'error' | 'cancelled'; response?: Response };
export type StoredThread = ThreadBase & { databaseId: string; turns: StoredTurn<QueryResponse | MeterResponse>[] };
export type ThreadStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type AnsweredResponse = Extract<QueryResponse, { status: 'ok' }>;
export type ChooseResponse = Extract<QueryResponse, { status: 'choose' }>;
export type UnsupportedResponse = Extract<QueryResponse, { status: 'unsupported' }>;
export type ExecuteInterpretation = (interpretation: Interpretation) => void;
export type ExecuteTurnOffer = (turnId: number, offerId: string, interpretation: Interpretation) => void;

// compare is the previous-period value for period_change charts; highlight marks anomaly outliers.
export type ChartPoint = { label: string; value: number; compare: number | null; highlight: boolean };
export type ChartData = { title: string; points: ChartPoint[] };
