import type { QueryResponse } from '../shared/schema.js';
import type { outcomes } from './live-eval-config.js';

export type LiveCase = { question: string; gold: string | null; ordered?: boolean };
export type Outcome = typeof outcomes[number];
export type NormalizedValue = string | number | null;
export type GoldComparison = { correct: boolean; mapping: string[] | null; expected: NormalizedValue[][]; actual: NormalizedValue[][] | null };
export type InterpretationCheck = { index: number; id: string; summary: string; probability: number | null; correct: boolean; sql?: string; mapping?: string[] | null; actual?: NormalizedValue[][] | null; error?: string };
export type Report = {
  question: string; outcome: Outcome; clefCalls?: number; matchedIndex?: number | null; response?: QueryResponse;
  checks?: InterpretationCheck[]; error?: string; expected?: NormalizedValue[][] | null; actual?: NormalizedValue[][] | null; mapping?: string[] | null;
};
