import assert from 'node:assert/strict';
import { test } from 'node:test';
import { meterPlanSchema, type MeterPlan } from '../shared/meter-schema.js';
import { compileUsage, compileStale } from '../server/meter/compiler.js';
import { executeMeterPlan } from '../server/meter/service.js';
import { meterWindow } from '../server/meter/time.js';

const context = { asOf: '2026-10-09T05:00:00.000Z', timezone: 'Asia/Bangkok' as const };
const plan: MeterPlan = { intent: 'total', period: 'today', resource: 'DI Water', building: null, floor: null, limit: 10, staleMinutes: 60 };

test('meter periods use Bangkok midnight and Monday week; current comparison matches elapsed time', () => {
  assert.deepEqual(meterWindow('today', context), { start: '2026-10-08T17:00:00.000Z', end: context.asOf, previousStart: '2026-10-07T17:00:00.000Z', previousEnd: '2026-10-08T05:00:00.000Z' });
  assert.equal(meterWindow('this_week', context).start, '2026-10-04T17:00:00.000Z');
  assert.equal(meterWindow('last_month', context).previousEnd, '2026-08-31T17:00:00.000Z');
  assert.equal(meterWindow('last_month', context).previousStart, '2026-07-31T17:00:00.000Z');
});

test('meter compiler binds user filters and never uses future readings for status', () => {
  const malicious = { ...plan, resource: "'; DROP TABLE metering.meters; --" };
  const compiled = compileUsage(malicious, context.asOf, context.asOf);
  assert.ok(!compiled.sql.includes(malicious.resource));
  assert.ok(compiled.parameters.includes(malicious.resource));
  assert.match(compileStale(plan, context).sql, /r.recorded_at <= \$1/);
  assert.equal(meterPlanSchema.safeParse({ ...plan, limit: 1000 }).success, false);
});

test('comparison zero baseline remains undefined; coverage and causal limits are visible', async () => {
  let calls = 0;
  const result = await executeMeterPlan({ ...plan, intent: 'explain' }, context, async () => [{
    meter_id: 'one', name: 'Meter One', resource: 'DI Water', unit: 'm3', usage: calls++ <= 1 ? 12 : 0,
    covered_seconds: 3600, expected_seconds: 43200,
  }]);
  const row = result.evidence.find(item => item.kind === 'comparison')!.rows[0];
  assert.equal(row.delta, 12);
  assert.equal(row.percent_change, null);
  assert.match(result.text, /cannot establish why/);
  assert.ok(result.warnings.some(warning => warning.includes('coverage is incomplete')));
});

test('summary is bounded and preserves resource-unit groups; empty stale result is successful', async () => {
  let calls = 0;
  const result = await executeMeterPlan({ ...plan, intent: 'summary' }, context, async () => {
    calls++;
    return [{ resource: 'Water', unit: 'm3', usage: 2 }, { resource: 'Chemical', unit: 'L', usage: 3 }];
  });
  assert.equal(calls, 5);
  assert.match(result.text, /2.00 m3/);
  assert.match(result.text, /3.00 L/);
  assert.equal((await executeMeterPlan({ ...plan, intent: 'stale' }, context, async () => [])).status, 'ok');
});

test('unsupported anomaly period clarifies without database execution', async () => {
  const result = await executeMeterPlan({ ...plan, intent: 'anomaly', period: 'this_month' }, context, async () => { throw Error('must not execute'); });
  assert.equal(result.status, 'clarify');
});

test('mixed resource rankings clarify instead of comparing incompatible units', async () => {
  const result = await executeMeterPlan({ ...plan, intent: 'ranking', resource: null }, context, async () => [
    { resource: 'Water', unit: 'm3', usage: 2 }, { resource: 'Chemical', unit: 'L', usage: 3 },
  ]);
  assert.equal(result.status, 'clarify');
  assert.match(result.text, /Choose one resource/);
});

test('one-resource scope ranks meter evidence rather than preflight aggregate', async () => {
  let calls = 0;
  const result = await executeMeterPlan({ ...plan, intent: 'ranking', resource: null }, context, async () => calls++ === 0
    ? [{ resource: 'DI Water', unit: 'm3', usage: 20 }]
    : [{ name: 'Meter One', resource: 'DI Water', unit: 'm3', usage: 12 }]);
  assert.equal(result.status, 'ok');
  assert.match(result.text, /Meter One: 12.00 m3/);
  assert.doesNotMatch(result.text, /undefined|20.00/);
});

test('explicit resource with inconsistent units also requires clarification', async () => {
  for (const intent of ['ranking', 'explain'] as const) {
    const result = await executeMeterPlan({ ...plan, intent }, context, async () => [
      { resource: 'DI Water', unit: 'm3' }, { resource: 'DI Water', unit: 'L' },
    ]);
    assert.equal(result.status, 'clarify');
    assert.equal(result.evidence.length, 1);
  }
});

test('historical summary explicitly timestamps current-status evidence', async () => {
  const result = await executeMeterPlan({ ...plan, intent: 'summary', period: 'last_month' }, context, async () => [{ resource: 'DI Water', unit: 'm3', usage: 1 }]);
  assert.match(result.text, /Current status at 2026-10-09T05:00:00.000Z/);
});

test('short previous month caps both comparison windows, while preserving total window', async () => {
  const calls: unknown[][] = [];
  const result = await executeMeterPlan({ ...plan, intent: 'comparison', period: 'this_month' },
    { ...context, asOf: '2026-03-31T05:00:00.000Z' }, async (_sql, values) => {
      calls.push(values);
      return [{ resource: 'DI Water', unit: 'm3', usage: 1 }];
    });
  assert.equal(calls.length, 3);
  assert.equal(Date.parse(String(calls[1][1])) - Date.parse(String(calls[1][0])), Date.parse(String(calls[2][1])) - Date.parse(String(calls[2][0])));
  assert.equal(result.window.end, '2026-03-31T05:00:00.000Z');
});

test('PostgreSQL fixture exercises every intent and independently known spike', { skip: process.env.METER_DB_TEST !== '1' }, async () => {
  const { withMeterSnapshot } = await import('../server/meter/data.js');
  const { pool } = await import('../server/db-client.js');
  try {
    for (const intent of ['total', 'ranking', 'comparison', 'anomaly', 'stale', 'explain', 'summary'] as const) {
      const result = await withMeterSnapshot(execute => executeMeterPlan({ ...plan, intent, resource: 'H2SO4' }, context, execute));
      assert.equal(result.status, 'ok');
      if (intent === 'total') assert.ok(Math.abs(Number(result.evidence[0].rows[0].usage) - 612.6) < 1e-6);
      if (intent === 'anomaly') assert.equal(result.evidence[0].rows.filter(row => row.anomalous === true).length, 1);
      if (intent === 'explain') {
        const spike = result.evidence.find(item => item.kind === 'contributors')!.rows[0];
        assert.equal(spike.meter_id, 'meter-03');
        assert.ok(Math.abs(Number(spike.delta) - 180) < 1e-6);
      }
    }
  } finally { await pool.end(); }
});
