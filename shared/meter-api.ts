import type { MeterContext, MeterPlan, MeterResult } from './meter-schema.js';
import type { Trace, Usage } from './schema.js';

export type MeterDataset = {
  context: MeterContext; resources: string[]; buildings: string[]; floors: number[];
  synthetic: true; fingerprint: string;
};
type MeterResponseMeta = { question: string; trace: Trace[]; usage: Usage; provider: string };
export type MeterResponse = MeterResponseMeta & (
  { status: 'ok'; result: MeterResult; contextId: string; context: MeterContext; synthetic: true; datasetFingerprint: string }
  | { status: 'clarify'; message: string }
);
export type MeterConversation = { plan: MeterPlan; context: MeterContext; datasetFingerprint: string };
