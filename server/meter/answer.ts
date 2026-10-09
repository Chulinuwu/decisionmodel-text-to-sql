import type { MeterContext, MeterEvidence, MeterPlan } from '../../shared/meter-schema.js';

export function meterAnswer(plan: MeterPlan, evidence: MeterEvidence[], context: MeterContext): string {
  const totals = evidence.find(item => item.kind === 'usage')?.rows ?? [];
  const amounts = totals.map(row => `${row.resource}: ${row.usage === null ? 'no valid usage' : `${Number(row.usage).toFixed(2)} ${row.unit}`}`).join('; ');
  if (plan.intent === 'stale') return `${evidence.find(item => item.kind === 'stale')?.rows.length ?? 0} meter(s) have no reading or last reported more than ${plan.staleMinutes} minutes before the current dataset snapshot at ${context.asOf}.`;
  if (plan.intent === 'anomaly') return `${evidence[0].rows.filter(row => row.anomalous === true).length} meter(s) exceed the stated anomaly threshold. This is a statistical flag, not a diagnosis.`;
  if (plan.intent === 'ranking') return `Usage ranking within each resource and unit: ${totals.map(row => `${row.name}: ${row.usage === null ? 'unavailable' : Number(row.usage).toFixed(2)} ${row.unit}`).join('; ')}.`;
  if (plan.intent === 'comparison' || plan.intent === 'explain') {
    const changes = evidence.find(item => item.kind === (plan.intent === 'explain' ? 'contributors' : 'comparison'))?.rows ?? [];
    return changes.map(row => `${row.resource}${row.meter_name ? ` (${row.meter_name})` : ''}: change ${row.delta === null ? 'unavailable' : `${Number(row.delta).toFixed(2)} ${row.unit}`}; ${row.percent_change === null ? 'percentage unavailable' : `${Number(row.percent_change).toFixed(1)}%`}.`).join(' ')
      + (plan.intent === 'explain' ? ' These are measured contributions to the change. The available readings cannot establish why it happened.'
        : plan.period.startsWith('this_') || plan.period === 'today' ? ' Comparison uses matching elapsed duration, capped at the shorter period.' : ' Comparison uses the previous complete calendar period.');
  }
  if (plan.intent === 'summary') return `${amounts}. Current status at ${context.asOf}: ${evidence.find(item => item.kind === 'stale')?.rows.length ?? 0} stale meter(s). ${evidence.some(item => item.kind === 'anomaly') ? `${evidence.find(item => item.kind === 'anomaly')!.rows.filter(row => row.anomalous === true).length} statistical anomaly flag(s). ` : ''}Review the comparison and ranking evidence for changes and contributors. These readings do not establish causes.`;
  return amounts ? `${amounts}.` : 'No meters match the requested filters.';
}
