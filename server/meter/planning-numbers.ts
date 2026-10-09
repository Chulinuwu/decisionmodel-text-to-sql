import { numberWords } from './planning-number-config.js';

export function normalizeMeterNumbers(question: string) {
  return question.toLowerCase()
    .replace(/สิบ(หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า)/g, (_match, units: string) => String(10 + numberWords[units]))
    .replace(/\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[ -](one|two|three|four|five|six|seven|eight|nine)\b/g, (_match, tens: string, units: string) => String(numberWords[tens] + numberWords[units]))
    .replace(/\b[a-z]+\b|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|สิบ/g, value => value in numberWords ? String(numberWords[value]) : value)
    .replace(/\b(\d+)(?:st|nd|rd|th)\b/g, '$1');
}

export const hasHistoricalMeterPeriod = (question: string) => /\b(?:yesterday|week|month|monday|tuesday|wednesday|thursday|friday|saturday|sunday|historical)\b|\bprevious\s+day\b|เมื่อวาน|สัปดาห์|เดือน|ย้อนหลัง/i.test(question);

export function meterFloor(question: string) {
  const text = normalizeMeterNumbers(question);
  const values = [...text.matchAll(/(?:\b(?:floor|level|storey|story)\s*|ชั้น(?:ที่)?\s*)(-?\d+)|(-?\d+)\s*(?:floor|level|storey|story)\b/g)].map(match => Number(match[1] ?? match[2]));
  return { mentioned: /\b(?:floor|level|storey|story)\b|ชั้น/i.test(question), values: [...new Set(values)] };
}

export function meterQuantities(question: string) {
  const text = normalizeMeterNumbers(question);
  const rank = text.match(/(?:\btop\s*|\blimit\s*)(\d+)|(?<![\p{L}\d])(\d+)\s*(?:biggest\b|largest\b|highest\b|most\b|meters?\b|consumers?\b|อันดับ)/u);
  const duration = text.match(/(?<![\p{L}\d])(\d+(?:\.\d+)?)\s*(hours?\b|minutes?\b|ชั่วโมง|นาที)/u);
  return { limit: rank ? Number(rank[1] ?? rank[2]) : null, staleMinutes: duration ? Number(duration[1]) * (/hour|ชั่วโมง/.test(duration[2]) ? 60 : 1) : null };
}

export function hasUnboundMeterNumber(question: string) {
  const quantities = meterQuantities(question);
  const floor = meterFloor(question);
  const text = normalizeMeterNumbers(question)
    .replace(/\bh2so4\b/g, '')
    .replace(/(?:\b(?:floor|level|storey|story)\s*|ชั้น(?:ที่)?\s*)-?\d+|-?\d+\s*(?:floor|level|storey|story)\b/g, '')
    .replace(/\bbuilding\s+\S+|(?:อาคาร|ตึก)\s*\S+/g, '');
  return /\b(?:hundred|thousand|million|dozen|twentieth|thirtieth|half|quarter)\b/.test(text) || floor.values.length > 1 || [...text.matchAll(/(?<![\p{L}\d])\d+(?:\.\d+)?(?![\p{L}\d])/gu)].some(match => {
    const value = Number(match[0]);
    return value !== quantities.limit && value !== quantities.staleMinutes && value * 60 !== quantities.staleMinutes;
  });
}
