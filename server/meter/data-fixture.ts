import { fixtureAsOf, fixtureStart } from './data-config.js';
import type { FixtureMeter, FixtureReading } from './data-schema.js';

export const meterCatalog: FixtureMeter[] = Array.from({ length: 15 }, (_, index) => ({
  id: `meter-${String(index + 1).padStart(2, '0')}`,
  name: `${['DI Water', 'Chemical', 'H2SO4'][index % 3]} ${index + 1}`,
  resource: ['DI Water', 'Chemical', 'H2SO4'][index % 3],
  unit: index % 3 === 0 ? 'm3' : 'L',
  building: index < 9 ? 'A' : 'B',
  floor: Math.floor(index / 3) % 3 + 1,
  expected_interval_minutes: 60,
}));

export function generateMeterReadings(): FixtureReading[] {
  const readings: FixtureReading[] = [];
  const end = Date.parse(fixtureAsOf);
  for (const [index, meter] of meterCatalog.entries()) {
    if (index === 14) continue;
    let cumulative = 1000 + index * 100;
    for (let time = Date.parse(fixtureStart), step = 0; time <= end; time += 3_600_000, step++) {
      const reset = index === 3 && time === Date.parse('2026-10-08T00:00:00Z');
      const today = time > Date.parse('2026-10-08T17:00:00Z');
      const increment = (index + 1) * (1 + step % 6 / 10) * (index === 2 && today ? 5 : 1);
      cumulative = reset ? 0 : Math.round((cumulative + increment) * 1000) / 1000;
      if (index === 12 && time > end - 5 * 3_600_000) continue;
      if (index === 4 && time > end - 9 * 3_600_000 && time < end - 5 * 3_600_000) continue;
      readings.push({ meter_id: meter.id, recorded_at: new Date(time).toISOString(), cumulative_value: cumulative,
        quality: index === 5 && time === end - 2 * 3_600_000 ? 'invalid' : 'valid', reset });
    }
  }
  readings.push({ meter_id: 'meter-14', recorded_at: new Date(end + 3_600_000).toISOString(), cumulative_value: 999999, quality: 'valid', reset: false });
  return readings;
}
