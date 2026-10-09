import { useEffect, useRef } from 'react';
import { ChatTurnItem } from './ChatTurnItem';
import type { ChatThreadProps } from '../../types/props';

export function ChatThread({ turns, ...handlers }: ChatThreadProps) {
  const latest = useRef<HTMLLIElement>(null);
  const last = turns.at(-1);
  useEffect(() => { latest.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [last?.id, last?.reply.status]);
  return <ol className="chat-thread" aria-label="บทสนทนา">
    {turns.map(turn => <li key={turn.id} ref={turn === last ? latest : undefined}><ChatTurnItem turn={turn} {...handlers} /></li>)}
  </ol>;
}
