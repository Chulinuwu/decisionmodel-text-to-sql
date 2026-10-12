import { config } from './config.js';
import type { Question } from './decision-schema.js';

export const remoteQuestions = (questions: Record<string, Question>) => Object.fromEntries(
  Object.entries(questions).filter(([, question]) => question.type !== 'choice' || Object.keys(question.criteria).length !== 1),
);

export function decisionPayload(state: string, questions: Record<string, Question>) {
  if (Buffer.byteLength(state) > 2600) throw new Error('Decision state exceeds the safe context budget');
  if (Object.keys(questions).length > config.maxQuestionsPerCall) throw new Error(`Decision request exceeds ${config.maxQuestionsPerCall} questions`);
  if (Object.values(questions).some(question => question.type === 'choice' && Object.keys(question.criteria).length > config.maxChoices)) throw new Error(`Decision answer-space exceeds ${config.maxChoices} choices`);
  const payload = JSON.stringify({ model: config.model, state, questions });
  if (Buffer.byteLength(payload) > 32000) throw new Error('Decision request exceeds safe schema/context budget');
  return payload;
}