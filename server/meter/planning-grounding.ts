import type { MeterPlan } from '../../shared/meter-schema.js';

export function retainMeterFilters(question: string, plan: MeterPlan, previous: MeterPlan, floorMentioned: boolean) {
  const text = question.toLowerCase();
  const all = /\b(?:all|any)\b|ทั้งหมด|ทุก/.test(text);
  const resourceMentioned = plan.resource !== null && (text.includes(plan.resource.toLowerCase()) || plan.resource === 'DI Water' && /\bwater\b|น้ำ/.test(text));
  const buildingMentioned = /\bbuilding\b|อาคาร|ตึก/.test(text);
  return {
    ...plan,
    resource: resourceMentioned || all && /\bresources?\b|\bchemicals?\b|สาร|น้ำ/.test(text) ? plan.resource : previous.resource,
    building: buildingMentioned ? plan.building : previous.building,
    floor: floorMentioned ? plan.floor : previous.floor,
  };
}
