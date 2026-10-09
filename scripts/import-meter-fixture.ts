import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { config } from '../server/config.js';
import { meterCatalog, generateMeterReadings } from '../server/meter/data-fixture.js';
import { fixtureAsOf, fixtureProvenance } from '../server/meter/data-config.js';

const ddl = await readFile(new URL('../server/meter/data.sql', import.meta.url), 'utf8');
const readings = generateMeterReadings();
const fingerprint = createHash('sha256').update(JSON.stringify({ meterCatalog, readings, fixtureAsOf, fixtureProvenance, ddl })).digest('hex');
const client = new pg.Client({ host: config.dbHost, port: config.dbPort, database: config.database, ...config.importer });
await client.connect();
try {
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(68413973)');
  await client.query(ddl);
  const { rows } = await client.query('SELECT fingerprint FROM metering.fixture_manifest WHERE singleton');
  if (rows[0]?.fingerprint !== fingerprint) {
    await client.query('DELETE FROM metering.readings; DELETE FROM metering.meters; DELETE FROM metering.fixture_manifest');
    for (const meter of meterCatalog) await client.query('INSERT INTO metering.meters SELECT * FROM jsonb_populate_record(NULL::metering.meters, $1::jsonb)', [JSON.stringify(meter)]);
    for (let index = 0; index < readings.length; index += 2000) {
      await client.query('INSERT INTO metering.readings SELECT * FROM jsonb_populate_recordset(NULL::metering.readings, $1::jsonb)', [JSON.stringify(readings.slice(index, index + 2000))]);
    }
    await client.query('INSERT INTO metering.fixture_manifest(singleton,fingerprint,as_of,provenance) VALUES(true,$1,$2,$3)', [fingerprint, fixtureAsOf, fixtureProvenance]);
  }
  await client.query('COMMIT');
  console.log(JSON.stringify({ unchanged: rows[0]?.fingerprint === fingerprint, fingerprint, meters: meterCatalog.length, readings: readings.length, asOf: fixtureAsOf, synthetic: true }));
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally { await client.end(); }
