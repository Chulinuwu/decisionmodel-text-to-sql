import type { MeterPlan } from '../shared/meter-schema.js';

export type MeterScenario = {
  question: string;
  family: string;
  category: string;
  previous?: MeterPlan;
  plan: MeterPlan | null;
  labels: Record<string, string>;
};
export type MeterDatasetRow = {
  id: string; family_id: string; split: string; language: 'en'; source: string;
  category: string; question: string; state: string; questions: string; decisions: string;
  expected_plan: string; expected_status: string; expected_evidence_sha256: string;
  sql_queries: string; synthetic: true;
};
