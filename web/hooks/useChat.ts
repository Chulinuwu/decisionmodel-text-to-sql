import { fetchExecute, fetchQuery } from '../api/client';
import type { Interpretation, QueryResponse } from '../../shared/schema';
import type { ChatDatabase } from '../types/database';
import type { ChatTurn, QueryRequest } from '../types/state';
import { useConversation } from './useConversation';

export function useChat({ endpoints }: ChatDatabase, initial: ChatTurn[], onChange: (turns: ChatTurn[]) => void) {
  const conversation = useConversation<QueryRequest, QueryResponse>(initial, onChange, (request, _history, signal) => request.kind === 'execute'
    ? fetchExecute(endpoints.execute, request.offerId, request.interpretation.id, signal)
    : fetchQuery(endpoints.query, request.question, signal));
  return {
    ...conversation,
    ask: (question: string) => conversation.ask({ kind: 'question', question }),
    execute: (id: number, offerId: string, interpretation: Interpretation) => {
      const turn = conversation.turns.find(candidate => candidate.id === id);
      if (turn) void conversation.run(id, { kind: 'execute', question: turn.request.question, offerId, interpretation });
    },
  };
}
