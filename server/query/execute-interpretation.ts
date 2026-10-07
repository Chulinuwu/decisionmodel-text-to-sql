import { compile } from '../compiler.js';
import { databaseSchema } from '../schema-client.js';
import { offers } from './offer-store.js';
import { InvalidPlanError, OfferNotFoundError } from './query-errors.js';
import { runInterpretation } from './query-runner.js';
import type { DatabaseSchema, Plan } from '../../shared/query-schema.js';
import type { Usage } from '../../shared/schema.js';
import type { AnsweredResponse } from './query.types.js';

const zeroUsage: Usage = { input_tokens: 0, output_tokens: 0, cost: 0 };

function compileStored(question: string, plan: Plan, schema: DatabaseSchema) {
  try { return compile(plan, schema, question); }
  catch (error) { throw new InvalidPlanError(error instanceof Error ? error.message : 'Invalid plan'); }
}

export async function executeInterpretation(offerId: string, interpretationId: string, signal?: AbortSignal): Promise<AnsweredResponse> {
  const start = performance.now();
  const offer = offers.find(offerId);
  const interpretation = offer?.interpretations.find(candidate => candidate.id === interpretationId);
  if (!offer || !interpretation) throw new OfferNotFoundError('Offer or interpretation not found');
  const compiled = compileStored(offer.question, interpretation.plan, await databaseSchema());
  const alternatives = offer.interpretations.filter(candidate => candidate.id !== interpretationId);
  return runInterpretation(offer.question, interpretation, compiled, { offerId, alternatives, trace: [], usage: zeroUsage, start, signal });
}
