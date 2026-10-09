import { z } from 'zod';
import type { DatabaseSchema, Plan } from './query-schema.js';

export { queryPlanSchema, type Plan } from './query-schema.js';
export const questionSchema = z.object({ question: z.string().trim().min(3).max(600) }).strict();
export const executeSchema = z.object({ offerId: z.string().regex(/^[a-f0-9]{32}$/), interpretationId: z.string().regex(/^[a-z0-9_]{1,16}$/) }).strict();
export type Trace = { id: string; stage: string; label: string; choice: string; probability: number; confidence?: number; alternatives: { choice: string; probability: number }[] };
// PostgreSQL booleans (anomaly is_outlier) arrive as JS booleans; numerics arrive as strings.
export type ResultCell = string | number | boolean | null;
export type Usage = { input_tokens: number; output_tokens: number; cost: number };
export type InterpretationPart = { label: string; value: string };
export type Interpretation = { id: string; plan: Plan; summary: string; parts: InterpretationPart[]; probability: number | null };
export type QueryResponse = {
  status: 'ok'; question: string; answer: string; plan: Plan; interpretation: Interpretation; alternatives: Interpretation[]; offerId: string | null;
  sql: string; parameters: (string | number)[];
  columns: string[]; rows: Record<string, ResultCell>[]; truncated: boolean;
  trace: Trace[]; usage: Usage; model: string; provider: string; elapsedMs: number; warnings: string[];
} | {
  status: 'choose'; question: string; message: string; interpretations: Interpretation[]; offerId: string; trace: Trace[]; usage: Usage;
} | {
  status: 'unsupported'; question: string; message: string; detail: string; trace: Trace[]; usage: Usage;
};
export type DatasetInfo = {
  source: string; model: string; provider: string; orders: number; customers: number; items: number;
  minDate: string; maxDate: string; tables: { name: string; rows: number }[];
  schema: DatabaseSchema; ready: boolean;
};
