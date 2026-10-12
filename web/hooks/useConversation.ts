import { useEffect, useRef, useState } from 'react';
import type { SendTurn, Turn } from '../types/state';
import { settleTurn } from '../utils/thread-store';

export function useConversation<Request extends { question: string }, Response>(
  initial: Turn<Request, Response>[], onChange: (turns: Turn<Request, Response>[]) => void, send: SendTurn<Request, Response>,
) {
  const [turns, setTurns] = useState(() => initial.map(settleTurn));
  const active = useRef<{ id: number; controller: AbortController } | null>(null);
  const sequence = useRef(Math.max(0, ...initial.map(turn => turn.id)));

  useEffect(() => () => active.current?.controller.abort(), []);
  useEffect(() => onChange(turns), [turns]);

  const patch = (id: number, changes: Partial<Turn<Request, Response>>) => setTurns(current => current.map(turn => turn.id === id ? { ...turn, ...changes } : turn));

  function stopActive() {
    const running = active.current;
    active.current = null;
    running?.controller.abort();
    return running;
  }

  // One request at a time: the UI disables other triggers while one is pending, and this guard backs that up.
  async function run(id: number, request: Request) {
    if (active.current) return;
    const controller = new AbortController();
    active.current = { id, controller };
    // A just-asked turn is not in this render's turns yet, so every current turn is its history.
    const index = turns.findIndex(turn => turn.id === id);
    patch(id, { request, reply: { status: 'loading' } });
    try {
      const response = await send(request, index < 0 ? turns : turns.slice(0, index), controller.signal);
      if (!controller.signal.aborted) patch(id, { reply: { status: 'done', response } });
    } catch (error) {
      if (!controller.signal.aborted) patch(id, { reply: { status: 'error', message: error instanceof Error ? error.message : 'ค้นหาข้อมูลไม่สำเร็จ' } });
    } finally {
      if (active.current?.controller === controller) active.current = null;
    }
  }

  function ask(request: Request) {
    if (active.current) return;
    const id = ++sequence.current;
    setTurns(current => [...current, { id, request, reply: { status: 'loading' } }]);
    void run(id, request);
  }

  function cancel() {
    const running = stopActive();
    if (running) patch(running.id, { reply: { status: 'cancelled' } });
  }

  return {
    turns, ask, run, cancel,
    loading: turns.some(turn => turn.reply.status === 'loading'),
    retry: (turn: Turn<Request, Response>) => void run(turn.id, turn.request),
  };
}
