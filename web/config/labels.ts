import type { Predicate } from '../../shared/query-schema';

export const operatorLabels = { eq: '=', ne: '≠', gt: '>', gte: '≥', lt: '<', lte: '≤', contains: 'มีข้อความ', is_null: 'ไม่มีค่า', not_null: 'มีค่า', period: 'อยู่ในช่วง', in: 'เป็นหนึ่งใน', not_in: 'ไม่ใช่' } satisfies Record<Predicate['operator'], string>;
export const numberLocale = 'th-TH';
