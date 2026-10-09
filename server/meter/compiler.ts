import type { MeterContext, MeterPlan, MeterWindow } from '../../shared/meter-schema.js';
import type { MeterQuery } from './compiler-types.js';

export function compileUsage(plan: MeterPlan, start: string, end: string, kind = 'usage', perMeter = false): MeterQuery {
  return { kind, parameters: [start, end, plan.resource, plan.building, plan.floor, perMeter ? plan.limit : 100], sql: `
SELECT ${perMeter ? 'm.id AS meter_id, m.name,' : ''} m.resource, m.unit,
  COUNT(DISTINCT m.id)::int AS meter_count,
  SUM(i.usage)::float8 AS usage,
  COUNT(i.interval_end) FILTER (WHERE i.usage IS NULL)::int AS invalid_intervals,
  COALESCE(SUM(EXTRACT(EPOCH FROM (i.interval_end-i.interval_start))) FILTER (WHERE i.usage IS NOT NULL),0)::float8 AS covered_seconds,
  (COUNT(DISTINCT m.id)*EXTRACT(EPOCH FROM ($2::timestamptz-$1::timestamptz)))::float8 AS expected_seconds
FROM metering.meters m LEFT JOIN metering.interval_usage i ON i.meter_id=m.id
  AND i.interval_start >= $1::timestamptz AND i.interval_end <= $2::timestamptz
WHERE ($3::text IS NULL OR m.resource=$3) AND ($4::text IS NULL OR m.building=$4)
  AND ($5::int IS NULL OR m.floor=$5)
GROUP BY ${perMeter ? 'm.id,m.name,' : ''} m.resource,m.unit
ORDER BY m.resource,m.unit,usage DESC NULLS LAST${perMeter ? ',m.id' : ''} LIMIT $6` };
}

export function compileStale(plan: MeterPlan, context: MeterContext): MeterQuery {
  return { kind: 'stale', parameters: [context.asOf, plan.resource, plan.building, plan.floor, plan.staleMinutes, plan.limit], sql: `
SELECT m.id AS meter_id,m.name,m.resource,m.unit,MAX(r.recorded_at) AS last_received_at,
  EXTRACT(EPOCH FROM ($1::timestamptz-MAX(r.recorded_at)))/60 AS stale_minutes
FROM metering.meters m LEFT JOIN metering.readings r ON r.meter_id=m.id AND r.recorded_at <= $1::timestamptz
WHERE ($2::text IS NULL OR m.resource=$2) AND ($3::text IS NULL OR m.building=$3)
  AND ($4::int IS NULL OR m.floor=$4)
GROUP BY m.id,m.name,m.resource,m.unit
HAVING MAX(r.recorded_at) IS NULL OR MAX(r.recorded_at) < $1::timestamptz-($5*INTERVAL '1 minute')
ORDER BY last_received_at ASC NULLS FIRST,m.id LIMIT $6` };
}

export function compileAnomaly(plan: MeterPlan, window: MeterWindow, context: MeterContext): MeterQuery {
  return { kind: 'anomaly', parameters: [window.start, window.end, plan.resource, plan.building, plan.floor, context.timezone, plan.limit], sql: `
WITH buckets AS (
 SELECT m.id,m.name,m.resource,m.unit,g.day,
   SUM(i.usage)::float8 AS usage,
   COALESCE(SUM(EXTRACT(EPOCH FROM(i.interval_end-i.interval_start))) FILTER(WHERE i.usage IS NOT NULL),0) AS covered
 FROM metering.meters m CROSS JOIN generate_series(0,28) g(day)
 LEFT JOIN metering.interval_usage i ON i.meter_id=m.id
   AND i.interval_start >= $1::timestamptz-g.day*INTERVAL '1 day'
   AND i.interval_end <= $2::timestamptz-g.day*INTERVAL '1 day'
 WHERE ($3::text IS NULL OR m.resource=$3) AND ($4::text IS NULL OR m.building=$4)
   AND ($5::int IS NULL OR m.floor=$5) AND $6::text IS NOT NULL
 GROUP BY m.id,m.name,m.resource,m.unit,g.day
), baseline AS (
 SELECT id,COUNT(*)::int AS baseline_days,AVG(usage) AS baseline_mean,COALESCE(STDDEV_SAMP(usage),0) AS baseline_stddev
 FROM buckets WHERE day>0 AND covered>=EXTRACT(EPOCH FROM($2::timestamptz-$1::timestamptz))*0.95 GROUP BY id
)
SELECT b.id AS meter_id,b.name,b.resource,b.unit,b.usage,s.baseline_days,s.baseline_mean,s.baseline_stddev,
 (s.baseline_days>=7 AND b.covered>=EXTRACT(EPOCH FROM($2::timestamptz-$1::timestamptz))*0.95) AS eligible,
 b.covered::float8 AS covered_seconds,EXTRACT(EPOCH FROM($2::timestamptz-$1::timestamptz))::float8 AS expected_seconds,
 CASE WHEN s.baseline_days>=7 AND b.covered>=EXTRACT(EPOCH FROM($2::timestamptz-$1::timestamptz))*0.95
 THEN ABS(b.usage-s.baseline_mean)>GREATEST(3*s.baseline_stddev,ABS(s.baseline_mean)*0.5,0.000001) ELSE NULL END AS anomalous
FROM buckets b LEFT JOIN baseline s ON s.id=b.id WHERE b.day=0
ORDER BY anomalous DESC NULLS LAST,b.id LIMIT $7` };
}
