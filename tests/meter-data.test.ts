import assert from 'node:assert/strict';
import { test, after } from 'node:test';
import { generateMeterReadings, meterCatalog } from '../server/meter/data-fixture.js';
import { fixtureAsOf, fixtureStart } from '../server/meter/data-config.js';
import { getMeterDataset, withMeterSnapshot } from '../server/meter/data.js';
import { pool } from '../server/db-client.js';

after(async () => { await pool.end(); });

test('synthetic fixture is deterministic, long-lived and contains deliberate faults', () => {
  const rows = generateMeterReadings();
  assert.deepEqual(rows, generateMeterReadings());
  assert.equal(meterCatalog.length, 15);
  assert.ok(Date.parse(fixtureAsOf) - Date.parse(fixtureStart) >= 90 * 86400000);
  assert.equal(new Set(rows.map(row => `${row.meter_id}/${row.recorded_at}`)).size, rows.length);
  assert.ok(rows.some(row => row.reset));
  assert.ok(rows.some(row => row.quality === 'invalid'));
  assert.ok(rows.some(row => row.recorded_at > fixtureAsOf));
  assert.ok(!rows.some(row => row.meter_id === 'meter-15'));
});

test('database view rejects reset, missing and invalid intervals and preserves boundary delta', { skip: !process.env.METER_DB_TEST }, async () => {
  const dataset = await getMeterDataset();
  assert.equal(dataset.context.asOf, fixtureAsOf);
  await withMeterSnapshot(async execute => {
    const warnings = await execute('SELECT warning_reason, count(*)::int n FROM metering.interval_usage WHERE warning_reason IS NOT NULL GROUP BY warning_reason', []);
    for (const reason of ['meter_reset', 'invalid_reading', 'missing_readings', 'no_previous_reading']) assert.ok(warnings.some(row => row.warning_reason === reason));
    const [invalid] = await execute('SELECT count(*)::int n FROM metering.interval_usage WHERE warning_reason IS NOT NULL AND usage IS NOT NULL', []);
    assert.equal(invalid.n, 0);
    const [boundary] = await execute("SELECT usage FROM metering.interval_usage WHERE meter_id='meter-01' AND interval_start='2026-10-08T17:00:00Z'", []);
    const readings = generateMeterReadings().filter(row => row.meter_id === 'meter-01');
    const start = readings.find(row => row.recorded_at === '2026-10-08T17:00:00.000Z')!;
    const end = readings.find(row => row.recorded_at === '2026-10-08T18:00:00.000Z')!;
    assert.equal(Number(boundary.usage), end.cumulative_value - start.cumulative_value);
    const [transaction] = await execute("SELECT current_setting('transaction_isolation') isolation, current_setting('transaction_read_only') readonly", []);
    assert.equal(transaction.isolation, 'repeatable read');
    assert.equal(transaction.readonly, 'on');
  });
});

test('analyst snapshot cannot mutate fixture data', { skip: !process.env.METER_DB_TEST }, async () => {
  await assert.rejects(withMeterSnapshot(execute => execute('DELETE FROM metering.readings', [])), /read-only|permission denied/);
});
