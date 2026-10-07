import { queryPlanSchema, type Plan } from '../../shared/query-schema.js';
import { compile } from '../compiler.js';
import { validateLiteralCoverage } from '../literal-coverage.js';
import { requiredJoins } from '../schema-graph.js';
import type { BuildContext, Combo, ValidatedPlan } from './planning.types.js';
import { enumerateCombos } from './beam.js';
import { buildPlans } from './plan-builder.js';
import { isArbitraryTruncation, normalizePlan } from './plan-normalization.js';
import { waivedSpans } from './slot-predicates.js';
import { planningLimits } from './planning-limits.js';

function validate(ctx: BuildContext, combo: Combo, draft: Plan): ValidatedPlan | null {
  try {
    const normalized = normalizePlan(draft);
    if (isArbitraryTruncation(normalized)) return null;
    const plan = queryPlanSchema.parse({ ...normalized, joins: requiredJoins(normalized, ctx.schema) });
    const compiled = compile(plan, ctx.schema, ctx.question);
    if (validateLiteralCoverage(ctx.question, plan, ctx.schema, waivedSpans(ctx.space, combo, ctx.distributions)).length) return null;
    return { plan, key: `${compiled.sql}\n${JSON.stringify(compiled.values)}` };
  } catch {
    return null;
  }
}

export function buildCandidates(ctx: BuildContext): ValidatedPlan[] {
  const built = new Map<string, ValidatedPlan | null>();
  const evaluate = (combo: Combo) => {
    const id = JSON.stringify(combo);
    if (!built.has(id)) built.set(id, buildPlans(ctx, combo).map(draft => validate(ctx, combo, draft)).find(result => result !== null) ?? null);
    return built.get(id) ?? null;
  };
  return enumerateCombos(ctx.distributions, combo => evaluate(combo)?.key ?? null)
    .flatMap(combo => evaluate(combo) ?? [])
    .slice(0, planningLimits.maxCandidates);
}
