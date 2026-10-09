import type { MeterPlan } from '../shared/meter-schema.js';

export type MeterLiveCase = { id: string; question: string; previous?: string; status?: 'clarify' } & Partial<MeterPlan>;

export const meterLiveCases: MeterLiveCase[] = [
  { id: 'total_en', question: 'How much DI Water did floor 3 use yesterday?', intent: 'total', period: 'yesterday', resource: 'DI Water', floor: 3 },
  { id: 'total_th', question: 'เมื่อวาน DI Water ชั้น 3 ใช้ไปเท่าไหร่', intent: 'total', period: 'yesterday', resource: 'DI Water', floor: 3 },
  { id: 'ranking_en', question: 'Which 10 meters used the most water this week?', intent: 'ranking', period: 'this_week', resource: 'DI Water', limit: 10 },
  { id: 'ranking_th', question: 'มิเตอร์ไหนใช้น้ำเยอะสุด 10 อันดับสัปดาห์นี้', intent: 'ranking', period: 'this_week', resource: 'DI Water', limit: 10 },
  { id: 'comparison_en', question: 'Has Chemical usage increased this month compared with last month?', intent: 'comparison', period: 'this_month', resource: 'Chemical' },
  { id: 'comparison_th', question: 'เดือนนี้เทียบเดือนก่อน Chemical เพิ่มขึ้นไหม', intent: 'comparison', period: 'this_month', resource: 'Chemical' },
  { id: 'anomaly_en', question: 'Which meters have abnormal usage today?', intent: 'anomaly', period: 'today' },
  { id: 'anomaly_th', question: 'มีมิเตอร์ไหนผิดปกติวันนี้บ้าง', intent: 'anomaly', period: 'today' },
  { id: 'stale_en', question: 'Which meters have not sent a reading for more than one hour?', intent: 'stale', staleMinutes: 60 },
  { id: 'stale_th', question: 'มีมิเตอร์ไหนไม่ส่งค่ามาเกิน 1 ชั่วโมง', intent: 'stale', staleMinutes: 60 },
  { id: 'explain_en', question: 'Why did H2SO4 usage spike today?', intent: 'explain', period: 'today', resource: 'H2SO4' },
  { id: 'explain_th', question: 'ทำไม H2SO4 วันนี้พุ่ง', intent: 'explain', period: 'today', resource: 'H2SO4' },
  { id: 'followup_en', question: 'And what about yesterday?', previous: 'explain_en', intent: 'explain', period: 'yesterday', resource: 'H2SO4' },
  { id: 'followup_th', question: 'แล้วของเมื่อวานล่ะ', previous: 'total_th', intent: 'total', period: 'yesterday', resource: 'DI Water', floor: 3 },
  { id: 'summary_en', question: 'Summarize water usage this week.', intent: 'summary', period: 'this_week', resource: 'DI Water' },
  { id: 'summary_th', question: 'ช่วยสรุปสถานการณ์การใช้น้ำสัปดาห์นี้หน่อย', intent: 'summary', period: 'this_week', resource: 'DI Water' },
  { id: 'missing_context', question: 'And what about yesterday?', status: 'clarify' },
];
