import type { QueryResult } from 'pg';
import { midnightPattern, numericPrecision, numericTypeIds } from './live-eval-config.js';
import type { GoldComparison, NormalizedValue } from './live-eval.types.js';
import type { QueryResponse } from '../shared/schema.js';

function normalize(value: unknown, numeric: boolean): NormalizedValue {
  if (value === null || value === undefined) return null;
  if (numeric) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.round(number * numericPrecision) / numericPrecision : String(value);
  }
  const text = value instanceof Date ? value.toISOString() : String(value);
  return midnightPattern.exec(text)?.[1] ?? text;
}

const rowKey = (row: NormalizedValue[]) => JSON.stringify(row);
const sortedKeys = (rows: NormalizedValue[][]) => rows.map(rowKey).sort();
const sameRows = (left: NormalizedValue[][], right: NormalizedValue[][], ordered: boolean) =>
  JSON.stringify(ordered ? left.map(rowKey) : sortedKeys(left)) === JSON.stringify(ordered ? right.map(rowKey) : sortedKeys(right));

function* assignments(candidates: string[][], used: Set<string> = new Set(), index = 0): Generator<string[]> {
  if (index === candidates.length) { yield []; return; }
  for (const column of candidates[index]) {
    if (used.has(column)) continue;
    used.add(column);
    for (const rest of assignments(candidates, used, index + 1)) yield [column, ...rest];
    used.delete(column);
  }
}

const numericFields = (gold: QueryResult) => gold.fields.map(field => numericTypeIds.includes(field.dataTypeID));
const valueMultiset = (values: NormalizedValue[]) => JSON.stringify(values.map(value => JSON.stringify(value)).sort());

export const expectedRows = (gold: QueryResult) => {
  const numeric = numericFields(gold);
  return gold.rows.map(row => gold.fields.map((field, index) => normalize(row[field.name], numeric[index])));
};

// Columns are matched by values, not names: each gold column maps to exactly one response column, and the
// mapping must make the full row multiset (or sequence, when ordered) equal.
export function compareToGold(response: Extract<QueryResponse, { status: 'ok' }>, gold: QueryResult, ordered: boolean): GoldComparison {
  const numeric = numericFields(gold);
  const expected = expectedRows(gold);
  const failed = { correct: false, mapping: null, expected, actual: null };
  if (response.columns.length !== gold.fields.length || response.rows.length !== expected.length) return failed;
  const project = (mapping: string[]) => response.rows.map(row => mapping.map((column, index) => normalize(row[column], numeric[index])));
  const candidates = numeric.map((isNumeric, index) => {
    const target = valueMultiset(expected.map(row => row[index]));
    return response.columns.filter(column => valueMultiset(response.rows.map(row => normalize(row[column], isNumeric))) === target);
  });
  for (const mapping of assignments(candidates)) {
    const actual = project(mapping);
    if (sameRows(actual, expected, ordered)) return { correct: true, mapping, expected, actual };
  }
  return failed;
}
