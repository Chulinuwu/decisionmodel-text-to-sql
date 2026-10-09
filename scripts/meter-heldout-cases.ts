import type { MeterLiveCase } from './meter-live-cases.js';

export const meterHeldoutCases: MeterLiveCase[] = [
  { id: 'unseen_total', question: 'Give me the volume of DI Water consumed on level 2 since midnight.', intent: 'total', period: 'today', resource: 'DI Water', floor: 2 },
  { id: 'unseen_rank', question: 'List the three biggest DI Water consumers since the start of this week.', intent: 'ranking', period: 'this_week', resource: 'DI Water', limit: 3 },
  { id: 'unseen_compare', question: 'How does month-to-date Chemical consumption stack up against the equivalent part of the preceding month?', intent: 'comparison', period: 'this_month', resource: 'Chemical' },
  { id: 'unseen_anomaly', question: 'ตรวจมิเตอร์ที่ใช้ผิดไปจากปกติของเมื่อวานให้หน่อย', intent: 'anomaly', period: 'yesterday' },
  { id: 'unseen_stale', question: 'Find meters whose most recent transmission is over two hours old.', intent: 'stale', staleMinutes: 120 },
  { id: 'unseen_explain', question: 'Can you account for the jump in H2SO4 consumption since midnight?', intent: 'explain', period: 'today', resource: 'H2SO4' },
  { id: 'unseen_followup', question: 'ใช้เงื่อนไขเดิม แต่ขอดูเมื่อวานแทน', previous: 'unseen_total', intent: 'total', period: 'yesterday', resource: 'DI Water', floor: 2 },
  { id: 'unseen_summary', question: 'Give me a weekly overview of DI Water consumption, including changes and meters that stopped reporting.', intent: 'summary', period: 'this_week', resource: 'DI Water' },
];
