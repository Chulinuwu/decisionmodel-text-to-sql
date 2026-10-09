import type { AnomalyPlan, Expression, PeriodChangePlan, Plan, SelectPlan } from '../../shared/query-schema.js';
import type { ResultCell } from '../../shared/schema.js';
import { defaultRowLimits } from '../../shared/limits.js';
import { numericValue } from '../../shared/result-cells.js';
import { anomalyColumns, anomalyThreshold, booleanLabels, changeColumns, numberLocale, pctDecimals, scoreDecimals } from '../../shared/result-config.js';
import { expressionAlias } from '../expression.js';
import { expressionText } from '../planning/describe-text.js';
import { answerMessages } from './query-messages.js';

type Row = Record<string, ResultCell>;

function cellText(value: ResultCell | undefined, decimals = 2) {
  if (value === undefined || value === null) return answerMessages.missing;
  if (typeof value === 'boolean') return booleanLabels.generic[value ? 'true' : 'false'];
  const number = numericValue(value);
  return number === null ? String(value) : number.toLocaleString(numberLocale, { maximumFractionDigits: decimals });
}

function pctText(value: ResultCell | undefined) {
  const number = numericValue(value ?? null);
  if (number === null) return answerMessages.noPct;
  return answerMessages.pct(`${number > 0 ? '+' : ''}${number.toLocaleString(numberLocale, { minimumFractionDigits: pctDecimals, maximumFractionDigits: pctDecimals })}%`);
}

const labelled = (plan: Plan, expression: Expression, row: Row) => `${expressionText(expression, plan.from)} ${cellText(row[expressionAlias(expression)])}`;

// Only the default cap hides rows the user did not ask to drop; an explicit top-N that truncates is complete.
function firstRowLead(plan: SelectPlan | PeriodChangePlan, rows: Row[], truncated: boolean) {
  const ranked = plan.orderBy !== null;
  return `${answerMessages.rowCount(rows.length, truncated, truncated && plan.limit === defaultRowLimits[plan.kind], ranked)} ${answerMessages.firstRow(ranked)}`;
}

function anomalyAnswer(plan: AnomalyPlan, rows: Row[], truncated: boolean) {
  const outliers = rows.filter(row => row[anomalyColumns.outlier] === true);
  // Rows are ordered by |score| but a one-sided direction flags only one sign, so hidden rows can still be outliers.
  const hiddenMayBeOutliers = truncated && (plan.direction !== 'both' || outliers.length === rows.length);
  if (!outliers.length) return hiddenMayBeOutliers ? answerMessages.noOutlierShown(rows.length) : answerMessages.noOutlier(rows.length, anomalyThreshold);
  const [top] = outliers;
  return `${answerMessages.outliers(outliers.length, hiddenMayBeOutliers, expressionText(plan.unit, plan.from))} ${answerMessages.topOutlier(
    cellText(top[expressionAlias(plan.unit)]), expressionText(plan.measure, plan.from), cellText(top[anomalyColumns.value]),
    cellText(top[anomalyColumns.baseline]), cellText(top[anomalyColumns.score], scoreDecimals))}`;
}

function changeAnswer(plan: PeriodChangePlan, rows: Row[], truncated: boolean) {
  const [first] = rows;
  const change = `${answerMessages.change(expressionText(plan.measure, plan.from), cellText(first[changeColumns.current]), cellText(first[changeColumns.previous]))} ${pctText(first[changeColumns.pct])}`;
  const [group] = plan.groupBy;
  if (!group) return change;
  return `${firstRowLead(plan, rows, truncated)} ${labelled(plan, group, first)}: ${change}`;
}

function selectAnswer(plan: SelectPlan, rows: Row[], truncated: boolean) {
  const first = plan.select.map(expression => labelled(plan, expression, rows[0])).join(', ');
  if (rows.length === 1 && !truncated) return first;
  return `${firstRowLead(plan, rows, truncated)} ${first}`;
}

export function answerText(plan: Plan, rows: Row[], truncated: boolean) {
  if (!rows.length) return answerMessages.empty;
  if (plan.kind === 'anomaly') return anomalyAnswer(plan, rows, truncated);
  if (plan.kind === 'period_change') return changeAnswer(plan, rows, truncated);
  return selectAnswer(plan, rows, truncated);
}
