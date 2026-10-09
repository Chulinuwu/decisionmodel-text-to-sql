import type { ResultCell } from './schema.js';

export function numericValue(value: ResultCell): number | null {
  if (value === null || typeof value === 'boolean' || (typeof value === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
