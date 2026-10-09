import type { DatabaseSchema } from '../../shared/query-schema.js';
import { config } from '../config.js';
import type { Catalog, DetailSpace, Distributions, ListMeasure, PlanResult } from './planning.types.js';
import { DecisionSession } from './decision-session.js';
import { buildCatalog } from './semantic-catalog.js';
import { extractSlots } from './slots.js';
import { buildDetailQuestions, buildShapeQuestions, parseDetails, toDistributions } from './shape-questions.js';
import { buildCandidates } from './candidates.js';
import { buildRankQuestion, parseRank } from './rank.js';
import { interpretationFromPlan } from './describe.js';
import { understoodSummary } from './understanding.js';
import { violatesReadOnlyPolicy } from './read-only-policy.js';
import { keepUnlinkedReadings } from './link-evidence.js';
import { planningLimits } from './planning-limits.js';
import { messages } from './planning-messages.js';

const beamTargets = (distributions: Distributions) => (distributions.target ?? []).filter(option => option.p >= planningLimits.minOptionProbability).slice(0, planningLimits.maxOptionsPerQuestion);

function dominantIntent(distributions: Distributions, catalog: Catalog) {
  const mass = catalog.intents.map(intent => ({ intent, p: distributions.target?.find(option => option.key === intent.id)?.p ?? 0 }));
  const total = mass.reduce((sum, entry) => sum + entry.p, 0);
  return total >= planningLimits.unanswerableMass ? mass.sort((a, b) => b.p - a.p)[0]?.intent ?? null : null;
}

export async function planQuestion(question: string, schema: DatabaseSchema, signal?: AbortSignal): Promise<PlanResult> {
  const combined = AbortSignal.any([AbortSignal.timeout(planningLimits.planTimeoutMs), ...(signal ? [signal] : [])]);
  const session = new DecisionSession(question, combined);
  const unsupported = (detail: string, message = messages.unsupported): PlanResult => ({ status: 'unsupported', message, detail, trace: session.trace, usage: session.usage });
  if (Buffer.byteLength(question) > config.maxQuestionBytes) return unsupported(messages.tooLong);
  if (violatesReadOnlyPolicy(question)) return unsupported(messages.readOnly);

  const catalog = buildCatalog(schema);
  const slots = extractSlots(question, schema, catalog);
  const shape = buildShapeQuestions(question, schema, catalog, slots);
  const distributions = keepUnlinkedReadings(toDistributions(await session.ask('shape', shape.questions), shape.questions), shape.space);
  const understood = understoodSummary(distributions, catalog, shape.space);
  const intent = dominantIntent(distributions, catalog);
  if (intent) return unsupported(intent.reason);

  const lists = beamTargets(distributions).flatMap(option => catalog.measures.filter((measure): measure is ListMeasure => measure.kind === 'list' && measure.id === option.key));
  let details = new Map<string, DetailSpace>();
  if (lists.length) {
    const detail = buildDetailQuestions(lists, schema);
    const answers = await session.ask('detail', detail.questions);
    details = parseDetails(answers, detail.built);
    Object.assign(distributions, toDistributions(answers, Object.fromEntries(detail.built.flatMap(entry => {
      const sort = detail.questions[entry.sortId];
      return sort ? [[entry.sortId, sort]] : [];
    }))));
  }

  combined.throwIfAborted();
  const candidates = buildCandidates({ question, schema, catalog, space: shape.space, details, distributions });
  if (!candidates.length) return unsupported([messages.noCandidate, understood].filter(Boolean).join(' '));

  const { ranked, topIntent, none } = parseRank(await session.ask('rank', buildRankQuestion(candidates, catalog, schema.coverage)), candidates, catalog);
  const best = ranked[0];
  if (topIntent && topIntent.p > none && topIntent.p > (best?.p ?? 0)) return unsupported(topIntent.intent.reason);
  if (none >= planningLimits.rankNone && none > (best?.p ?? 0)) return unsupported([messages.rankNone, understood].filter(Boolean).join(' '));
  const interpretations = ranked.map(candidate => interpretationFromPlan(candidate.plan, schema, candidate.p, candidate.key));
  const [chosen, ...alternatives] = interpretations;
  // A clear leader over the runner-up is answered directly; the other readings stay one click away as alternatives.
  const leads = (best?.p ?? 0) >= planningLimits.rankLeadFloor && (best?.p ?? 0) >= planningLimits.rankLeadRatio * (ranked[1]?.p ?? 0);
  if (best && chosen && (best.p >= planningLimits.rankAccept || leads)) return { status: 'ok', chosen, alternatives, trace: session.trace, usage: session.usage };
  return { status: 'choose', message: messages.choose, interpretations, trace: session.trace, usage: session.usage };
}
