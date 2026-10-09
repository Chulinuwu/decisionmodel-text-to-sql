import {
  buildingNamePattern, durationAfterPattern, englishCompoundPattern, englishNumberWords, floorAfterPattern, floorBeforePattern, floorWordPattern,
  gluedKeywordPattern, limitAfterPattern, limitBeforePattern, numberSpanPattern, thaiDigitWords, thaiNumberFalseFriends, thaiNumberPattern, unsupportedNumberWords,
} from './planning-number-config.js';
import type { MeterNumberBindings } from './planning.types.js';

function thaiNumberValue(match: string, hundreds: string | undefined, tens: string | undefined, ten: string | undefined, unit: string | undefined) {
  if (!match || match === 'เอ็ด') return match;
  const value = (match.includes('ร้อย') ? (hundreds ? thaiDigitWords[hundreds] : 1) * 100 : 0)
    + (ten ? (tens === 'ยี่' ? 2 : tens ? thaiDigitWords[tens] : 1) * 10 : 0)
    + (unit === 'เอ็ด' ? 1 : unit ? thaiDigitWords[unit] : 0);
  return ` ${value} `;
}

function normalizeMeterNumbers(question: string) {
  return question.toLowerCase()
    .replace(thaiNumberFalseFriends, ' ')
    .replace(/[๐-๙]/g, digit => String(digit.charCodeAt(0) - 0x0e50))
    .replace(thaiNumberPattern, thaiNumberValue)
    .replace(englishCompoundPattern, (_match, tens: string, units: string) => String(englishNumberWords[tens] + englishNumberWords[units]))
    .replace(/\b[a-z]+\b/g, word => word in englishNumberWords ? String(englishNumberWords[word]) : word)
    .replace(/\b(\d+)(?:st|nd|rd|th)\b/g, '$1')
    .replace(gluedKeywordPattern, '$1 ');
}

export const hasHistoricalMeterPeriod = (question: string) => /\b(?:yesterday|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|historical)\b|\bprevious\s+day\b|เมื่อวาน|สัปดาห์|เดือน|ย้อนหลัง/i.test(question);

// Each number span binds to exactly one slot by its adjacent keyword; "floor N" wins so it can never become a limit.
export function bindMeterNumbers(question: string): MeterNumberBindings {
  const text = normalizeMeterNumbers(question).replace(buildingNamePattern, ' ');
  const bindings: MeterNumberBindings = { floor: [], limit: [], staleMinutes: [], unbound: unsupportedNumberWords.test(text), floorMentioned: floorWordPattern.test(text) };
  for (const match of text.matchAll(numberSpanPattern)) {
    const before = text.slice(0, match.index);
    const after = text.slice(match.index + match[0].length);
    const value = Number(match[0]);
    if (floorBeforePattern.test(before) || floorAfterPattern.test(after)) { bindings.floor.push(value); continue; }
    const duration = after.match(durationAfterPattern);
    const ranked = limitBeforePattern.test(before) || limitAfterPattern.test(after);
    if (duration && !ranked) bindings.staleMinutes.push(duration[1] ? value * 60 : value);
    else if (ranked && !duration) bindings.limit.push(value);
    else bindings.unbound = true;
  }
  return bindings;
}

export const meterFloor = ({ floor, floorMentioned }: MeterNumberBindings) => ({ mentioned: floorMentioned, values: [...new Set(floor)] });

export const meterQuantities = ({ limit, staleMinutes }: MeterNumberBindings) =>
  ({ limit: limit.length === 1 ? limit[0] : null, staleMinutes: staleMinutes.length === 1 ? staleMinutes[0] : null });

export const hasUnboundMeterNumber = ({ unbound, floor, limit, staleMinutes }: MeterNumberBindings) =>
  unbound || new Set(floor).size > 1 || limit.length > 1 || staleMinutes.length > 1;
