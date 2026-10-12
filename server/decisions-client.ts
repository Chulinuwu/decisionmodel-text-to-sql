import { config } from './config.js';
import { gatewayDecisionSchema, type DecisionResponse, type Question } from './decision-schema.js';
import { decisionPayload } from './decision-payload.js';
import { finalRound, mergeAnswers, splitWideChoices } from './decision-chunking.js';

async function ask(state: string, questions: Record<string, Question>, signal?: AbortSignal) {
  const key = process.env.COPILOT_API_KEY;
  if (!key) throw new Error('COPILOT_API_KEY is missing in .env');
  const response = await fetch(config.decisionsUrl, {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: decisionPayload(state, questions),
    signal: AbortSignal.any([AbortSignal.timeout(config.decisionTimeoutMs), ...(signal ? [signal] : [])]),
  });
  if (!response.ok) throw new Error(`Decisions API returned HTTP ${response.status}. Please retry later.`);
  const data = gatewayDecisionSchema.parse(await response.json());
  if (data.usage.output_tokens !== 0) throw new Error('Generative decision response rejected');
  return data;
}

export async function decide(state: string, questions: Record<string, Question>, signal?: AbortSignal): Promise<DecisionResponse> {
  const { split, wide } = splitWideChoices(questions, config.maxChoices);
  const first = await ask(state, split, signal);
  const final = wide.size ? await ask(state, finalRound(questions, wide, first.answers, config.finalistsPerPart), signal) : null;
  const answers = final ? mergeAnswers(first.answers, wide, final.answers) : first.answers;
  for (const [id, question] of Object.entries(questions)) {
    const answer = answers[id];
    if (!answer || answer.type !== question.type) throw new Error(`Invalid decision answer for ${id}`);
    if (question.type === 'choice' && answer.type === 'choice' && !(answer.choice in question.criteria)) throw new Error(`Unknown decision choice for ${id}`);
  }
  const inputTokens = first.usage.input_tokens + (final?.usage.input_tokens ?? 0);
  // The self-hosted gateway reports no provider or cost; the model runs on our own hardware.
  return { model: first.model, provider: config.provider, answers, usage: { input_tokens: inputTokens, output_tokens: 0, cost: 0 } };
}