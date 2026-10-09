export interface FixtureMeter {
  id: string;
  name: string;
  resource: string;
  unit: string;
  building: string;
  floor: number;
  expected_interval_minutes: number;
}

export interface FixtureReading {
  meter_id: string;
  recorded_at: string;
  cumulative_value: number;
  quality: 'valid' | 'invalid';
  reset: boolean;
}

export type MeterExecute = (sql: string, params: unknown[]) => Promise<Record<string, unknown>[]>;
