import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { mapError } from './error-mapping.js';
import { httpMessages } from './http-messages.js';
import type { ConcurrencyGate } from './http.types.js';

export function jsonEndpoint<T>(gate: ConcurrencyGate, schema: z.ZodType<T>, invalidMessage: string, handle: (input: T, signal: AbortSignal) => Promise<unknown>): RequestHandler {
  return async (request, response) => {
    const input = schema.safeParse(request.body);
    if (!input.success) return void response.status(400).json({ error: invalidMessage });
    if (!gate.tryEnter()) return void response.status(429).json({ error: httpMessages.busy });
    const controller = new AbortController();
    response.on('close', () => { if (!response.writableFinished) controller.abort(); });
    try { response.json(await handle(input.data, controller.signal)); }
    catch (error) {
      if (response.destroyed) return;
      const { status, error: message } = mapError(error);
      response.status(status).json({ error: message });
    }
    finally { gate.leave(); }
  };
}
