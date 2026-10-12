import { z } from 'zod';

export const answerSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('choice'), choice: z.string(), probabilities: z.record(z.string(), z.number().min(0).max(1)), confidence: z.number().min(0).max(1).optional() }),
  z.object({ type: z.literal('noul'), noul: z.number().min(0).max(1) }),
]);
export const gatewayDecisionSchema = z.object({
  model: z.string(),
  answers: z.record(z.string(), answerSchema),
  usage: z.object({ input_tokens: z.number(), output_tokens: z.number() }),
});
type GatewayDecision = z.infer<typeof gatewayDecisionSchema>;
export type Question = { type: 'choice'; instructions: string; criteria: Record<string, string> } | { type: 'noul'; instructions: string; criteria: { true: string; false: string } };
export type DecisionResponse = Omit<GatewayDecision, 'usage'> & { provider: string; usage: GatewayDecision['usage'] & { cost: number } };