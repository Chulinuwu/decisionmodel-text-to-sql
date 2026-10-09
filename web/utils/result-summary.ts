import { defaultRowLimits } from '../../shared/limits';
import { anomalyColumns } from '../../shared/result-config';
import type { AnsweredResponse } from '../types/state';

// Only a default cap can hide rows the user did not ask to drop; an explicit top-N is complete by definition.
export const cappedByDefault = (response: AnsweredResponse) => response.truncated && response.plan.limit === defaultRowLimits[response.plan.kind];

export const anomalyWithoutOutliers = (response: AnsweredResponse) =>
  response.plan.kind === 'anomaly' && response.rows.length > 0 && !response.rows.some(row => row[anomalyColumns.outlier] === true);
