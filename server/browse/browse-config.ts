import { relationNames } from '../../shared/query-schema.js';

// The only source of SQL identifiers for row browsing. Keys are the web registry's database ids.
export const browseRelations: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  'brazilian-ecommerce': Object.fromEntries(relationNames.map(name => [name, `analytics."${name}"`])),
  'synthetic-meters': { meters: 'metering.meters', readings: 'metering.readings' },
};
