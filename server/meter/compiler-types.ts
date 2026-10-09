export type MeterQuery = { kind: string; sql: string; parameters: unknown[] };
export type MeterExecute = (sql: string, parameters: unknown[]) => Promise<Record<string, unknown>[]>;
