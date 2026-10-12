import type { MeterResponse } from '../../shared/meter-api';
import type { MeterTurn } from '../types/state';

export function nextMeterContextId(current: string | undefined, response: MeterResponse) {
  if (response.status === 'ok') return response.contextId;
  return response.contextReset ? undefined : current;
}

// The context id is replayed from the thread's answered turns, so it is never stored separately and survives reloads.
export const meterContextOf = (turns: MeterTurn[]) => turns.reduce<string | undefined>(
  (current, turn) => turn.reply.status === 'done' ? nextMeterContextId(current, turn.reply.response) : current, undefined);
