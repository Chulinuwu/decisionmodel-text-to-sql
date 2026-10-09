import { config } from './config.js';
import type { Question } from './decision-schema.js';

export const remoteQuestions = (questions: Record<string, Question>) => Object.fromEntries(
  Object.entries(questions).filter(([, question]) => question.type !== 'choice' || Object.keys(question.criteria).length !== 1),
);

export function decisionPayload(state: string, questions: Record<string, Question>) {
  if (Buffer.byteLength(state) > 2600) throw new Error('Decision state exceeds the safe context budget');
  const payload = JSON.stringify({ model: config.model, provider: { only: [config.providerSlug], allow_fallbacks: false }, state, questions });
  if (Buffer.byteLength(payload) > 32000) throw new Error('Decision request exceeds safe schema/context budget');
  if (Object.values(questions).some(question => question.type === 'choice' && Object.keys(question.criteria).length > 255)) throw new Error('Decision answer-space exceeds 255 choices');
  return payload;
}
