import { config } from '../config.js';
import { execute } from '../db-client.js';
import { queryWarnings } from './query-warnings.js';
import { AnalysisNotApplicableError } from './query-errors.js';
import type { Interpretation } from '../../shared/schema.js';
import type { AnsweredResponse, CompiledQuery, RunContext } from './query.types.js';

export async function runInterpretation(question: string, interpretation: Interpretation, compiled: CompiledQuery, context: RunContext): Promise<AnsweredResponse> {
  if (context.signal?.aborted) throw new Error('Request canceled');
  const { plan } = interpretation;
  const output = await execute(compiled.sql, compiled.values);
  if (compiled.emptyResult && !output.rows.length) throw new AnalysisNotApplicableError(compiled.emptyResult);
  return {
    status: 'ok', question, plan, interpretation, alternatives: context.alternatives, offerId: context.offerId,
    sql: compiled.sql, parameters: compiled.values, columns: output.columns,
    rows: output.rows.slice(0, plan.limit), truncated: output.rows.length > plan.limit,
    trace: context.trace, usage: context.usage, model: config.model, provider: config.provider,
    elapsedMs: Math.round(performance.now() - context.start), warnings: queryWarnings(plan, compiled.grain),
  };
}
