import { QueryComposer } from '../layout/QueryComposer';
import { ChatThread } from './ChatThread';
import { ChatWelcome } from './ChatWelcome';
import { useChat } from '../../hooks/useChat';
import { useQuestionDraft } from '../../hooks/useQuestionDraft';
import { databaseStatus } from '../../utils/database-status';
import type { ChatConversationProps } from '../../types/props';

export function ChatConversation({ thread, detail, onChange }: ChatConversationProps) {
  const { question, setQuestion, inputRef } = useQuestionDraft();
  const chat = useChat(thread.database, thread.turns, turns => onChange({ ...thread, turns }));
  const status = databaseStatus(detail);
  return <>
    {chat.turns.length === 0 && <ChatWelcome databaseName={thread.database.name} />}
    <ChatThread turns={chat.turns} dataset={detail.status === 'ready' && detail.data.engine === 'chat' ? detail.data.info : undefined} disabled={status !== 'ready' || chat.loading} onExecute={chat.execute} onCancel={chat.cancel} onRetry={chat.retry} />
    {status === 'offline' && <p className="availability-note" role="status">รอฐานข้อมูลพร้อมใช้งานก่อนถามข้อมูล</p>}
    <QueryComposer question={question} onChange={setQuestion} inputRef={inputRef} placeholder={thread.database.placeholder} onSubmit={() => { chat.ask(question.trim()); setQuestion(''); }} loading={chat.loading} disabled={status !== 'ready'} />
  </>;
}
