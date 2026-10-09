import { meterCatalog } from '../server/meter/data-fixture.js';
import { meterCatalogAxes } from '../server/meter/catalog-order.js';
import { fixtureAsOf } from '../server/meter/data-config.js';
import type { MeterPlanningContext } from '../server/meter/planner.js';
import { fileURLToPath } from 'node:url';

export const meterDatasetContext: MeterPlanningContext = {
  asOf: fixtureAsOf, timezone: 'Asia/Bangkok',
  ...meterCatalogAxes(meterCatalog),
};
export const periodText = {
  today: 'today', yesterday: 'yesterday', this_week: 'this week', last_week: 'last week',
  this_month: 'this month', last_month: 'last month',
};
export const datasetSplits = ['train', 'dev', 'calibration', 'test'] as const;
export const meterReleasePath = process.env.METER_RELEASE_PATH ?? fileURLToPath(new URL('../data/meter-v1/release', import.meta.url));
