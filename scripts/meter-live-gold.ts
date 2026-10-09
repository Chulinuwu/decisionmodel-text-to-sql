import assert from 'node:assert/strict';
import type { Pool } from 'pg';
import type { MeterResponse } from '../shared/meter-api.js';
import type { MeterLiveCase } from './meter-live-cases.js';

const snapshot = Date.parse('2026-10-09T05:00:00Z');
const windows = {
  today: ['2026-10-08T17:00:00Z', '2026-10-09T05:00:00Z', '2026-10-07T17:00:00Z', '2026-10-08T05:00:00Z'],
  yesterday: ['2026-10-07T17:00:00Z', '2026-10-08T17:00:00Z', '2026-10-06T17:00:00Z', '2026-10-07T17:00:00Z'],
  this_week: ['2026-10-04T17:00:00Z', '2026-10-09T05:00:00Z', '2026-09-27T17:00:00Z', '2026-10-02T05:00:00Z'],
  this_month: ['2026-09-30T17:00:00Z', '2026-10-09T05:00:00Z', '2026-08-31T17:00:00Z', '2026-09-09T05:00:00Z'],
};

type RawRow = { id: string; name: string; resource: string; unit: string; floor: number; building: string; recorded_at: Date | null; cumulative_value: number | null; quality: string | null; reset: boolean | null; expected_interval_minutes: number };
type Interval = { start: number; end: number; value: number | null };
type Meter = { row: RawRow; latest: number | null; intervals: Interval[] };

export async function loadMeterGold(pool: Pool) {
  const { rows } = await pool.query<RawRow>('SELECT m.*, r.recorded_at, r.cumulative_value, r.quality, r.reset FROM metering.meters m LEFT JOIN metering.readings r ON r.meter_id=m.id AND r.recorded_at <= $1::timestamptz ORDER BY m.id,r.recorded_at', [new Date(snapshot).toISOString()]);
  const meters = new Map<string, Meter>();
  const previous = new Map<string, RawRow>();
  for (const row of rows) {
    const meter = meters.get(row.id) ?? { row, latest: null, intervals: [] };
    meters.set(row.id, meter);
    if (!row.recorded_at) continue;
    const time = new Date(row.recorded_at).getTime(), old = previous.get(row.id);
    meter.latest = time;
    if (old?.recorded_at) {
      const start = new Date(old.recorded_at).getTime();
      const valid = row.quality === 'valid' && old.quality === 'valid' && !row.reset && row.cumulative_value !== null && old.cumulative_value !== null && row.cumulative_value >= old.cumulative_value && time - start <= row.expected_interval_minutes * 120000;
      meter.intervals.push({ start, end: time, value: valid ? Number(row.cumulative_value) - Number(old.cumulative_value) : null });
    }
    previous.set(row.id, row);
  }
  return [...meters.values()];
}

function usage(meters: Meter[], start: number, end: number, perMeter: boolean) {
  const grouped = new Map<string, { meter_id?: string; resource: string; unit: string; usage: number | null; covered_seconds: number }>();
  for (const meter of meters) {
    const key = perMeter ? meter.row.id : `${meter.row.resource}/${meter.row.unit}`;
    const row = grouped.get(key) ?? { ...(perMeter ? { meter_id: meter.row.id } : {}), resource: meter.row.resource, unit: meter.row.unit, usage: null, covered_seconds: 0 };
    for (const interval of meter.intervals) if (interval.start >= start && interval.end <= end && interval.value !== null) {
      row.usage = (row.usage ?? 0) + interval.value;
      row.covered_seconds += (interval.end - interval.start) / 1000;
    }
    grouped.set(key, row);
  }
  return [...grouped.values()].sort((a, b) => a.resource.localeCompare(b.resource) || a.unit.localeCompare(b.unit) || (b.usage ?? -Infinity) - (a.usage ?? -Infinity) || (a.meter_id ?? '').localeCompare(b.meter_id ?? ''));
}

const rounded = (value: unknown): unknown => typeof value === 'number' ? Math.round(value * 1e6) / 1e6 : value;
const project = (rows: Record<string, unknown>[], keys: string[]) => rows.map(row => keys.map(key => rounded(row[key] ?? null)));

export function checkMeterGold(test: MeterLiveCase, response: MeterResponse, allMeters: Meter[]) {
  if (test.status === 'clarify') { assert.equal(response.status, 'clarify'); return; }
  assert.equal(response.status, 'ok', response.status === 'clarify' ? response.message : '');
  if (response.status !== 'ok') return;
  assert.equal(response.result.status, 'ok');
  assert.equal(Date.parse(response.context.asOf), snapshot);
  assert.equal(response.context.timezone, 'Asia/Bangkok');
  const { plan, evidence, text } = response.result;
  for (const field of ['intent', 'period', 'resource', 'floor', 'limit', 'staleMinutes'] as const) if (test[field] !== undefined) assert.equal(plan[field], test[field], field);
  assert.equal(plan.building, test.building ?? null);
  assert.equal(plan.resource, test.resource ?? null);
  assert.equal(plan.floor, test.floor ?? null);
  const meters = allMeters.filter(meter => (!test.resource || meter.row.resource === test.resource) && (!test.building || meter.row.building === test.building) && (test.floor === undefined || meter.row.floor === test.floor));
  const part = (kind: string) => { const result = evidence.find(item => item.kind === kind); assert.ok(result, `Missing ${kind} evidence`); return result.rows; };
  const stale = () => {
    const expected = meters.filter(meter => meter.latest === null || meter.latest < snapshot - (test.staleMinutes ?? 60) * 60000).map(meter => meter.row.id).sort();
    assert.deepEqual(part('stale').map(row => row.meter_id).sort(), expected);
  };
  if (test.intent === 'stale') { stale(); return; }
  const period = test.period ?? 'today';
  assert.ok(period in windows);
  const bounds = Object.entries(windows).find(([key]) => key === period)?.[1];
  assert.ok(bounds);
  const [start, end, priorStart, priorEnd] = bounds.map(Date.parse);
  assert.deepEqual(Object.values(response.result.window).map(Date.parse), [start, end, priorStart, priorEnd]);
  if (test.intent === 'anomaly') {
    const expected = meters.filter(meter => {
      const current = usage([meter], start, end, true)[0];
      const baseline = Array.from({ length: 28 }, (_, day) => usage([meter], start - (day + 1) * 86400000, end - (day + 1) * 86400000, true)[0]).filter(row => row.usage !== null && row.covered_seconds >= (end - start) / 1000 * .95).map(row => Number(row.usage));
      if (baseline.length < 7 || current.usage === null || current.covered_seconds < (end - start) / 1000 * .95) return false;
      const mean = baseline.reduce((a, b) => a + b, 0) / baseline.length;
      const deviation = Math.sqrt(baseline.reduce((sum, n) => sum + (n - mean) ** 2, 0) / (baseline.length - 1));
      return Math.abs(current.usage - mean) > Math.max(deviation * 3, Math.abs(mean) * .5, .000001);
    }).map(meter => meter.row.id).sort();
    assert.deepEqual(part('anomaly').filter(row => row.anomalous === true).map(row => row.meter_id).sort(), expected);
    assert.match(text, new RegExp(`^${expected.length} meter`));
    return;
  }
  const perMeter = test.intent === 'ranking';
  const keys = [...(perMeter ? ['meter_id'] : []), 'resource', 'unit', 'usage'];
  const current = usage(meters, start, end, perMeter).slice(0, plan.limit);
  assert.deepEqual(project(part('usage'), keys), project(current, keys));
  if (['comparison', 'explain', 'summary'].includes(test.intent ?? '')) {
    const previous = usage(meters, priorStart, priorEnd, perMeter).slice(0, plan.limit);
    assert.deepEqual(project(part('previous_usage'), keys), project(previous, keys));
    const expected = current.map(row => {
      const prior = previous.find(old => old.resource === row.resource && old.unit === row.unit && old.meter_id === row.meter_id);
      const delta = row.usage === null || prior?.usage == null ? null : row.usage - prior.usage;
      return { ...row, delta, percent_change: delta === null || !prior?.usage ? null : delta / prior.usage * 100 };
    });
    assert.deepEqual(project(part('comparison'), ['meter_id', 'resource', 'unit', 'delta', 'percent_change']), project(expected, ['meter_id', 'resource', 'unit', 'delta', 'percent_change']));
  }
  if (test.intent === 'explain') {
    const priorMeters = usage(meters, priorStart, priorEnd, true);
    const contributors = usage(meters, start, end, true).map(row => {
      const old = priorMeters.find(prior => prior.meter_id === row.meter_id);
      const delta = row.usage === null || old?.usage == null ? null : row.usage - old.usage;
      return { ...row, current_usage: row.usage, previous_usage: old?.usage ?? null, delta, percent_change: delta === null || !old?.usage ? null : delta / old.usage * 100 };
    }).sort((a, b) => (b.delta ?? -Infinity) - (a.delta ?? -Infinity) || (a.meter_id ?? '').localeCompare(b.meter_id ?? '')).slice(0, plan.limit);
    assert.deepEqual(project(part('contributors'), ['meter_id', 'current_usage', 'previous_usage', 'delta', 'percent_change']), project(contributors, ['meter_id', 'current_usage', 'previous_usage', 'delta', 'percent_change']));
    assert.match(text, /cannot establish why/i);
  }
  if (test.intent === 'summary') {
    assert.deepEqual(project(part('ranking'), ['meter_id', 'usage']), project(usage(meters, start, end, true).slice(0, plan.limit), ['meter_id', 'usage']));
    stale();
  }
  if (test.intent === 'total' || test.intent === 'summary') for (const row of current) if (row.usage !== null) assert.ok(text.includes(Number(row.usage).toFixed(2)));
}
