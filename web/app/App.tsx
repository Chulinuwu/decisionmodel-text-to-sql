import { DatasetPanel } from '../components/layout/DatasetPanel';
import { QueryComposer } from '../components/layout/QueryComposer';
import { ChatThread } from '../components/chat/ChatThread';
import { ChatWelcome } from '../components/chat/ChatWelcome';
import { useChat } from '../hooks/useChat';
import { useDataset } from '../hooks/useDataset';
import { useQuestionDraft } from '../hooks/useQuestionDraft';

import { MeterWorkspace } from '../meter/MeterWorkspace';

export function App() {
  return window.location.hash === '#meter' ? <MeterWorkspace /> : <ChatWorkspace />;
}

function ChatWorkspace() {
  const { question, setQuestion, inputRef } = useQuestionDraft();
  const { dataset, reloadDataset } = useDataset();
  const chat = useChat();
  const ready = dataset.status === 'ready' && dataset.data.ready;
  return <div className="app-shell">
    <div className="workspace"><div className="sidebar-wrap"><DatasetPanel state={dataset} retry={reloadDataset} /></div><main className="chat-main">      {chat.turns.length === 0
        ? <ChatWelcome />
        : <div className="chat-toolbar"><button type="button" className="secondary-button" onClick={chat.reset}>เริ่มแชทใหม่</button></div>}
      <ChatThread turns={chat.turns} dataset={dataset.status === 'ready' ? dataset.data : undefined} disabled={!ready || chat.loading} onExecute={chat.execute} onCancel={chat.cancel} onRetry={chat.retry} />
      {!ready && dataset.status !== 'loading' && <p className="availability-note" role="status">รอฐานข้อมูลพร้อมใช้งานก่อนถามข้อมูล</p>}
      <QueryComposer question={question} onChange={setQuestion} inputRef={inputRef} onSubmit={() => { chat.ask(question.trim()); setQuestion(''); }} loading={chat.loading} disabled={!ready} />
    </main></div>
  </div>;
}
