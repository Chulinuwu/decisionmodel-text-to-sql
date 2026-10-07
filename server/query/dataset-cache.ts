import { config } from '../config.js';
import { datasetInfo } from '../db-client.js';
import type { DatasetInfo } from '../../shared/schema.js';

let cached: { value: Promise<DatasetInfo>; at: number } | undefined;

export function cachedDatasetInfo(): Promise<DatasetInfo> {
  if (cached && Date.now() - cached.at < config.datasetCacheMs) return cached.value;
  const entry = { value: datasetInfo(), at: Date.now() };
  // A failed read must not be cached, otherwise the UI retry button cannot recover after the database starts.
  entry.value.catch(() => { if (cached === entry) cached = undefined; });
  cached = entry;
  return entry.value;
}
