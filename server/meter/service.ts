import { meterContextSchema, meterPlanSchema, type MeterContext, type MeterEvidence, type MeterPlan, type MeterResult } from '../../shared/meter-schema.js';
import { meterAnswer } from './answer.js';
import { compileAnomaly, compileStale, compileUsage } from './compiler.js';
import { compileContributions } from './contribution-compiler.js';
import type { MeterExecute, MeterQuery } from './compiler-types.js';
import { meterWindow } from './time.js';

function comparison(current: MeterEvidence, previous: MeterEvidence): MeterEvidence {
  const key = (row: Record<string, unknown>) => JSON.stringify([row.meter_id ?? null, row.resource, row.unit]);
  const old = new Map(previous.rows.map(row => [key(row), row]));
  return { kind: 'comparison', sql: '', parameters: [], rows: current.rows.map(row => {
    const prior = old.get(key(row));
    const value = row.usage === null ? null : Number(row.usage);
    const baseline = !prior || prior.usage === null ? null : Number(prior.usage);
    return { meter_id: row.meter_id ?? null, meter_name: row.name ?? null, resource: row.resource, unit: row.unit,
      current_usage: value, previous_usage: baseline, delta: value === null || baseline === null ? null : value - baseline,
      percent_change: value === null || baseline === null || baseline === 0 ? null : (value - baseline) / baseline * 100 };
  }) };
}

export async function executeMeterPlan(input: MeterPlan, clock: MeterContext, execute: MeterExecute): Promise<MeterResult> {
  const plan = meterPlanSchema.parse(input);
  const context = meterContextSchema.parse(clock);
  const window = meterWindow(plan.period, context);
  const evidence: MeterEvidence[] = [];
  const warnings: string[] = [];
  const comparableEnd = plan.period.startsWith('this_') || plan.period === 'today'
    ? new Date(Math.min(Date.parse(window.end), Date.parse(window.start) + Date.parse(window.previousEnd) - Date.parse(window.previousStart))).toISOString()
    : window.end;
  if (comparableEnd !== window.end) warnings.push('Comparison is capped to the shorter previous month; the unmatched tail of the current month is excluded from comparison only.');
  if (plan.resource === 'Chemical') warnings.push('Chemical is an exact resource label; H2SO4 is a separate resource and is not included.');
  const query = async (item: MeterQuery) => {
    const result = { ...item, rows: await execute(item.sql, item.parameters) };
    evidence.push(result);
    return result;
  };
  if (['ranking', 'explain'].includes(plan.intent)) {
    const groups = await query(compileUsage(plan, window.start, window.end, 'resource_scope'));
    if (groups.rows.length > 1) return { status: 'clarify', text: 'Choose one resource for a meaningful meter ranking or contribution comparison; different resources and units cannot be ranked together.', plan, window, evidence, warnings };
  }
  if (plan.intent === 'anomaly' && !['today', 'yesterday'].includes(plan.period)) {
    return { status: 'clarify', text: 'Anomaly detection supports today or yesterday. Which day should be checked?', plan, window, evidence, warnings };
  }
  if (plan.intent === 'stale') await query(compileStale(plan, context));
  else if (plan.intent === 'anomaly') {
    await query(compileAnomaly(plan, window, context));
  } else {
    const perMeter = plan.intent === 'ranking';
    const current = await query(compileUsage(plan, window.start, window.end, 'usage', perMeter));
    if (['comparison', 'explain', 'summary'].includes(plan.intent)) {
      const previous = await query(compileUsage(plan, window.previousStart, window.previousEnd, 'previous_usage', perMeter));
      const comparable = comparableEnd === window.end ? current
        : await query(compileUsage(plan, window.start, comparableEnd, 'comparable_usage', perMeter));
      evidence.push(comparison(comparable, previous));
    }
    if (plan.intent === 'explain') await query(compileContributions(plan, { ...window, end: comparableEnd }));
    if (plan.intent === 'summary') {
      await query(compileUsage(plan, window.start, window.end, 'ranking', true));
      await query(compileStale(plan, context));
      if (['today', 'yesterday'].includes(plan.period)) await query(compileAnomaly(plan, window, context));
      else warnings.push('Statistical anomaly detection is available for daily windows only and is omitted from this summary.');
    }
  }
  for (const item of evidence) {
    if (item.kind === 'anomaly') {
      warnings.push('Anomalies require at least 7 of the previous 28 matching daily windows with at least 95% coverage. Threshold: absolute deviation above both 3 standard deviations and 50% of baseline mean.');
      if (item.rows.some(row => row.eligible !== true)) warnings.push('Some meters have insufficient history or current coverage; they cannot be classified as normal.');
    }
    if (item.rows.some(row => 'covered_seconds' in row && Number(row.covered_seconds) < Number(row.expected_seconds) * 0.999)) {
      warnings.push(`${item.kind}: coverage is incomplete. Totals include observed valid intervals only; missing readings and reset crossings are not estimated.`);
    }
    if (['stale', 'anomaly', 'ranking', 'contributors'].includes(item.kind) && item.rows.length >= plan.limit) warnings.push(`${item.kind}: results are capped at ${plan.limit} rows.`);
  }
  warnings.push('Synthetic fixture data. Interval totals include only intervals fully inside the requested window.');
  return { status: plan.intent === 'stale' || evidence[0]?.rows.length ? 'ok' : 'clarify', text: meterAnswer(plan, evidence, context), plan, window, evidence, warnings };
}
