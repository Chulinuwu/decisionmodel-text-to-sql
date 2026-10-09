import { z } from 'zod';

export const meterPlanSchema = z.object({
  intent: z.enum(['total', 'ranking', 'comparison', 'anomaly', 'stale', 'explain', 'summary']),
  period: z.enum(['today', 'yesterday', 'this_week', 'last_week', 'this_month', 'last_month']),
  resource: z.string().min(1).max(80).nullable(),
  building: z.string().min(1).max(80).nullable(),
  floor: z.number().int().min(-20).max(300).nullable(),
  limit: z.number().int().min(1).max(100),
  staleMinutes: z.number().int().min(1).max(1440),
}).strict();
export type MeterPlan = z.infer<typeof meterPlanSchema>;
export const meterContextSchema = z.object({
  asOf: z.string().datetime({ offset: true }),
  timezone: z.enum(['Asia/Bangkok', 'UTC']),
}).strict();
export type MeterContext = z.infer<typeof meterContextSchema>;
export type MeterWindow = { start: string; end: string; previousStart: string; previousEnd: string };
export type MeterEvidence = { kind: string; sql: string; parameters: unknown[]; rows: Record<string, unknown>[] };
export type MeterResult = {
  status: 'ok' | 'clarify'; text: string; warnings: string[];
  evidence: MeterEvidence[]; plan: MeterPlan; window: MeterWindow;
};
export const meterRequestSchema = z.object({
  question: z.string().trim().min(3).max(600),
  contextId: z.string().regex(/^[a-f0-9]{32}$/).optional(),
}).strict();
