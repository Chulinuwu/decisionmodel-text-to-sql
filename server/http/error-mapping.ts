import type { ErrorRequestHandler } from 'express';
import { AnalysisNotApplicableError, InvalidPlanError, OfferNotFoundError } from '../query/query-errors.js';
import { clientClosedStatus, httpMessages, providerErrorPattern, statementTimeoutCode } from './http-messages.js';
import type { HttpFailure } from './http.types.js';

const errorName = (error: unknown) => error instanceof Error ? error.name : '';
const errorCode = (error: unknown) => error && typeof error === 'object' && 'code' in error ? error.code : undefined;

export function mapError(error: unknown): HttpFailure {
  if (error instanceof InvalidPlanError) return { status: 400, error: httpMessages.invalidPlan };
  if (error instanceof AnalysisNotApplicableError) return { status: 422, error: error.message };
  if (error instanceof OfferNotFoundError) return { status: 404, error: httpMessages.offerMissing };
  if (errorName(error) === 'TimeoutError' || errorCode(error) === statementTimeoutCode) return { status: 504, error: httpMessages.timeout };
  if (errorName(error) === 'AbortError' || (error instanceof Error && error.message === 'Request canceled')) return { status: clientClosedStatus, error: httpMessages.canceled };
  if (error instanceof Error && providerErrorPattern.test(error.message)) return { status: 502, error: error.message };
  return { status: 500, error: httpMessages.failed };
}

// Body-parser errors (oversized or malformed JSON) would otherwise reach Express's default HTML handler with a stack trace.
export const bodyErrorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  const status = error && typeof error === 'object' && 'status' in error && typeof error.status === 'number' && error.status >= 400 && error.status < 500 ? error.status : 400;
  response.status(status).json({ error: httpMessages.invalidBody });
};
