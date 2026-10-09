import type { Trace, Usage } from '../../shared/schema.js';
import type { Question } from '../decision-schema.js';
import { decide } from '../decisions-client.js';
import { remoteQuestions } from '../decision-payload.js';
import type { DecisionAnswers } from './planning.types.js';
import { planningLimits } from './planning-limits.js';

const traceLabel = (question: Question) => question.instructions.split(/[?.]/)[0].slice(0, 90);

export class DecisionSession {
  readonly trace: Trace[] = [];
  readonly usage: Usage = { input_tokens: 0, output_tokens: 0, cost: 0 };
  private calls = 0;
  constructor(private readonly question: string, private readonly signal: AbortSignal) {}

  async ask(stage: string, questions: Record<string, Question>): Promise<DecisionAnswers> {
    this.signal.throwIfAborted();
    const answers: DecisionAnswers = {};
    const open = remoteQuestions(questions);
    for (const [id, question] of Object.entries(questions)) {
      const only = question.type === 'choice' ? Object.keys(question.criteria) : [];
      // A single-option choice is decided by code; the Decisions API also rejects it (422).
      if (only.length === 1) answers[id] = { type: 'choice', choice: only[0], probabilities: { [only[0]]: 1 } };
    }
    if (Object.keys(open).length) {
      if (++this.calls > planningLimits.maxDecisionCalls) throw new Error('Decision call budget exceeded');
      const response = await decide(this.question, open, this.signal);
      this.usage.input_tokens += response.usage.input_tokens;
      this.usage.output_tokens += response.usage.output_tokens;
      this.usage.cost += response.usage.cost;
      Object.assign(answers, response.answers);
    }
    for (const [id, question] of Object.entries(open)) {
      const answer = answers[id];
      if (answer?.type === 'choice') {
        const alternatives = Object.entries(answer.probabilities).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([choice, probability]) => ({ choice, probability }));
        this.trace.push({ id, stage, label: traceLabel(question), choice: answer.choice, probability: answer.probabilities[answer.choice] ?? 0, ...(answer.confidence === undefined ? {} : { confidence: answer.confidence }), alternatives });
      } else if (answer?.type === 'noul') {
        this.trace.push({ id, stage, label: traceLabel(question), choice: answer.noul >= 0.5 ? 'true' : 'false', probability: answer.noul, alternatives: [{ choice: 'true', probability: answer.noul }, { choice: 'false', probability: 1 - answer.noul }] });
      }
    }
    return answers;
  }
}
