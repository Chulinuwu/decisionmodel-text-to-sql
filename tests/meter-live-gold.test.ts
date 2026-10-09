import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { MeterResponse } from '../shared/meter-api.js';
import { checkMeterGold } from '../scripts/meter-live-gold.js';

test('live acceptance compares independent interval amounts and rejects label-only success', () => {
  const example = { id: 'total', question: 'DI Water yesterday', intent: 'total' as const, period: 'yesterday' as const, resource: 'DI Water', floor: 3 };
  const meters = [{ row: { id: 'm1', name: 'DI Water 1', resource: 'DI Water', unit: 'm3', floor: 3, building: 'A', recorded_at: null, cumulative_value: null, quality: null, reset: null, expected_interval_minutes: 60 }, latest: null,
    intervals: [{ start: Date.parse('2026-10-07T17:00:00Z'), end: Date.parse('2026-10-07T18:00:00Z'), value: 12 }, { start: Date.parse('2026-10-07T18:00:00Z'), end: Date.parse('2026-10-07T19:00:00Z'), value: null }] }];
  const response: MeterResponse = { status: 'ok', question: example.question, contextId: 'test', datasetFingerprint: 'test', context: { asOf: '2026-10-09T05:00:00Z', timezone: 'Asia/Bangkok' }, synthetic: true,
    usage: { cost: 0, input_tokens: 0, output_tokens: 0 }, provider: 'fixture', contextReset: false, trace: [], result: {
      status: 'ok', text: 'DI Water: 12.00 m3.', warnings: [], plan: { intent: 'total', period: 'yesterday', resource: 'DI Water', floor: 3, building: null, limit: 20, staleMinutes: 60 },
      window: { start: '2026-10-07T17:00:00Z', end: '2026-10-08T17:00:00Z', previousStart: '2026-10-06T17:00:00Z', previousEnd: '2026-10-07T17:00:00Z' },
      evidence: [{ kind: 'usage', sql: 'fixture', parameters: [], rows: [{ resource: 'DI Water', unit: 'm3', usage: 12 }] }],
    } };
  assert.doesNotThrow(() => checkMeterGold(example, response, meters));
  response.result.evidence[0].rows[0].usage = 13;
  assert.throws(() => checkMeterGold(example, response, meters));
  response.result.evidence[0].rows[0].usage = 12;
  response.result.window.start = '2026-10-07T00:00:00Z';
  assert.throws(() => checkMeterGold(example, response, meters));
});

test('missing-context acceptance requires actual clarification', () => {
  assert.doesNotThrow(() => checkMeterGold({ id: 'missing', question: 'Yesterday?', status: 'clarify' }, {
    status: 'clarify', question: 'Yesterday?', message: 'Which resource?', usage: { cost: 0, input_tokens: 0, output_tokens: 0 }, provider: '', contextReset: false, trace: [],
  }, []));
});
