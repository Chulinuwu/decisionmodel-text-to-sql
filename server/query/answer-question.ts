import { compile } from '../compiler.js';
import { databaseSchema } from '../schema-client.js';
import { planQuestion } from '../planning/planner.js';
import { offers } from './offer-store.js';
import { runInterpretation } from './query-runner.js';
import { AnalysisNotApplicableError } from './query-errors.js';
import type { QueryResponse } from '../../shared/schema.js';

export async function answerQuestion(question: string, signal?: AbortSignal): Promise<QueryResponse> {
  const start = performance.now();
  const schema = await databaseSchema();
  const result = await planQuestion(question, schema, signal);
  if (result.status === 'unsupported') return { status: 'unsupported', question, message: result.message, detail: result.detail, trace: result.trace, usage: result.usage };
  if (result.status === 'choose') {
    const offerId = offers.save(question, result.interpretations);
    return { status: 'choose', question, message: result.message, interpretations: result.interpretations, offerId, trace: result.trace, usage: result.usage };
  }
  // A single accepted reading has nothing to switch to, so it does not occupy an offer slot.
  const offerId = result.alternatives.length ? offers.save(question, [result.chosen, ...result.alternatives]) : null;
  const compiled = compile(result.chosen.plan, schema, question);
  try {
    return await runInterpretation(question, result.chosen, compiled, { offerId, alternatives: result.alternatives, trace: result.trace, usage: result.usage, start, signal });
  } catch (error) {
    if (error instanceof AnalysisNotApplicableError) return { status: 'unsupported', question, message: error.message, detail: result.chosen.summary, trace: result.trace, usage: result.usage };
    throw error;
  }
}
