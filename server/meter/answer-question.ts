import { meterRequestSchema } from '../../shared/meter-schema.js';
import type { MeterDataset, MeterResponse } from '../../shared/meter-api.js';
import { MeterContextStore } from './context-store.js';
import { planMeterQuestion } from './planner.js';
import { executeMeterPlan } from './service.js';
import { getMeterDataset, withMeterSnapshot } from './data.js';

export const meterConversations = new MeterContextStore();
export async function answerMeterQuestion(input: unknown, signal?: AbortSignal): Promise<MeterResponse> {
  const { question, contextId } = meterRequestSchema.parse(input);
  const previous = contextId ? meterConversations.get(contextId) : null;
  if (contextId && !previous) return { status: 'clarify', question,
    message: 'The previous meter context expired. Please restate the complete question.',
    trace: [], usage: { input_tokens: 0, output_tokens: 0, cost: 0 }, provider: '' };
  const dataset: MeterDataset = await getMeterDataset();
  if (previous && (previous.datasetFingerprint !== dataset.fingerprint || previous.context.asOf !== dataset.context.asOf || previous.context.timezone !== dataset.context.timezone)) {
    return { status: 'clarify', question, message: 'The dataset clock changed. Please start a new meter conversation.',
      trace: [], usage: { input_tokens: 0, output_tokens: 0, cost: 0 }, provider: '' };
  }
  const planned = await planMeterQuestion(question, { ...dataset.context, resources: dataset.resources,
    buildings: dataset.buildings, floors: dataset.floors }, previous?.plan, signal);
  const meta = { question, trace: planned.trace, usage: planned.usage, provider: planned.provider ?? '' };
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
