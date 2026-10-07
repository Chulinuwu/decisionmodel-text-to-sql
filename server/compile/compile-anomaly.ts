import type { AnomalyPlan, DatabaseSchema } from '../../shared/query-schema.js';
import { expressionAlias } from '../expression.js';
import { fieldColumn } from '../schema-graph.js';
import type { Compiled } from './compile.types.js';
import { anomalyRules, recordKeys } from './analysis-config.js';
import { analysisMessages } from './analysis-messages.js';
import { grainOf, sqlBase } from './sql-base.js';

function checkShape(plan: AnomalyPlan, schema: DatabaseSchema) {
  const { unit, measure } = plan;
  if (unit.kind === 'aggregate') throw new Error('Anomaly unit must be a column or a date bucket');
  if (measure.kind === 'bucket') throw new Error('Anomaly measure must be numeric');
  if (measure.kind === 'column') {
    if (unit.kind !== 'column' || unit.field.relation !== plan.from || recordKeys[plan.from] !== unit.field.column) throw new Error('Record-level anomaly units must be the unique key of the base relation');
    if (fieldColumn(schema, measure.field).type !== 'number') throw new Error('Record-level anomaly measure must be numeric');
  }
}

export function compileAnomaly(plan: AnomalyPlan, schema: DatabaseSchema, question: string): Compiled {
  checkShape(plan, schema);
  const base = sqlBase(plan, schema, question), unit = base.render(plan.unit), value = base.render(plan.measure);
  const grouped = plan.measure.kind === 'aggregate' ? `GROUP BY ${unit}` : '';
  const outlier = { both: `abs(score) >= ${anomalyRules.threshold}`, high: `score >= ${anomalyRules.threshold}`, low: `score <= -${anomalyRules.threshold}` }[plan.direction];
  // Empty output means fewer than minimumUnits units: the population filter sits in the scored step.
  const sql = [
    `WITH units AS (SELECT ${unit} AS unit, (${value})::numeric AS value`, ...base.from, base.where(), `${grouped}),`,
    'population AS (SELECT unit, value FROM units WHERE value IS NOT NULL),',
    'center AS (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY value) AS median, count(*) AS units FROM population),',
    'spread AS (SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY abs(p.value - c.median)) AS mad, avg(abs(p.value - c.median)) AS mean_ad FROM population p CROSS JOIN center c),',
    `scored AS (SELECT p.unit, p.value, c.median AS baseline, CASE WHEN s.mad > 0 THEN ${anomalyRules.madScale} * (p.value - c.median) / s.mad WHEN s.mean_ad > 0 THEN (p.value - c.median) / (${anomalyRules.meanAdScale} * s.mean_ad) ELSE 0 END AS score`,
    `  FROM population p CROSS JOIN center c CROSS JOIN spread s WHERE c.units >= ${anomalyRules.minimumUnits})`,
    `SELECT unit AS "${expressionAlias(plan.unit)}", value, baseline, score, ${outlier} AS is_outlier`,
    'FROM scored',
    'ORDER BY abs(score) DESC, unit ASC NULLS LAST',
    `LIMIT ${base.bind(plan.limit + 1)}`,
  ].filter(Boolean).join('\n');
  return { sql, values: base.values, grain: grainOf(plan, schema), emptyResult: analysisMessages.smallPopulation };
}
