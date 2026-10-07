import type { Expression } from '../../shared/query-schema.js';

export type SqlBase = {
  values: (string | number)[];
  bind: (value: string | number) => string;
  render: (expression: Expression) => string;
  from: string[];
  where: (extra?: string[]) => string;
};
export type Compiled = { sql: string; values: (string | number)[]; grain: string; emptyResult: string | null };
export type Window = { start: string; end: string };
export type Granularity = 'day' | 'month' | 'year';
