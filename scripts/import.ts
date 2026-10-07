import { createReadStream } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { pipeline } from 'node:stream/promises';
import pg from 'pg';
import { from } from 'pg-copy-streams';
import { config } from '../server/config.js';
import { files } from './import-config.js';

const client = new pg.Client({ host: config.dbHost, port: config.dbPort, database: config.database, ...config.importer });
await client.connect();
try {
  const manifest = JSON.parse(await readFile('data/download.json', 'utf8'));
  const importChecksum = createHash('sha256').update(manifest.sha256).update(await readFile('scripts/analytics.sql')).digest('hex');
  await client.query('BEGIN');
  await client.query('SELECT pg_advisory_xact_lock(68413972)');
  const existing = await client.query("SELECT to_regclass('analytics.import_manifest') present");
  if (existing.rows[0].present) {
    const same = await client.query('SELECT count(*)::int n FROM analytics.import_manifest WHERE checksum = $1', [importChecksum]);
    if (same.rows[0].n === Object.keys(files).length) {
      await client.query('COMMIT');
      console.log('Dataset already imported with matching checksum. Nothing changed.');
      process.exitCode = 0;
    } else await importDataset(importChecksum);
  } else await importDataset(importChecksum);
} catch (error) {
  await client.query('ROLLBACK');
  console.error(error instanceof Error ? error.message : 'Import failed');
  process.exitCode = 1;
} finally { await client.end(); }

async function importDataset(checksum: string) {
  await client.query('DROP SCHEMA IF EXISTS analytics CASCADE; DROP SCHEMA IF EXISTS raw CASCADE; CREATE SCHEMA raw; CREATE SCHEMA analytics; CREATE TABLE analytics.import_manifest (name text PRIMARY KEY, row_count bigint NOT NULL, checksum text NOT NULL, imported_at timestamp NOT NULL DEFAULT now())');
  for (const [name, file] of Object.entries(files)) {
    const stream = createReadStream(`data/${file}`, { encoding: 'utf8', highWaterMark: 4096 });
    let header = '';
    for await (const chunk of stream) { header += chunk; if (header.includes('\n')) break; }
    stream.destroy();
    const columns = header.split('\n')[0].replace(/^\uFEFF/, '').replace(/\r$/, '').split(',').map(column => column.replace(/^"|"$/g, ''));
    if (columns.some(column => !/^[a-z_]+$/.test(column))) throw new Error(`Unexpected CSV header: ${name}`);
    await client.query(`CREATE TABLE raw.${name} (${columns.map(column => `"${column}" text`).join(', ')})`);
    await pipeline(createReadStream(`data/${file}`), client.query(from(`COPY raw.${name} FROM STDIN WITH (FORMAT csv, HEADER true, NULL '', FORCE_NULL (${columns.join(', ')}))`)));
    const { rows: [{ count }] } = await client.query(`SELECT count(*) FROM raw.${name}`);
    await client.query('INSERT INTO analytics.import_manifest(name, row_count, checksum) VALUES($1,$2,$3)', [name, count, checksum]);
    console.log(`${name}: ${count} rows`);
  }
  await client.query(await readFile('scripts/analytics.sql', 'utf8'));
  await client.query("DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='analyst') THEN CREATE ROLE analyst LOGIN PASSWORD 'local-read-only'; END IF; END $$; ALTER ROLE analyst SET default_transaction_read_only = on; REVOKE ALL ON SCHEMA raw FROM PUBLIC, analyst; REVOKE ALL ON SCHEMA analytics FROM PUBLIC; REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT USAGE ON SCHEMA analytics TO analyst; GRANT SELECT ON ALL TABLES IN SCHEMA analytics TO analyst");
  const checks = await client.query('SELECT (SELECT count(*) FROM analytics.orders)::int orders, (SELECT count(*) FROM analytics.items)::int items, (SELECT count(*) FROM raw.orders) = (SELECT count(*) FROM analytics.orders) orders_match, (SELECT count(*) FROM raw.items) = (SELECT count(*) FROM analytics.items) items_match, (SELECT sum(price::numeric) FROM raw.items) = (SELECT sum(revenue) FROM analytics.orders) revenue_matches, (SELECT sum(payment_value::numeric) FROM raw.payments) = (SELECT sum(payment_total) FROM analytics.orders) payments_match');
  if (!checks.rows[0].orders_match || !checks.rows[0].items_match || !checks.rows[0].revenue_matches || !checks.rows[0].payments_match) throw new Error('Aggregate consistency check failed');
  await client.query('COMMIT');
  console.log('Import committed. ' + JSON.stringify(checks.rows[0]));
}
