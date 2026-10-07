export const outcomes = ['accepted_correct', 'accepted_wrong', 'choose_contains_correct', 'choose_missing_correct', 'refused_expected', 'refused_supported', 'error'] as const;
export const failingOutcomes = ['accepted_wrong', 'error'];
// int8, numeric, int4, float4, float8, numeric(1700) PostgreSQL type OIDs.
export const numericTypeIds = [20, 21, 23, 700, 701, 1700];
export const numericPrecision = 1e7;
export const midnightPattern = /^(\d{4}-\d{2}-\d{2})(?:[ T]00:00:00(?:\.0+)?(?:Z|[+-]00(?::?00)?)?)?$/;
export const reportDirectory = 'test-results';
export const defaultSuite = 'default';
export const fingerprintDirectories = ['server', 'shared', 'scripts'];
