import type { MeterResponse } from '../../shared/meter-api';
import { fetchMeterAnswer } from '../meter/client';
import { meterContextOf } from '../meter/conversation';
import type { MeterDatabase } from '../types/database';
import type { MeterTurn, QuestionRequest } from '../types/state';
import { useConversation } from './useConversation';

export function useMeterChat({ endpoints }: MeterDatabase, initial: MeterTurn[], onChange: (turns: MeterTurn[]) => void) {
  const conversation = useConversation<QuestionRequest, MeterResponse>(initial, onChange, (request, history, signal) =>
    fetchMeterAnswer(endpoints.query, request.question, meterContextOf(history), signal));
  return { ...conversation, ask: (question: string) => conversation.ask({ kind: 'question', question }) };
}
