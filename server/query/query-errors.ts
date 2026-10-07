export class InvalidPlanError extends Error {}
export class OfferNotFoundError extends Error {}
// The analysis ran but its preconditions (for example a minimum population) do not hold for this data.
export class AnalysisNotApplicableError extends Error {}
