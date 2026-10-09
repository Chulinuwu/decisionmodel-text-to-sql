import type { MeterPlan, MeterWindow } from '../../shared/meter-schema.js';
import type { MeterQuery } from './compiler-types.js';

export function compileContributions(plan: MeterPlan, window: MeterWindow): MeterQuery {
  return { kind: 'contributors', parameters: [window.start, window.end, window.previousStart, window.previousEnd, plan.resource, plan.building, plan.floor, plan.limit], sql: `
WITH amounts AS (
 SELECT m.id AS meter_id,m.name AS meter_name,m.resource,m.unit,
  SUM(i.usage) FILTER(WHERE i.interval_start >= $1::timestamptz AND i.interval_end <= $2::timestamptz)::float8 AS current_usage,
  SUM(i.usage) FILTER(WHERE i.interval_start >= $3::timestamptz AND i.interval_end <= $4::timestamptz)::float8 AS previous_usage,
  COALESCE(SUM(EXTRACT(EPOCH FROM(i.interval_end-i.interval_start))) FILTER(WHERE i.usage IS NOT NULL
    AND ((i.interval_start >= $1::timestamptz AND i.interval_end <= $2::timestamptz)
     OR (i.interval_start >= $3::timestamptz AND i.interval_end <= $4::timestamptz))),0)::float8 AS covered_seconds,
  (EXTRACT(EPOCH FROM($2::timestamptz-$1::timestamptz))+EXTRACT(EPOCH FROM($4::timestamptz-$3::timestamptz)))::float8 AS expected_seconds
 FROM metering.meters m LEFT JOIN metering.interval_usage i ON i.meter_id=m.id
  AND i.interval_start >= $3::timestamptz AND i.interval_end <= $2::timestamptz
 WHERE ($5::text IS NULL OR m.resource=$5) AND ($6::text IS NULL OR m.building=$6) AND ($7::int IS NULL OR m.floor=$7)
 GROUP BY m.id,m.name,m.resource,m.unit
)
SELECT *,current_usage-previous_usage AS delta,
  100*(current_usage-previous_usage)/NULLIF(previous_usage,0) AS percent_change
FROM amounts ORDER BY resource,unit,delta DESC NULLS LAST,meter_id LIMIT $8` };
}
