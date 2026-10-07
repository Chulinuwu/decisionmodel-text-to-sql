import type { Predicate, RelativePeriodKind } from '../../shared/query-schema';

export const operatorLabels = { eq: '=', ne: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', contains: 'มีข้อความ', is_null: 'ไม่มีค่า', not_null: 'มีค่า', period: 'อยู่ในช่วง', in: 'เป็นหนึ่งใน', not_in: 'ไม่ใช่' } satisfies Record<Predicate['operator'], string>;
export const relativePeriodLabels = { latest_month: 'เดือนล่าสุดที่ข้อมูลครบ', previous_month: 'เดือนก่อนหน้า', latest_year: 'ปีล่าสุดที่ข้อมูลครบ', previous_year: 'ปีก่อนหน้า', coverage: 'ช่วงที่ข้อมูลครบ' } satisfies Record<RelativePeriodKind, string>;
export const booleanLabels = { outlier: { true: 'ผิดปกติ', false: 'ปกติ' }, generic: { true: 'ใช่', false: 'ไม่ใช่' } };
export const numberLocale = 'th-TH';
