import type { Distributions, ShapeSpace } from './planning.types.js';
import { planningLimits } from './planning-limits.js';

// A value link with no exact token in the question rests on the model alone; the unlinked reading always stays in the
// beam (with at least the inclusion floor) so the ranking step can still prefer "no filter".
export function keepUnlinkedReadings(distributions: Distributions, space: ShapeSpace): Distributions {
  const result: Distributions = { ...distributions };
  for (const link of space.links) {
    const options = distributions[link.questionId];
    if (!options) continue;
    const evidence = new Set(space.slots.flatMap(slot => slot.kind === 'enum' && slot.dimensions.includes(link.dimension) ? [slot.value] : []));
    const unsupported = options.some(option => option.key !== 'none' && option.p >= planningLimits.minOptionProbability && !evidence.has(link.values.get(option.key) ?? ''));
    if (!unsupported) continue;
    const none = options.find(option => option.key === 'none');
    const kept = { key: 'none', p: Math.max(none?.p ?? 0, planningLimits.minOptionProbability), keep: true };
    result[link.questionId] = [...options.filter(option => option.key !== 'none'), kept].sort((a, b) => b.p - a.p);
  }
  return result;
}
