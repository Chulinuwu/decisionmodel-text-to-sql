import assert from 'node:assert/strict';
import { meterCatalog, generateMeterReadings } from '../server/meter/data-fixture.js';

export function createMeterUsageOracle() {
  const intervals = new Map<string, { start: number; end: number; usage: number }[]>();
  const readings = generateMeterReadings();
  for (const meter of meterCatalog) {
    const ordered = readings.filter(reading => reading.meter_id === meter.id).sort((left, right) => left.recorded_at.localeCompare(right.recorded_at));
    intervals.set(meter.id, ordered.flatMap((reading, index) => {
      const previous = ordered[index - 1];
      if (!previous || reading.reset || reading.quality !== 'valid' || previous.quality !== 'valid') return [];
      const start = Date.parse(previous.recorded_at), end = Date.parse(reading.recorded_at);
      const usage = reading.cumulative_value - previous.cumulative_value;
      return usage < 0 || end - start > meter.expected_interval_minutes * 60_000 ? [] : [{ start, end, usage }];
    }));
  }
  return (parameters: unknown[], rows: Record<string, unknown>[], perMeter: boolean) => {
    const [start, end, resource, building, floor] = parameters;
    const totals = new Map<string, number | null>();
    for (const meter of meterCatalog.filter(meter => (resource === null || meter.resource === resource) && (building === null || meter.building === building) && (floor === null || meter.floor === floor))) {
      const key = perMeter ? meter.id : JSON.stringify([meter.resource, meter.unit]);
      if (!totals.has(key)) totals.set(key, null);
      for (const interval of intervals.get(meter.id)!) {
        if (interval.start >= Date.parse(String(start)) && interval.end <= Date.parse(String(end))) totals.set(key, (totals.get(key) ?? 0) + interval.usage);
      }
    }
    if (!perMeter) assert.equal(rows.length, totals.size);
    for (const row of rows) {
      const key = perMeter ? String(row.meter_id) : JSON.stringify([row.resource, row.unit]);
      assert(totals.has(key));
      const expected = totals.get(key);
      if (expected === null) assert.equal(row.usage, null);
      else assert(Math.abs(Number(row.usage) - expected!) < Math.max(1e-7, Math.abs(expected!) * 1e-10), `Usage oracle mismatch: ${key}`);
    }
  };
}
