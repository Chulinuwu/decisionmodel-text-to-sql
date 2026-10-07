import type { Question } from '../decision-schema.js';
import type { Catalog, DecisionAnswers, RankedCandidate, ValidatedPlan } from './planning.types.js';
import type { Coverage } from '../../shared/query-schema.js';
import { describePlanForModel } from './describe-model.js';
import { rankInstruction, rankIntent, rankNoneCriterion } from './decision-prompts.js';

export const rankQuestionId = 'rank';
export const candidateKey = (index: number) => `r_${index}`;

export function buildRankQuestion(candidates: ValidatedPlan[], catalog: Catalog, coverage: Coverage): Record<string, Question> {
  const criteria = Object.fromEntries(candidates.map((candidate, index) => [candidateKey(index), describePlanForModel(candidate.plan, coverage)]));
  const intents = Object.fromEntries(catalog.intents.map(intent => [intent.id, rankIntent(intent.en)]));
  return { [rankQuestionId]: { type: 'choice', instructions: rankInstruction, criteria: { ...criteria, ...intents, none: rankNoneCriterion } } };
}

export function parseRank(answers: DecisionAnswers, candidates: ValidatedPlan[], catalog: Catalog) {
  const answer = answers[rankQuestionId];
  const probabilities = answer?.type === 'choice' ? answer.probabilities : {};
  const ranked: RankedCandidate[] = candidates.map((candidate, index) => ({ ...candidate, key: candidateKey(index), p: probabilities[candidateKey(index)] ?? 0 })).sort((a, b) => b.p - a.p);
  const intents = catalog.intents.map(intent => ({ intent, p: probabilities[intent.id] ?? 0 })).sort((a, b) => b.p - a.p);
  return { ranked, topIntent: intents[0], none: probabilities.none ?? 0 };
}
