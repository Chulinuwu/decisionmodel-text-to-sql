import type { FixtureMeter } from './data-schema.js';

const unique = <T>(values: T[]) => [...new Set(values)];

// Decision keys are positional (r_0, b_0), so dataset labels and runtime prompts must derive catalog order here, independent of row order.
export function meterCatalogAxes(meters: Pick<FixtureMeter, 'resource' | 'building' | 'floor'>[]) {
  return {
    resources: unique(meters.map(meter => meter.resource)).sort(),
    buildings: unique(meters.map(meter => meter.building)).sort(),
    floors: unique(meters.map(meter => meter.floor)).sort((left, right) => left - right),
  };
}
