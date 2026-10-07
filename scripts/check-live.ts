import { parseArgs } from 'node:util';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import pg from 'pg';
import { answerQuestion } from '../server/query/answer-question.js';
import { config } from '../server/config.js';
import { pool } from '../server/db-client.js';
import { loadCases } from './live-case-file.js';
import { failingOutcomes, fingerprintDirectories, outcomes, reportDirectory } from './live-eval-config.js';
import { evaluate, logLine } from './live-evaluate.js';
import type { Report } from './live-eval.types.js';

const { values } = parseArgs({ options: { limit: { type: 'string' }, offset: { type: 'string', default: '0' }, cases: { type: 'string' } } });
const { suite, cases } = await loadCases(values.cases);
const limit = Number(values.limit ?? cases.length), offset = Number(values.offset);
if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(offset) || offset < 0) throw new Error('Invalid --limit/--offset');
const planned = cases.slice(offset, offset + limit);
const goldClient = new pg.Client({ host: config.dbHost, port: config.dbPort, database: config.database, ...config.importer });
await goldClient.connect();
const reports: Report[] = [];
await mkdir(reportDirectory, { recursive: true });
const reportPath = `${reportDirectory}/live-${suite}-${Date.now()}.json`, fingerprint = createHash('sha256');
for (const directory of fingerprintDirectories) for (const file of (await readdir(directory, { recursive: true })).filter(file => file.endsWith('.ts')).sort()) fingerprint.update(`${directory}/${file}`).update(await readFile(`${directory}/${file}`));
const sourceFingerprint = fingerprint.digest('hex');

async function checkpoint(completed = false) {
  const summary = Object.fromEntries(outcomes.map(outcome => [outcome, reports.filter(report => report.outcome === outcome).length]));
  const clefCalls = reports.reduce((total, report) => total + (report.clefCalls ?? 0), 0);
  await writeFile(`${reportPath}.part`, JSON.stringify({ createdAt: new Date().toISOString(), suite, casesFile: values.cases ?? null, sourceFingerprint, completed, plannedCases: planned.length, completedCases: reports.length, summary, clefCalls, reports }, null, 2));
  await rename(`${reportPath}.part`, reportPath);
  return summary;
}

try {
  await checkpoint();
  for (const test of planned) {
    let report: Report;
    try {
      const response = await answerQuestion(test.question);
      report = await evaluate(test, response, test.gold ? await goldClient.query(test.gold) : null);
    } catch (error) {
      report = { question: test.question, outcome: 'error', error: error instanceof Error ? error.message : 'Unknown query error' };
    }
    reports.push(report);
    console.log(JSON.stringify(logLine(report)));
    await checkpoint();
  }
  console.log(JSON.stringify({ reportPath, suite, summary: await checkpoint(true) }));
  if (reports.some(report => failingOutcomes.includes(report.outcome))) process.exitCode = 1;
} finally { await goldClient.end(); await pool.end(); }
