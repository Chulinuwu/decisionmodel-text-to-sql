import type { QueryResult } from 'pg';
import { executeInterpretation } from '../server/query/execute-interpretation.js';
import { compareToGold, expectedRows } from './gold-compare.js';
import type { Interpretation, QueryResponse } from '../shared/schema.js';
import type { InterpretationCheck, LiveCase, Report } from './live-eval.types.js';

async function checkInterpretation(offerId: string, interpretation: Interpretation, index: number, gold: QueryResult | null, ordered: boolean): Promise<InterpretationCheck> {
  const base = { index, id: interpretation.id, summary: interpretation.summary, probability: interpretation.probability };
  try {
    const response = await executeInterpretation(offerId, interpretation.id);
    if (!gold) return { ...base, correct: false, sql: response.sql };
    const { correct, mapping, actual } = compareToGold(response, gold, ordered);
    return { ...base, correct, sql: response.sql, mapping, actual };
  } catch (error) {
    return { ...base, correct: false, error: error instanceof Error ? error.message : 'Unknown execution error' };
  }
}

export async function evaluate(test: LiveCase, response: QueryResponse, gold: QueryResult | null): Promise<Report> {
  const { question } = test;
  const ordered = test.ordered ?? false;
  // The planner tags every entry of one batched decision request with the same stage.
  const clefCalls = new Set(response.trace.map(trace => trace.stage)).size;
  const expected = gold ? expectedRows(gold) : null;
  if (response.status === 'unsupported') return { question, outcome: gold ? 'refused_supported' : 'refused_expected', clefCalls, response, expected };
  if (response.status === 'choose') {
    const checks: InterpretationCheck[] = [];
    for (const [index, interpretation] of response.interpretations.entries()) checks.push(await checkInterpretation(response.offerId, interpretation, index, gold, ordered));
    const matched = checks.find(check => check.correct);
    return { question, outcome: matched ? 'choose_contains_correct' : 'choose_missing_correct', clefCalls, matchedIndex: matched?.index ?? null, response, checks, expected };
  }
  if (!gold) return { question, outcome: 'accepted_wrong', clefCalls, response, expected };
  const { correct, mapping, actual } = compareToGold(response, gold, ordered);
  return { question, outcome: correct ? 'accepted_correct' : 'accepted_wrong', clefCalls, response, expected, actual, mapping };
}

export function logLine(report: Report) {
  const { response } = report;
  if (!response) return { question: report.question, outcome: report.outcome, error: report.error };
  const detail = response.status === 'ok' ? { rows: response.rows.length, sql: response.sql }
    : response.status === 'choose' ? { interpretations: response.interpretations.length, matchedIndex: report.matchedIndex }
      : { message: response.message, detail: response.detail };
  return { question: report.question, outcome: report.outcome, clefCalls: report.clefCalls, ...detail };
}
