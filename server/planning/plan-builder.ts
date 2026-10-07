import type { Plan } from '../../shared/query-schema.js';
import type { BuildContext, Combo } from './planning.types.js';
import { planParts } from './plan-parts.js';
import { buildSelect } from './select-builder.js';
import { buildAnomaly } from './anomaly-builder.js';
import { buildPeriodChange } from './change-builder.js';

export function buildPlans(ctx: BuildContext, combo: Combo): Plan[] {
  const measure = ctx.catalog.measures.find(entry => entry.id === combo.target);
  if (!measure) return [];
  const analysis = combo.analysis ?? 'select';
  if (analysis !== 'select' && measure.kind === 'list') return [];
  const roots = measure.kind === 'list' ? [measure.root] : measure.realizations.map(realization => realization.root);
  return roots.flatMap((root, index) => {
    const parts = planParts(ctx, root, combo);
    if (!parts) return [];
    const plan = analysis === 'anomaly' ? buildAnomaly(ctx, measure, index, combo, parts) : analysis === 'period_change' ? buildPeriodChange(ctx, measure, index, combo, parts) : buildSelect(ctx, measure, index, combo, parts);
    return plan ?? [];
  });
}
