import type { compile } from '../compiler.js';
import type { Interpretation, QueryResponse, Trace, Usage } from '../../shared/schema.js';

export type AnsweredResponse = Extract<QueryResponse, { status: 'ok' }>;
export type CompiledQuery = ReturnType<typeof compile>;
export type RunContext = { offerId: string | null; alternatives: Interpretation[]; trace: Trace[]; usage: Usage; start: number; signal?: AbortSignal };
export type Offer = { question: string; interpretations: Interpretation[]; createdAt: number };
export type OfferStoreOptions = { limit: number; ttlMs: number; now?: () => number };
