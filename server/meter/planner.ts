import { meterContextSchema, meterPlanSchema, type MeterPlan } from '../../shared/meter-schema.js';
import type { Trace, Usage } from '../../shared/schema.js';
import { decide } from '../decisions-client.js';
import { decisionPayload } from '../decision-payload.js';
import { violatesReadOnlyPolicy } from '../planning/read-only-policy.js';
import { buildMeterDecisionQuestions, buildMeterQuestions, buildMeterState } from './planning-questions.js';
import type { MeterPlanningContext, MeterPlanningResult } from './planning.types.js';
import { retainMeterFilters } from './planning-grounding.js';
import { hasHistoricalMeterPeriod, hasUnboundMeterNumber, meterFloor, meterQuantities } from './planning-numbers.js';

export { buildMeterDecisionQuestions, buildMeterQuestions, buildMeterState } from './planning-questions.js';
export type { MeterPlanningContext, MeterPlanningResult } from './planning.types.js';

export async function planMeterQuestion(question: string, context: MeterPlanningContext, previous?: MeterPlan, signal?: AbortSignal, decision = decide): Promise<MeterPlanningResult> {
  const trace: Trace[] = [];
  let usage: Usage = { input_tokens: 0, output_tokens: 0, cost: 0 };
  let provider: string | null = null;
  const clarify = (message: string): MeterPlanningResult => ({ status: 'clarify', message, trace, usage, provider });
  meterContextSchema.parse({ asOf: context.asOf, timezone: context.timezone });
  if (previous) meterPlanSchema.parse(previous);
  if (!question.trim() || Buffer.byteLength(question) > 1200) return clarify('Please use a shorter, specific meter question.');
  if (violatesReadOnlyPolicy(question)) return clarify('Meter queries are read-only.');
  if (/\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b/.test(question)) return clarify('Please use today, yesterday, this/last week or this/last month. Absolute dates are not supported yet.');
  if (meterFloor(question).values.some(value => !context.floors.includes(value))) return clarify('That floor is not in the meter catalog.');
  if (meterFloor(question).mentioned && !meterFloor(question).values.length && !/\ball\b|\bany\b|ทุกชั้น|ทุกระดับ|ทั้งหมด/i.test(question)) return clarify('Please specify a numbered floor from the catalog, or all floors.');
  if (hasUnboundMeterNumber(question)) return clarify('A numeric constraint could not be bound safely. Please specify floor, top count or reporting duration explicitly.');
  const questions = buildMeterQuestions(question, context, previous);
  let state: string;
  try { state = buildMeterState(question, context, previous); decisionPayload(state, questions); }
  catch { return clarify('The question or meter catalog exceeds the safe planning budget.'); }
  const response = await decision(state, buildMeterDecisionQuestions(question, context, previous), signal);
  for (const [id, specification] of Object.entries(questions)) {
    if (specification.type === 'choice' && Object.keys(specification.criteria).length === 1) {
      const [value] = Object.keys(specification.criteria);
      response.answers[id] = { type: 'choice', choice: value, probabilities: { [value]: 1 } };
    }
  }
  usage = response.usage;
  provider = response.provider;
  for (const [id, answer] of Object.entries(response.answers)) {
    if (answer.type === 'choice') trace.push({ id, stage: 'meter_slots', label: id, choice: answer.choice, probability: answer.probabilities[answer.choice] ?? 0, alternatives: Object.entries(answer.probabilities).map(([choice, probability]) => ({ choice, probability })) });
  }
  const selected: Record<string, string> = {};
  for (const [id, specification] of Object.entries(questions)) {
    const answer = response.answers[id];
    if (specification.type !== 'choice' || answer?.type !== 'choice' || !(answer.choice in specification.criteria)) return clarify('Could not resolve all requested constraints. Please clarify.');
    if (id === 'intent' && previous && selected.continuity === 'followup' && selected.operation_change === 'keep') { selected.intent = previous.intent; continue; }
    if (id === 'period' && selected.intent === 'stale') {
      if (hasHistoricalMeterPeriod(question)) return clarify('Reporting status is available only at the current dataset time, not for historical periods.');
      selected.period = 'today'; continue;
    }
    const probability = answer.probabilities[answer.choice] ?? 0;
    const mass = Object.values(answer.probabilities).reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(probability) || probability < 0.65 || Math.abs(mass - 1) > 0.02 || Object.values(answer.probabilities).some(value => value > probability)) return clarify('The meter interpretation is uncertain. Please specify the resource, location and period.');
    if (answer.choice === 'unsupported') return clarify('That request includes an unsupported or unknown constraint. Please specify a catalog resource/location and a supported relative period.');
    selected[id] = answer.choice;
  }
  if (selected.continuity === 'followup' && !previous) return clarify('There is no previous meter question. Please state the resource, location and operation.');
  const parsed = meterPlanSchema.safeParse({
    intent: selected.intent, period: selected.period,
    resource: selected.resource === 'all' ? null : context.resources[Number(selected.resource.slice(2))],
    building: selected.building === 'all' ? null : context.buildings[Number(selected.building.slice(2))],
    floor: selected.floor === 'all' ? null : Number(selected.floor.slice(2)),
    limit: Number(selected.limit.slice(2)), staleMinutes: Number(selected.staleMinutes.slice(2)),
  });
  if (!parsed.success) return clarify('Could not resolve a valid meter plan. Please restate the question.');
  const plan = previous && selected.continuity === 'followup' ? { ...retainMeterFilters(question, parsed.data, previous), limit: meterQuantities(question).limit ?? previous.limit, staleMinutes: meterQuantities(question).staleMinutes ?? previous.staleMinutes } : parsed.data;
  return { status: 'ok', plan, trace, usage, provider };
}
