import { pool } from '../db-client.js';
import { config } from '../config.js';
import type { MeterExecute } from './data-schema.js';
import { meterContextSchema } from '../../shared/meter-schema.js';
import { meterCatalogAxes } from './catalog-order.js';

export async function withMeterSnapshot<T>(run: (execute: MeterExecute) => Promise<T>, signal?: AbortSignal): Promise<T> {
  signal?.throwIfAborted();
  const client = await pool.connect();
  try {
    await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
    await client.query("SELECT set_config('statement_timeout', $1, true), set_config('TimeZone', 'UTC', true)", [`${config.statementTimeoutMs}ms`]);
    const result = await run(async (sql, params) => {
      signal?.throwIfAborted();
      const result = await client.query(sql, params);
      signal?.throwIfAborted();
      return result.rows;
    });
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

export async function getMeterDataset() {
  return withMeterSnapshot(async execute => {
    const [manifest] = await execute('SELECT as_of, provenance, fingerprint FROM metering.fixture_manifest WHERE singleton', []);
    if (!manifest) throw new Error('Meter fixture has not been imported');
    if (typeof manifest.fingerprint !== 'string' || !/^[a-f0-9]{64}$/.test(manifest.fingerprint)) throw new Error('Invalid meter fixture fingerprint');
    const rows = await execute('SELECT resource, building, floor FROM metering.meters', []);
    return {
      context: meterContextSchema.parse({ asOf: new Date(String(manifest.as_of)).toISOString(), timezone: 'Asia/Bangkok' }),
      ...meterCatalogAxes(rows.map(row => ({ resource: String(row.resource), building: String(row.building), floor: Number(row.floor) }))),
      synthetic: true as const,
      provenance: manifest.provenance,
      fingerprint: manifest.fingerprint,
    };
  });
}
