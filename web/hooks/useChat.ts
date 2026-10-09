import { useEffect, useRef, useState } from 'react';
import { fetchExecute, fetchQuery } from '../api/client';
import type { Interpretation } from '../../shared/schema';
import type { ChatTurn, QueryRequest } from '../types/state';

const send = (request: QueryRequest, signal: AbortSignal) => request.kind === 'execute'
  ? fetchExecute(request.offerId, request.interpretation.id, signal)
  : fetchQuery(request.question, signal);

export function useChat() {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const active = useRef<{ id: number; controller: AbortController } | null>(null);
  const sequence = useRef(0);

  useEffect(() => () => active.current?.controller.abort(), []);

  const patch = (id: number, changes: Partial<ChatTurn>) => setTurns(current => current.map(turn => turn.id === id ? { ...turn, ...changes } : turn));

  function stopActive() {
    const running = active.current;
    active.current = null;
    running?.controller.abort();
    return running;
  }

  // One request at a time: the UI disables other triggers while one is pending, and this guard backs that up.
  async function run(id: number, request: QueryRequest) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = { id, controller };
    patch(id, { request, reply: { status: 'loading' } });
    try {
      const response = await send(request, controller.signal);
      if (!controller.signal.aborted) patch(id, { reply: { status: 'done', response } });
    } catch (error) {
      if (!controller.signal.aborted) patch(id, { reply: { status: 'error', message: error instanceof Error ? error.message : 'ค้นหาข้อมูลไม่สำเร็จ' } });
    } finally {
      if (active.current?.controller === controller) active.current = null;
    }
  }

  function ask(question: string) {
    if (active.current) return;
    const id = ++sequence.current;
    const request: QueryRequest = { kind: 'question', question };
    setTurns(current => [...current, { id, request, reply: { status: 'loading' } }]);
    void run(id, request);
  }

  function cancel() {
    const running = stopActive();
    if (running) patch(running.id, { reply: { status: 'cancelled' } });
  }

  function reset() {
    stopActive();
    setTurns([]);
  }

  return {
    turns, ask, cancel, reset,
    loading: turns.some(turn => turn.reply.status === 'loading'),
    retry: (turn: ChatTurn) => void run(turn.id, turn.request),
    execute: (id: number, offerId: string, interpretation: Interpretation) => {
      const turn = turns.find(candidate => candidate.id === id);
      if (turn) void run(id, { kind: 'execute', question: turn.request.question, offerId, interpretation });
    },
  };
}
