import type { MeterPlan } from '../../shared/meter-schema.js';

export const englishNumberWords: Record<string, number> = {
  zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8, ninth: 9, tenth: 10, eleventh: 11, twelfth: 12,
};

export const thaiDigitWords: Record<string, number> = { หนึ่ง: 1, สอง: 2, สาม: 3, สี่: 4, ห้า: 5, หก: 6, เจ็ด: 7, แปด: 8, เก้า: 9 };

const thaiDigit = Object.keys(thaiDigitWords).join('|');
export const thaiNumberPattern = new RegExp(`(?:(${thaiDigit})?ร้อย)?(?:(${thaiDigit}|ยี่)?(สิบ))?(${thaiDigit}|เอ็ด)?`, 'g');
// ponytail: Thai has no word spaces, so common words embedding a digit word are masked by list; extend when one misfires.
export const thaiNumberFalseFriends = /สามารถ|เรียบร้อย|ร้อยละ|ห้าม|ห้าง|เก้าอี้|สี่เหลี่ยม|สี่แยก|ยี่ห้อ|หนึ่งใน|ส่วนหนึ่ง|หกล้ม/g;
export const englishCompoundPattern = /\b(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)[ -](one|two|three|four|five|six|seven|eight|nine)\b/g;
export const unsupportedNumberWords = /\b(?:hundred|thousand|million|dozen|twentieth|thirtieth|half|quarter)\b|ครึ่ง/;
export const buildingNamePattern = /\bbuilding\s+\S+|ทั้ง\s*\d+\s*(?:อาคาร|ตึก)|(?:อาคาร|ตึก)\s*[a-z0-9]+/g;
export const gluedKeywordPattern = /\b(top|limit|rank|floor|level|storey|story)(?=\d)/g;
// Digits glued to Latin letters (h2so4, m3) belong to names or units, but Thai glues digits to words without spaces.
export const numberSpanPattern = /(?<![a-z\d.-])-?\d+(?:\.\d+)?/g;

export const floorWordPattern = /\b(?:floor|level|storey|story)\b|ชั้น/i;
export const floorBeforePattern = /(?:\b(?:floor|level|storey|story)|ชั้น(?:ที่)?)\s*$/;
export const floorAfterPattern = /^\s*(?:floor|level|storey|story)\b/;
export const limitBeforePattern = /(?:\btop|\blimit|ท็อป)\s*$/;
export const limitAfterPattern = /^\s*(?:(?:biggest|largest|highest|most|meters?|consumers?)\b|อันดับ|มิเตอร์)/;
export const durationAfterPattern = /^[\s-]*(?:(hours?\b|hrs?\b|ชั่วโมง|ชม\.?(?![ก-๙]))|minutes?\b|mins?\b|นาที)/;

export const meterLimitIntents: readonly MeterPlan['intent'][] = ['ranking', 'explain', 'stale', 'anomaly'];
