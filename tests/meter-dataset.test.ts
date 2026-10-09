import test from 'node:test';
import assert from 'node:assert/strict';
import { meterScenarios } from '../scripts/meter-dataset-scenarios.js';
import { assignMeterSplits, validateMeterScenario } from '../scripts/meter-dataset-validation.js';
import { createMeterUsageOracle } from '../scripts/meter-dataset-oracle.js';

test('meter scenarios use disjoint semantic families and every split covers all intents', () => {
  const scenarios = meterScenarios();
  const splits = assignMeterSplits(scenarios);
  assert(scenarios.length >= 1000);
  assert.deepEqual(assignMeterSplits([...scenarios].reverse()), splits);
  for (const split of ['train', 'dev', 'calibration', 'test']) {
    const selected = scenarios.filter(row => splits.get(row.family) === split);
    assert.deepEqual(new Set(selected.map(row => row.category.split('/')[0])), new Set(['total', 'ranking', 'comparison', 'anomaly', 'stale', 'explain', 'summary', 'clarify']));
    assert(selected.some(row => row.previous));
  }
});

test('every gold decision round-trips through the actual meter planner', async () => {
  const scenarios = meterScenarios();
  const splits = assignMeterSplits(scenarios);
  const ids = new Set<string>();
  for (const scenario of scenarios) {
    const row = await validateMeterScenario(scenario, splits.get(scenario.family)!, async () => [{ meter_id: 'test', resource: 'DI Water', unit: 'm3', usage: 1 }]);
    assert(!ids.has(row.id));
    ids.add(row.id);
  }
});

test('independent raw-reading oracle captures spike and rejects an incorrect sum', () => {
  const verify = createMeterUsageOracle();
  const parameters = ['2026-10-08T17:00:00.000Z', '2026-10-09T05:00:00.000Z', 'H2SO4', 'A', 1, 100];
  verify(parameters, [{ resource: 'H2SO4', unit: 'L', usage: 225 }], false);
  assert.throws(() => verify(parameters, [{ resource: 'H2SO4', unit: 'L', usage: 45 }], false));
});
