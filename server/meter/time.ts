import { meterContextSchema, type MeterContext, type MeterPlan, type MeterWindow } from '../../shared/meter-schema.js';

export function meterWindow(period: MeterPlan['period'], context: MeterContext): MeterWindow {
  meterContextSchema.parse(context);
  const offset = context.timezone === 'Asia/Bangkok' ? 7 * 3600000 : 0;
  const now = new Date(Date.parse(context.asOf) + offset);
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(now);
  const previous = new Date(start);
  if (period.includes('week')) start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  if (period.includes('month')) start.setUTCDate(1);
  if (period.startsWith('last_') || period === 'yesterday') {
    end.setTime(start.getTime());
    if (period === 'last_month') start.setUTCMonth(start.getUTCMonth() - 1);
    else start.setUTCDate(start.getUTCDate() - (period === 'last_week' ? 7 : 1));
  }
  previous.setTime(start.getTime());
  if (period.includes('month')) previous.setUTCMonth(previous.getUTCMonth() - 1);
  else previous.setUTCDate(previous.getUTCDate() - (period.includes('week') ? 7 : 1));
  // Clamp elapsed-month comparisons to the shorter previous month.
  const previousEnd = period.startsWith('last_') || period === 'yesterday'
    ? start.getTime()
    : Math.min(start.getTime(), previous.getTime() + end.getTime() - start.getTime());
  const iso = (value: number) => new Date(value - offset).toISOString();
  return { start: iso(start.getTime()), end: iso(end.getTime()), previousStart: iso(previous.getTime()), previousEnd: iso(previousEnd) };
}
