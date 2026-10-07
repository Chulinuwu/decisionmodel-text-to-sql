import type { AnomalyPlan, DatabaseSchema, PeriodChangePlan, Plan, SelectPlan } from '../../shared/query-schema.js';
import type { Interpretation, InterpretationPart } from '../../shared/schema.js';
import { expressionKey } from '../expression.js';
import { changeWindows } from '../compile/relative-periods.js';
import { entityLabels } from './catalog-config.js';
import { analysisText, partLabels } from './planning-messages.js';
import { expressionText, filtersText, isDateField, periodText } from './describe-text.js';

type Described = { summary: string; parts: InterpretationPart[] };
const assemble = (parts: InterpretationPart[], summary: (string | false)[]): Described => ({ summary: summary.filter(Boolean).join(' '), parts: parts.filter(part => part.value) });

function orderText(plan: SelectPlan, schema: DatabaseSchema) {
  if (!plan.orderBy) return '';
  const { expression, direction } = plan.orderBy;
  if (expression.kind === 'aggregate' && plan.select.filter(entry => entry.kind === 'aggregate').length === 1) return direction === 'desc' ? 'จากมากไปน้อย' : 'จากน้อยไปมาก';
  const temporal = expression.kind === 'bucket' || (expression.field !== null && isDateField(schema, expression.field));
  const span = temporal ? (direction === 'desc' ? 'จากใหม่ไปเก่า' : 'จากเก่าไปใหม่') : (direction === 'desc' ? 'จากมากไปน้อย' : 'จากน้อยไปมาก');
  return `ตาม${expressionText(expression, plan.from)} ${span}`;
}

function describeSelect(plan: SelectPlan, schema: DatabaseSchema): Described {
  const aggregate = plan.select.some(expression => expression.kind === 'aggregate');
  const groupKeys = new Set(plan.groupBy.map(expressionKey));
  const shown = plan.select.filter(expression => !groupKeys.has(expressionKey(expression))).map(expression => expressionText(expression, plan.from)).join(', ');
  const groups = plan.groupBy.map(expression => expressionText(expression, plan.from)).join(' และ ');
  const filters = filtersText(plan.where.predicates, plan.where.connector, schema.coverage);
  const order = orderText(plan, schema);
  const limit = aggregate && !plan.groupBy.length ? '' : plan.orderBy ? `${plan.limit} อันดับ` : `ไม่เกิน ${plan.limit} แถว`;
  return assemble(
    [{ label: aggregate ? partLabels.measure : partLabels.show, value: shown }, { label: partLabels.group, value: groups }, { label: partLabels.filter, value: filters }, { label: partLabels.order, value: order }, { label: partLabels.limit, value: limit }],
    [aggregate ? shown : `แสดง${entityLabels[plan.from].th}: ${shown}`, groups && `แยกตาม${groups}`, filters && `เฉพาะ${filters}`, order && `เรียง${order}`, limit && `แสดง ${limit}`],
  );
}

function describeAnomaly(plan: AnomalyPlan, schema: DatabaseSchema): Described {
  const measure = expressionText(plan.measure, plan.from), unit = expressionText(plan.unit, plan.from);
  const filters = filtersText(plan.where.predicates, plan.where.connector, schema.coverage), direction = analysisText.direction[plan.direction];
  return assemble(
    [{ label: analysisText.analysis, value: `${analysisText.anomaly} (${analysisText.method})` }, { label: partLabels.measure, value: measure }, { label: analysisText.unit, value: unit }, { label: analysisText.direction_label, value: direction }, { label: partLabels.filter, value: filters }, { label: partLabels.limit, value: analysisText.rows(plan.limit) }],
    [`${analysisText.anomaly}: ${unit} ที่${measure}${direction}`, filters && `เฉพาะ${filters}`, analysisText.method],
  );
}

function describePeriodChange(plan: PeriodChangePlan, schema: DatabaseSchema): Described {
  const measure = expressionText(plan.measure, plan.from), group = plan.groupBy.map(expression => expressionText(expression, plan.from)).join(' และ ');
  let periods = `${periodText(plan.current, schema.coverage)} ${analysisText.compare}${plan.previous ? periodText(plan.previous, schema.coverage) : analysisText.previous}`;
  try {
    const windows = changeWindows(plan.current, plan.previous, schema.coverage);
    periods = `${analysisText.window(windows.current.start, windows.current.end)} ${analysisText.compare} ${analysisText.window(windows.previous.start, windows.previous.end)}`;
  } catch { /* the compiler rejects such a plan; the requested periods are still shown */ }
  const filters = filtersText(plan.where.predicates, plan.where.connector, schema.coverage), order = plan.orderBy ? analysisText.changeOrder[plan.orderBy] : '';
  return assemble(
    [{ label: analysisText.analysis, value: analysisText.periodChange }, { label: partLabels.measure, value: measure }, { label: analysisText.periods, value: periods }, { label: partLabels.group, value: group }, { label: partLabels.filter, value: filters }, { label: partLabels.order, value: order }],
    [`${analysisText.periodChange}: ${measure} ${periods}`, group && `แยกตาม${group}`, filters && `เฉพาะ${filters}`, order && `เรียง${order}`],
  );
}

export function describePlan(plan: Plan, schema: DatabaseSchema): Described {
  if (plan.kind === 'anomaly') return describeAnomaly(plan, schema);
  if (plan.kind === 'period_change') return describePeriodChange(plan, schema);
  return describeSelect(plan, schema);
}

export function interpretationFromPlan(plan: Plan, schema: DatabaseSchema, probability: number | null, id: string): Interpretation {
  return { id, plan, ...describePlan(plan, schema), probability };
}
