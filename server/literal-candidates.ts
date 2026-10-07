import type { Column, Coverage, Literal } from '../shared/query-schema.js';
import { isRelativeKind, relativeLiteral } from './compile/relative-periods.js';
import { buddhistEraOffset, englishMonths, thaiMonths } from './literal-config.js';

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const thaiMonthPattern = new RegExp(`(${thaiMonths.flat().map(escape).join('|')})\\s*(20\\d{2}|25\\d{2})(?!\\d)`, 'gu');
const englishMonthPattern = new RegExp(`\\b(${englishMonths.join('|')})[a-z]*\\.?\\s+(20\\d{2})(?!\\d)`, 'giu');

function namedMonths(question: string) {
  const months: { text: string; start: number; month: number; year: number }[] = [];
  for (const match of question.matchAll(thaiMonthPattern)) {
    const index = thaiMonths.findIndex(names => names.includes(match[1] ?? ''));
    const year = Number(match[2]);
    months.push({ text: match[0], start: match.index, month: index + 1, year: year > 2400 ? year - buddhistEraOffset : year });
  }
  for (const match of question.matchAll(englishMonthPattern)) months.push({ text: match[0], start: match.index, month: englishMonths.indexOf((match[1] ?? '').toLowerCase()) + 1, year: Number(match[2]) });
  return months.filter(entry => entry.month >= 1);
}

const buddhistYearPrefix = /(?:ปี|พ\.ศ\.)\s*$/u;

export function literalCandidates(question: string, column: Column, scope?: { start: number; end: number }): Literal[] {
  const result: Literal[] = [];
  const add = (value: string | number, text: string, start: number, upper?: string) => result.push({ value, source: 'question', text, start, end: start + text.length, ...(upper ? { upper } : {}) });
  if (column.type === 'number') for (const match of question.matchAll(/(?<![\w,.-])-?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?![\w,.-])/g)) add(Number(match[0].replaceAll(',', '')), match[0], match.index);
  else if (column.type === 'timestamp' || column.type === 'date') {
    for (const match of question.matchAll(/(?<!\d)(20\d{2}|25\d{2})(?:-(\d{2})(?:-(\d{2}))?)?(?!\d)/g)) {
      const buddhist = match[1].startsWith('25');
      // 25xx is only a Buddhist-era year when introduced by a Thai year word; otherwise it is an ordinary number.
      if (buddhist && !buddhistYearPrefix.test(question.slice(0, match.index))) continue;
      const year = buddhist ? Number(match[1]) - 543 : Number(match[1]);
      const start = `${year}-${match[2] || '01'}-${match[3] || '01'}`, date = new Date(`${start}T00:00:00Z`);
      if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== start) continue;
      const end = new Date(date);
      if (match[3]) end.setUTCDate(end.getUTCDate() + 1);
      else if (match[2]) end.setUTCMonth(end.getUTCMonth() + 1);
      else end.setUTCFullYear(end.getUTCFullYear() + 1);
      add(start, match[0], match.index, end.toISOString().slice(0, 10));
    }
    for (const named of namedMonths(question)) {
      const start = `${named.year}-${String(named.month).padStart(2, '0')}-01`, end = new Date(`${start}T00:00:00Z`);
      end.setUTCMonth(end.getUTCMonth() + 1);
      add(start, named.text, named.start, end.toISOString().slice(0, 10));
    }
  } else {
    for (const match of question.matchAll(/(["'`])([\s\S]*?)\1/g)) add(match[2], match[2], match.index + 1);
    const tokens = [...question.matchAll(/[\p{L}\p{N}_-]+/gu)];
    for (let size = 1; size <= 4; size++) for (let index = 0; index + size <= tokens.length && result.length < 130; index++) {
      const first = tokens[index], last = tokens[index + size - 1];
      const text = question.slice(first.index, last.index + last[0].length);
      if (text.length <= 100) add(text, text, first.index);
    }
    for (const value of column.values) result.push({ value, source: 'dataset', text: value, start: null, end: null });
  }
  const unique = new Map<string, Literal>();
  for (const literal of result) {
    if (scope && literal.source === 'question' && (literal.start === null || literal.end === null || literal.start < scope.start || literal.end > scope.end)) continue;
    const semantic = JSON.stringify([typeof literal.value, literal.value, literal.upper]);
    if (literal.source === 'dataset' && [...unique.values()].some(candidate => JSON.stringify([typeof candidate.value, candidate.value, candidate.upper]) === semantic)) continue;
    const key = semantic;
    if (!unique.has(key)) unique.set(key, literal);
  }
  return [...unique.values()].slice(0, 240);
}

const sameLiteral = (a: Literal, b: Literal) => a.value === b.value && a.source === b.source && a.text === b.text && a.start === b.start && a.end === b.end && a.upper === b.upper;

export function validateLiteral(literal: Literal, question: string, column: Column, coverage: Coverage) {
  // Relative bounds are recomputed from server-side coverage; the plan's own bounds are never trusted.
  if (literal.source === 'relative') {
    if (!['timestamp', 'date'].includes(column.type) || !isRelativeKind(literal.text) || !sameLiteral(literal, relativeLiteral(literal.text, coverage))) throw new Error('Relative period does not match the complete-data window');
    return;
  }
  if (literal.source === 'dataset') {
    if (typeof literal.value !== 'string' || !column.values.includes(literal.value) || literal.text !== literal.value || literal.start !== null || literal.end !== null || literal.upper !== undefined) throw new Error('Literal is not grounded in the question or schema values');
    return;
  }
  if (literal.start === null || literal.end === null || question.slice(literal.start, literal.end) !== literal.text) throw new Error('Invalid literal provenance');
  if (!literalCandidates(question, column, { start: literal.start, end: literal.end }).some(candidate => sameLiteral(candidate, literal))) throw new Error('Literal is not grounded in the question or schema values');
}
