import { meterRequestSchema } from '../../shared/meter-schema.js';
import type { MeterDataset, MeterResponse } from '../../shared/meter-api.js';
import { MeterContextStore, continueMeterConversation } from './context-store.js';
import { planMeterQuestion } from './planner.js';
import { executeMeterPlan } from './service.js';
import { getMeterDataset, withMeterSnapshot } from './data.js';

export const meterConversations = new MeterContextStore();
export async function answerMeterQuestion(input: unknown, signal?: AbortSignal): Promise<MeterResponse> {
  const { question, contextId } = meterRequestSchema.parse(input);
  const dataset: MeterDataset = await getMeterDataset();
  const { previous, contextReset } = continueMeterConversation(meterConversations, contextId, dataset);
  const planned = await planMeterQuestion(question, { ...dataset.context, resources: dataset.resources,
    buildings: dataset.buildings, floors: dataset.floors }, previous?.plan, signal);
  const meta = { question, trace: planned.trace, usage: planned.usage, provider: planned.provider ?? '', contextReset };
  if (planned.status === 'clarify') return { ...meta, status: 'clarify', message: planned.message };
  signal?.throwIfAborted();
  const result = await withMeterSnapshot(async execute => {
    const [manifest] = await execute('SELECT fingerprint FROM metering.fixture_manifest WHERE singleton', []);
    if (manifest?.fingerprint !== dataset.fingerprint) return null;
    return executeMeterPlan(planned.plan, dataset.context, execute);
  }, signal);
  signal?.throwIfAborted();
  if (!result) return { ...meta, status: 'clarify', message: 'The meter dataset changed during planning. Please ask again.' };
  if (result.status === 'clarify') return { ...meta, status: 'clarify', message: result.text };
  return { ...meta, status: 'ok', result, context: dataset.context, synthetic: true, datasetFingerprint: dataset.fingerprint,
    contextId: meterConversations.save({ plan: planned.plan, context: dataset.context, datasetFingerprint: dataset.fingerprint }) };
}
