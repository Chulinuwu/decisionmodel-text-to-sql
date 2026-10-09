import { meterPlanSchema, type MeterPlan } from '../shared/meter-schema.js';
import { meterCatalog } from '../server/meter/data-fixture.js';
import { meterDatasetContext as context, periodText } from './meter-dataset-config.js';
import type { MeterScenario } from './meter-dataset-types.js';

function labels(plan: MeterPlan): Record<string, string> {
  return { support: 'supported', continuity: 'fresh', intent: plan.intent, period: plan.period,
    resource: plan.resource === null ? 'all' : `r_${context.resources.indexOf(plan.resource)}`,
    building: plan.building === null ? 'all' : `b_${context.buildings.indexOf(plan.building)}`,
    floor: plan.floor === null ? 'all' : `f_${plan.floor}`, limit: `v_${plan.limit}`, staleMinutes: `v_${plan.staleMinutes}` };
}

function question(plan: MeterPlan): string {
  const scope = `${plan.resource ?? 'all resources'}${plan.building === null ? '' : ` in building ${plan.building}`}${plan.floor === null ? '' : ` on floor ${plan.floor}`}`;
  const period = periodText[plan.period];
  switch (plan.intent) {
    case 'total': return `What was the total consumption of ${scope} ${period}?`;
    case 'ranking': return `Rank the top ${plan.limit} meters by consumption of ${scope} ${period}.`;
    case 'comparison': return `Compare consumption of ${scope} ${period} against the preceding matched period.`;
    case 'anomaly': return `Which meters for ${scope} had unusually high consumption ${period}, using the documented baseline?`;
    case 'stale': return `Which meters for ${scope} have not reported for more than ${plan.staleMinutes} minutes as of now?`;
    case 'explain': return `Investigate why consumption of ${scope} increased ${period}, using observed evidence without assuming a cause.`;
    case 'summary': return `Summarize consumption of ${scope} ${period}.`;
  }
}

export function meterScenarios(): MeterScenario[] {
  const rows: MeterScenario[] = [];
  for (const intent of ['total', 'ranking', 'comparison', 'anomaly', 'stale', 'explain', 'summary'] as const) {
    for (const period of meterPlanSchema.shape.period.options) {
      if (intent === 'anomaly' && !['today', 'yesterday'].includes(period) || intent === 'stale' && period !== 'today') continue;
      for (const resource of [null, ...context.resources]) for (const building of [null, ...context.buildings]) for (const floor of [null, ...context.floors]) {
        if (['ranking', 'explain'].includes(intent) && resource === null) continue;
        if (!meterCatalog.some(meter => (resource === null || meter.resource === resource) && (building === null || meter.building === building) && (floor === null || meter.floor === floor))) continue;
        const plan: MeterPlan = { intent, period, resource, building, floor, limit: 10, staleMinutes: 60 };
        const family = `${intent}|${period}|${[resource, building, floor].map(value => value === null ? 0 : 1).join('')}`;
        rows.push({ question: question(plan), family, category: intent, plan, labels: labels(plan) });
        if (intent === 'stale') continue;
        const previous = { ...plan, period: period === 'today' ? 'yesterday' : 'today' } satisfies MeterPlan;
        rows.push({ question: `And ${periodText[period]}?`, family, category: `${intent}/followup`, previous, plan,
          labels: { support: 'supported', continuity: 'followup', operation_change: 'keep', intent, period, resource: 'all', building: 'all', floor: 'all', limit: 'v_10', staleMinutes: 'v_60' } });
      }
    }
  }
  const seen = new Set<string>();
  for (const row of [...rows]) {
    if (row.previous || !row.plan || seen.has(row.family)) continue;
    seen.add(row.family);
    const previous: MeterPlan = { ...row.plan, intent: row.plan.intent === 'total' ? 'comparison' : 'total' };
    rows.push({ ...row, previous, category: `${row.category}/context_reset`, labels: { ...row.labels, operation_change: 'change' } });
    rows.push({ ...row, previous, question: `For the same scope, instead: ${row.question}`, category: `${row.category}/operation_change`,
      labels: { ...row.labels, continuity: 'followup', operation_change: 'change' } });
    if (row.plan.intent === 'ranking' || row.plan.intent === 'stale') {
      const plan = { ...row.plan, ...(row.plan.intent === 'ranking' ? { limit: 3 } : { staleMinutes: 360 }) };
      rows.push({ ...row, question: question(plan), plan, labels: labels(plan), category: `${row.category}/numeric_override` });
    }
  }
  const baseline: MeterPlan = { intent: 'total', period: 'today', resource: null, building: null, floor: null, limit: 10, staleMinutes: 60 };
  for (const building of ['C', 'North', 'Warehouse']) rows.push({ question: `What was total consumption in building ${building} today?`, family: 'clarify|unknown_building', category: 'clarify/unknown_building', plan: null, labels: { ...labels(baseline), support: 'unsupported', building: 'unsupported' } });
  for (const resource of ['Steam', 'Natural Gas', 'Diesel']) rows.push({ question: `What was total consumption of ${resource} today?`, family: 'clarify|unknown_resource', category: 'clarify/unknown_resource', plan: null, labels: { ...labels(baseline), support: 'unsupported', resource: 'unsupported' } });
  for (const floor of [0, 4, 99]) rows.push({ question: `What was total consumption on floor ${floor} today?`, family: 'clarify|unknown_floor', category: 'clarify/unknown_floor', plan: null, labels: { ...labels(baseline), support: 'unsupported', floor: 'unsupported' } });
  for (const period of ['tomorrow', 'next week', 'last year']) rows.push({ question: `What was total consumption ${period}?`, family: 'clarify|unsupported_period', category: 'clarify/unsupported_period', plan: null, labels: { ...labels(baseline), support: 'unsupported', period: 'unsupported' } });
  for (const period of ['yesterday', 'last_week', 'last_month'] as const) rows.push({ question: `And ${periodText[period]}?`, family: 'clarify|missing_previous', category: 'clarify/missing_previous', plan: null, labels: { ...labels(baseline), continuity: 'followup', intent: 'unsupported', period } });
  for (const period of ['yesterday', 'last_week', 'last_month'] as const) rows.push({ question: `Which meters had not reported for more than 60 minutes ${periodText[period]}?`, family: 'clarify|historical_stale', category: 'clarify/historical_stale', plan: null, labels: { ...labels(baseline), intent: 'stale', period } });
  for (const resource of context.resources) rows.push({ question: `Forecast consumption of ${resource} tomorrow.`, family: 'clarify|forecast', category: 'clarify/forecast', plan: null, labels: { ...labels(baseline), support: 'unsupported', intent: 'unsupported', period: 'unsupported', resource: `r_${context.resources.indexOf(resource)}` } });
  return rows;
}
