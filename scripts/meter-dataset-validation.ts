import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { buildMeterDecisionQuestions, buildMeterState, planMeterQuestion } from '../server/meter/planner.js';
import { executeMeterPlan } from '../server/meter/service.js';
import { decisionPayload } from '../server/decision-payload.js';
import type { DecisionResponse } from '../server/decision-schema.js';
import type { MeterExecute } from '../server/meter/compiler-types.js';
import { meterDatasetContext as context, datasetSplits } from './meter-dataset-config.js';
import type { MeterDatasetRow, MeterScenario } from './meter-dataset-types.js';

export const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export function assignMeterSplits(scenarios: MeterScenario[]): Map<string, string> {
  const result = new Map<string, string>();
  for (const category of new Set(scenarios.map(row => row.category.split('/')[0]))) {
    const families = [...new Set(scenarios.filter(row => row.category.split('/')[0] === category).map(row => row.family))].sort((left, right) => hash(left).localeCompare(hash(right)));
    assert(families.length >= 4, `Insufficient independent families for ${category}`);
    families.forEach((family, index) => result.set(family, index < 3 ? datasetSplits[index + 1] : index % 10 < 7 ? 'train' : datasetSplits[index % 10 - 6]));
  }
  return result;
}

export async function validateMeterScenario(scenario: MeterScenario, split: string, execute: MeterExecute): Promise<MeterDatasetRow> {
  assert(!/[\u0e00-\u0e7f]/u.test(scenario.question));
  const questions = buildMeterDecisionQuestions(scenario.question, context, scenario.previous);
  const state = buildMeterState(scenario.question, context, scenario.previous);
  assert(!/[\u0e00-\u0e7f]/u.test(state + JSON.stringify(questions)), 'Meter model inputs must be English only');
  decisionPayload(state, questions);
  assert(Object.keys(questions).every(key => Object.hasOwn(scenario.labels, key)));
  const answers: DecisionResponse['answers'] = {};
  const decisions: Record<string, Record<string, number>> = {};
  for (const [key, specification] of Object.entries(questions)) {
    assert.equal(specification.type, 'choice');
    assert(Object.hasOwn(specification.criteria, scenario.labels[key]), `${key}: ${scenario.labels[key]}`);
    const probabilities = Object.fromEntries(Object.keys(specification.criteria).map(label => [label, Number(label === scenario.labels[key])]));
    answers[key] = { type: 'choice', choice: scenario.labels[key], probabilities };
    decisions[key] = probabilities;
  }
  const parsed = await planMeterQuestion(scenario.question, context, scenario.previous, undefined, async () => ({ id: 'synthetic-gold', model: 'cloudflare/clef-flash', provider: 'Cloudflare', answers, usage: { input_tokens: 0, output_tokens: 0, cost: 0 } }));
  assert.equal(parsed.status, scenario.plan === null ? 'clarify' : 'ok', scenario.question);
  if (parsed.status === 'ok') assert.deepEqual(parsed.plan, scenario.plan);
  const result = scenario.plan === null ? null : await executeMeterPlan(scenario.plan, { asOf: context.asOf, timezone: context.timezone }, execute);
  if (result) assert.equal(result.status, 'ok', scenario.question);
  return {
    id: hash(state), family_id: hash(scenario.family), split, language: 'en', source: 'synthetic-meter-fixture-v1',
    category: scenario.category, question: scenario.question, state, questions: JSON.stringify(questions), decisions: JSON.stringify(decisions),
    expected_plan: JSON.stringify(scenario.plan), expected_status: result?.status ?? 'clarify',
    expected_evidence_sha256: result ? hash(JSON.stringify(result.evidence)) : '',
    sql_queries: JSON.stringify(result?.evidence.filter(item => item.sql).map(({ kind, sql, parameters }) => ({ kind, sql, parameters })) ?? []), synthetic: true,
  };
}
