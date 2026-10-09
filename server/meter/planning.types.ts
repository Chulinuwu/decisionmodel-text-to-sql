import type { MeterContext, MeterPlan } from '../../shared/meter-schema.js';
import type { Trace, Usage } from '../../shared/schema.js';

export type MeterPlanningContext = MeterContext & { resources: string[]; buildings: string[]; floors: number[] };
export type MeterPlanningResult = ({ status: 'ok'; plan: MeterPlan } | { status: 'clarify'; message: string }) & { trace: Trace[]; usage: Usage; provider: string | null };
