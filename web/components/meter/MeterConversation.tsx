import { useEffect, useRef } from 'react';
import { QueryComposer } from '../layout/QueryComposer';
import { MeterTurnItem } from './MeterTurnItem';
import { MeterWelcome } from './MeterWelcome';
import { useMeterChat } from '../../hooks/useMeterChat';
import { useQuestionDraft } from '../../hooks/useQuestionDraft';
import { databaseStatus } from '../../utils/database-status';
import type { MeterConversationProps } from '../../types/props';

export function MeterConversation({ thread, detail, onChange }: MeterConversationProps) {
  const { question, setQuestion, inputRef } = useQuestionDraft();
  const chat = useMeterChat(thread.database, thread.turns, turns => onChange({ ...thread, turns }));
  const status = databaseStatus(detail);
  const latest = useRef<HTMLLIElement>(null);
  const last = chat.turns.at(-1);
  useEffect(() => { latest.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, [last?.id, last?.reply.status]);
  return <>
    {chat.turns.length === 0 && <MeterWelcome databaseName={thread.database.name} />}
    <ol className="chat-thread" aria-label="บทสนทนา">
      {chat.turns.map(turn => <li key={turn.id} ref={turn === last ? latest : undefined}><MeterTurnItem turn={turn} disabled={status !== 'ready' || chat.loading} onCancel={chat.cancel} onRetry={chat.retry} /></li>)}
    </ol>
    {status === 'offline' && <p className="availability-note" role="status">รอฐานข้อมูลพร้อมใช้งานก่อนถามข้อมูล</p>}
    <QueryComposer question={question} onChange={setQuestion} inputRef={inputRef} placeholder={thread.database.placeholder} onSubmit={() => { chat.ask(question.trim()); setQuestion(''); }} loading={chat.loading} disabled={status !== 'ready'} />
  </>;
}
