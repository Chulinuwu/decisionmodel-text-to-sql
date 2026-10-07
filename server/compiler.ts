import { queryPlanSchema, type DatabaseSchema, type Plan } from '../shared/query-schema.js';
import type { Compiled } from './compile/compile.types.js';
import { compileAnomaly } from './compile/compile-anomaly.js';
import { compilePeriodChange } from './compile/compile-period-change.js';
import { compileSelect } from './compile/compile-select.js';

export function compile(input: Plan, schema: DatabaseSchema, question: string): Compiled {
  const plan = queryPlanSchema.parse(input);
  if (plan.kind === 'anomaly') return compileAnomaly(plan, schema, question);
  if (plan.kind === 'period_change') return compilePeriodChange(plan, schema, question);
  return compileSelect(plan, schema, question);
}
