import { config } from './config.js';
import { decisionResponseSchema, type DecisionResponse, type Question } from './decision-schema.js';

export async function decide(state: string, questions: Record<string, Question>, signal?: AbortSignal): Promise<DecisionResponse> {
  if (!process.env.OPENROUTER_KEY) throw new Error('OPENROUTER_KEY is missing in .env');
  if (Buffer.byteLength(state) > 2600) throw new Error('Decision state exceeds the safe context budget');
  const payload = JSON.stringify({ model: config.model, state, questions });
  if (Buffer.byteLength(payload) > 32000) throw new Error('Decision request exceeds safe schema/context budget');
  if (Object.values(questions).some(question => question.type === 'choice' && Object.keys(question.criteria).length > 255)) throw new Error('Decision answer-space exceeds 255 choices');
  const response = await fetch(config.decisionsUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_KEY}`, 'Content-Type': 'application/json', 'X-OpenRouter-Title': 'Olist Decision SQL Local' },
    body: payload,
    signal: AbortSignal.any([AbortSignal.timeout(config.decisionTimeoutMs), ...(signal ? [signal] : [])]),
  });
  if (!response.ok) throw new Error(`Decisions API returned HTTP ${response.status}. ${response.status === 402 ? 'Please check OpenRouter credit balance.' : 'Please retry later.'}`);
  const data = decisionResponseSchema.parse(await response.json());
  if (data.model !== config.model || data.provider !== config.provider || data.usage.output_tokens !== 0) throw new Error('Unexpected decision provider or generative response rejected');
  for (const [id, question] of Object.entries(questions)) {
    const answer = data.answers[id];
    if (!answer || answer.type !== question.type) throw new Error(`Invalid decision answer for ${id}`);
    if (question.type === 'choice' && answer.type === 'choice' && !(answer.choice in question.criteria)) throw new Error(`Unknown decision choice for ${id}`);
  }
  return data;
}
