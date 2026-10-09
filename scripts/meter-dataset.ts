import assert from 'node:assert/strict';
import { mkdir, open, readFile, unlink } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { config } from '../server/config.js';
import { fixtureProvenance } from '../server/meter/data-config.js';
import { meterScenarios } from './meter-dataset-scenarios.js';
import { assignMeterSplits, hash, validateMeterScenario } from './meter-dataset-validation.js';
import { atomicMeterWrite, meterSourceFingerprint, readMeterCheckpoint } from './meter-dataset-storage.js';
import { datasetSplits, meterDatasetContext, meterReleasePath } from './meter-dataset-config.js';
import type { MeterDatasetRow } from './meter-dataset-types.js';
import { createMeterUsageOracle } from './meter-dataset-oracle.js';

const root = fileURLToPath(new URL('..', import.meta.url));
await mkdir(dirname(meterReleasePath), { recursive: true });
const lockPath = `${meterReleasePath}.lock`;
const lock = await open(lockPath, 'wx');
await lock.writeFile(JSON.stringify({ pid: process.pid }));
const client = new pg.Client({ host: config.dbHost, port: config.dbPort, database: config.database, ...config.analyst });
try {
  await client.connect();
  await client.query('BEGIN READ ONLY');
  await client.query("SET LOCAL statement_timeout = '30s'");
  const fixture = (await client.query('SELECT fingerprint,as_of,provenance FROM metering.fixture_manifest WHERE singleton')).rows[0];
  assert(fixture?.provenance.synthetic === true);
  assert.equal(new Date(fixture.as_of).toISOString(), meterDatasetContext.asOf);
  const codeFingerprint = await meterSourceFingerprint(root);
  const fingerprint = hash(codeFingerprint + fixture.fingerprint);
  const scenarios = meterScenarios();
  const splits = assignMeterSplits(scenarios);
  const rows: MeterDatasetRow[] = [];
  const cache = new Map<string, Record<string, unknown>[]>();
  const verifyUsage = createMeterUsageOracle();
  const execute = async (sql: string, parameters: unknown[]) => {
    const key = hash(JSON.stringify([sql, parameters]));
    if (!cache.has(key)) {
      const result = (await client.query(sql, parameters)).rows;
      if (sql.includes('COUNT(DISTINCT m.id)::int AS meter_count')) verifyUsage(parameters, result, sql.includes('m.id AS meter_id'));
      cache.set(key, result);
    }
    return cache.get(key)!;
  };
  for (let start = 0; start < scenarios.length; start += 100) {
    const path = join(dirname(meterReleasePath), 'checkpoints', fingerprint, `${start}.json`);
    const checkpoint = await readMeterCheckpoint(path);
    if (checkpoint) {
      const saved = JSON.parse(checkpoint);
      assert.equal(hash(JSON.stringify(saved.rows)), saved.sha256);
      rows.push(...saved.rows);
    } else {
      const chunk: MeterDatasetRow[] = [];
      for (const scenario of scenarios.slice(start, start + 100)) chunk.push(await validateMeterScenario(scenario, splits.get(scenario.family)!, execute));
      await atomicMeterWrite(path, JSON.stringify({ sha256: hash(JSON.stringify(chunk)), rows: chunk }));
      rows.push(...chunk);
    }
    console.log(`Validated ${rows.length}/${scenarios.length} meter examples`);
  }
  assert.equal(await meterSourceFingerprint(root), codeFingerprint, 'Source changed during build; rerun with new fingerprint');
  assert.equal(new Set(rows.map(row => row.id)).size, rows.length);
  assert.equal(new Set(rows.map(row => row.state)).size, rows.length);
  const artifacts: Record<string, string> = {};
  for (const split of datasetSplits) {
    const selected = rows.filter(row => row.split === split);
    for (const intent of ['total', 'ranking', 'comparison', 'anomaly', 'stale', 'explain', 'summary', 'clarify']) assert(selected.some(row => row.category.split('/')[0] === intent), `${split} missing ${intent}`);
    assert(selected.some(row => row.category.endsWith('/followup')));
    const text = selected.map(row => JSON.stringify(row)).join('\n') + '\n';
    await atomicMeterWrite(join(meterReleasePath, 'meter', `${split}.jsonl`), text);
    artifacts[`meter/${split}.jsonl`] = hash(text);
  }
  for (const name of ['data.sql', 'data-fixture.ts', 'data-config.ts', 'data-schema.ts']) {
    const content = await readFile(join(root, 'server/meter', name), 'utf8');
    await atomicMeterWrite(join(meterReleasePath, 'meter_fixture', name), content);
    artifacts[`meter_fixture/${name}`] = hash(content);
  }
  for (const table of ['meters', 'readings']) {
    const fixtureRows = (await client.query(`SELECT * FROM metering.${table} ORDER BY ${table === 'meters' ? 'id' : 'meter_id,recorded_at'}`)).rows;
    const content = fixtureRows.map(row => JSON.stringify(row)).join('\n') + '\n';
    await atomicMeterWrite(join(meterReleasePath, 'meter_fixture', `${table}.jsonl`), content);
    artifacts[`meter_fixture/${table}.jsonl`] = hash(content);
  }
  await atomicMeterWrite(join(meterReleasePath, 'meter_validation_report.json'), JSON.stringify({
    version: '1.0', status: 'draft', human_reviewed: false, rows: rows.length,
    families: splits.size, language: 'en', synthetic: true, provenance: fixtureProvenance,
    context: meterDatasetContext, source_fingerprint: codeFingerprint, fixture_fingerprint: fixture.fingerprint,
    build_fingerprint: fingerprint, group_key: 'intent + relative-period semantics + resource/building/floor filter shape; followups grouped with corresponding fresh plans',
    split_counts: Object.fromEntries(datasetSplits.map(split => [split, rows.filter(row => row.split === split).length])),
    category_counts: Object.fromEntries([...new Set(rows.map(row => row.category))].map(category => [category, rows.filter(row => row.category === category).length])),
    family_overlap: 0, duplicate_states: 0, planner_gold_roundtrip_validated: rows.length,
    sql_executed_examples: rows.filter(row => row.expected_plan !== 'null').length,
    sql_validation_note: 'Gold plans executed against the frozen synthetic PostgreSQL fixture. Usage aggregates also checked against an independent raw-reading JavaScript oracle. Anomaly/stale outputs recorded as execution evidence, not independent human review.',
    artifacts,
  }, null, 2));
  await client.query('COMMIT');
  console.log(`Meter dataset complete: ${rows.length} examples at ${meterReleasePath}`);
} finally {
  await client.end();
  await lock.close();
  await unlink(lockPath);
}
