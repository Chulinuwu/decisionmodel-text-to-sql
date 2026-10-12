import type { DecisionResponse, Question } from './decision-schema.js';

type Answers = DecisionResponse['answers'];
export type WideChoices = Map<string, string[]>;

const partId = (id: string, index: number) => `${id}__part${index}`;

export function splitWideChoices(questions: Record<string, Question>, maxChoices: number) {
  const wide: WideChoices = new Map();
  const split: Record<string, Question> = {};
  for (const [id, question] of Object.entries(questions)) {
    const entries = Object.entries(question.criteria);
    if (question.type !== 'choice' || entries.length <= maxChoices) {
      split[id] = question;
      continue;
    }
    const parts = Math.ceil(entries.length / maxChoices);
    const size = Math.ceil(entries.length / parts);
    const ids = Array.from({ length: parts }, (_, index) => partId(id, index));
    ids.forEach((part, index) => { split[part] = { ...question, criteria: Object.fromEntries(entries.slice(index * size, (index + 1) * size)) }; });
    wide.set(id, ids);
  }
  return { split, wide };
}

// Each part's leaders compete again in one question, so the final probabilities are a real distribution over the finalists.
export function finalRound(questions: Record<string, Question>, wide: WideChoices, answers: Answers, finalistsPerPart: number) {
  const final: Record<string, Question> = {};
  for (const [id, parts] of wide) {
    const question = questions[id];
    if (question?.type !== 'choice') continue;
    const finalists = parts.flatMap(part => {
      const answer = answers[part];
      return answer?.type === 'choice' ? Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]).slice(0, finalistsPerPart).map(([key]) => key) : [];
    });
    final[id] = { ...question, criteria: Object.fromEntries(finalists.flatMap(key => key in question.criteria ? [[key, question.criteria[key]]] : [])) };
  }
  return final;
}

export function mergeAnswers(first: Answers, wide: WideChoices, final: Answers): Answers {
  const parts = new Set([...wide.values()].flat());
  return { ...Object.fromEntries(Object.entries(first).filter(([id]) => !parts.has(id))), ...final };
}