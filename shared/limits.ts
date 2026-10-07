import type { Plan } from './query-schema.js';

// Row limits the planner applies when the question does not ask for a specific count. The UI uses them to tell a
// default cap (more rows may exist) from an explicit top-N request.
export const defaultRowLimits = { select: 100, anomaly: 20, period_change: 100 } satisfies Record<Plan['kind'], number>;
