import { createHash } from 'node:crypto';
import { mkdir, open, readFile, readdir, rename, unlink } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { pool } from '../server/db-client.js';
import { answerMeterQuestion, meterConversations } from '../server/meter/answer-question.js';
import { meterContextSchema, meterPlanSchema } from '../shared/meter-schema.js';
import { meterLiveCases } from './meter-live-cases.js';
import { meterHeldoutCases } from './meter-heldout-cases.js';
import { checkMeterGold, loadMeterGold } from './meter-live-gold.js';

const checkpointSchema = z.object({
  fingerprint: z.string(), fixtureFingerprint: z.string(), planned: z.array(z.string()),
  cost: z.number().nonnegative(), inFlight: z.string().nullable(),
  outcomes: z.array(z.object({
    id: z.string(), correct: z.boolean(), cost: z.number().nonnegative(), error: z.string().optional(), response: z.unknown(),
    disposition: z.enum(['evaluated', 'skipped_due_to_missing_context', 'request_failed']).optional(),
    conversation: z.object({ plan: meterPlanSchema, context: meterContextSchema, datasetFingerprint: z.string() }).optional(),
  })),
});

const { values } = parseArgs({ options: {
  output: { type: 'string', default: 'reports/meter-live.json' }, limit: { type: 'string' },
  suite: { type: 'string', default: 'regression' },
  'max-cost': { type: 'string', default: '1' }, 'dry-run': { type: 'boolean', default: false },
} });
if (!['regression', 'heldout'].includes(values.suite)) throw new Error('Suite must be regression or heldout');
const cases = values.suite === 'heldout' ? meterHeldoutCases : meterLiveCases;
const limit = Number(values.limit ?? cases.length), maxCost = Number(values['max-cost']);
if (!Number.isInteger(limit) || limit < 1 || limit > cases.length || !Number.isFinite(maxCost) || maxCost <= 0 || maxCost > 1) throw new Error(`Require limit 1..${cases.length} and max-cost > 0 and <= 1 USD`);
const output = path.resolve(values.output), planned = cases.slice(0, limit);
await mkdir(path.dirname(output), { recursive: true });
const lock = await open(`${output}.lock`, 'wx');

async function save(report: z.infer<typeof checkpointSchema>) {
  const file = await open(`${output}.part`, 'w');
  try { await file.writeFile(JSON.stringify(report, null, 2)); await file.sync(); } finally { await file.close(); }
  await rename(`${output}.part`, output);
}

try {
  const fingerprint = createHash('sha256');
  for (const directory of ['server', 'shared', 'scripts']) {
    for (const name of (await readdir(directory, { recursive: true })).sort()) {
      if (!name.endsWith('.ts') && !name.endsWith('.sql')) continue;
      if (directory === 'scripts' && !name.includes('meter')) continue;
      fingerprint.update(`${directory}/${name}`).update(await readFile(path.join(directory, name)));
    }
  }
  const gold = await loadMeterGold(pool);
  const fixtureFingerprint = createHash('sha256').update(JSON.stringify(gold)).digest('hex');
  const sourceFingerprint = fingerprint.digest('hex');
  let report: z.infer<typeof checkpointSchema>;
  try { report = checkpointSchema.parse(JSON.parse(await readFile(output, 'utf8'))); }
  catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    report = { fingerprint: sourceFingerprint, fixtureFingerprint, planned: [], cost: 0, inFlight: null, outcomes: [] };
  }
  if (report.fingerprint !== sourceFingerprint || report.fixtureFingerprint !== fixtureFingerprint) throw new Error('Checkpoint source or fixture changed. Preserve this report and use a new output path.');
  if (report.inFlight) throw new Error(`Unresolved request ${report.inFlight}; inspect billing and checkpoint before continuing. No request was resent.`);
  if (report.outcomes.some(outcome => outcome.error?.startsWith('Request failed:'))) throw new Error('Prior request failed with uncertain billing. Inspect before continuing.');
  if (report.outcomes.some((outcome, index) => outcome.id !== planned[index]?.id)) throw new Error('Checkpoint cases are not a prefix of requested cases');
  report.planned = planned.map(test => test.id);
  await save(report);
  if (values['dry-run']) {
    console.log(JSON.stringify({ dryRun: true, suite: values.suite, cases: planned, sourceFingerprint, fixtureFingerprint, completed: report.outcomes.length, output }));
  } else {
    for (const test of planned.slice(report.outcomes.length)) {
      if (report.cost >= maxCost) throw new Error(`Reported-cost ceiling reached: ${report.cost} USD. One in-flight call may cross the ceiling.`);
      let contextId: string | undefined;
      if (test.previous) {
        const previous = report.outcomes.find(outcome => outcome.id === test.previous)?.conversation;
        if (!previous) {
          report.outcomes.push({ id: test.id, correct: false, cost: 0, response: null, disposition: 'skipped_due_to_missing_context', error: `Required successful context ${test.previous} is unavailable; no model request sent` });
          await save(report);
          console.log(JSON.stringify({ id: test.id, disposition: 'skipped_due_to_missing_context', cost: 0 }));
          continue;
        }
        contextId = meterConversations.save(previous);
      }
      report.inFlight = test.id;
      await save(report);
      let response;
      try { response = await answerMeterQuestion({ question: test.question, ...(contextId ? { contextId } : {}) }); }
      catch (error) {
        report.outcomes.push({ id: test.id, correct: false, cost: 0, response: null, disposition: 'request_failed', error: `Request failed: ${error instanceof Error ? error.message : String(error)}` });
        await save(report);
        throw error;
      }
      const cost = response.usage.cost;
      if (!Number.isFinite(cost) || cost < 0) throw new Error('Unknown cost; checkpoint remains unresolved');
      let error: string | undefined;
      try { checkMeterGold(test, response, gold); } catch (failure) { error = failure instanceof Error ? failure.message : String(failure); }
      report.cost += cost;
      report.outcomes.push({ id: test.id, correct: !error, cost, disposition: 'evaluated', ...(error ? { error } : {}), response,
        ...(response.status === 'ok' ? { conversation: { plan: response.result.plan, context: response.context, datasetFingerprint: response.datasetFingerprint } } : {}),
      });
      report.inFlight = null;
      await save(report);
      console.log(JSON.stringify({ id: test.id, correct: !error, status: response.status, cost, totalCost: report.cost, ...(error ? { error } : {}) }));
    }
    console.log(JSON.stringify({ output, suite: values.suite, completed: report.outcomes.length, evaluated: report.outcomes.filter(outcome => outcome.disposition === 'evaluated').length, skipped: report.outcomes.filter(outcome => outcome.disposition === 'skipped_due_to_missing_context').length, correct: report.outcomes.filter(outcome => outcome.correct).length, cost: report.cost }));
    if (report.outcomes.some(outcome => !outcome.correct)) process.exitCode = 1;
  }
} finally { await lock.close(); await unlink(`${output}.lock`); await pool.end(); }
