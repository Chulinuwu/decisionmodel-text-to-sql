import { useState } from 'react';
import { AppHeader } from '../components/layout/AppHeader';
import { DatasetPanel } from '../components/layout/DatasetPanel';
import { QueryComposer } from '../components/layout/QueryComposer';
import { ChatThread } from '../components/chat/ChatThread';
import { ChatWelcome } from '../components/chat/ChatWelcome';
import { useChat } from '../hooks/useChat';
import { useDataset } from '../hooks/useDataset';
import { useQuestionDraft } from '../hooks/useQuestionDraft';

import { MeterWorkspace } from '../meter/MeterWorkspace';

export function App() {
  const [domain, setDomain] = useState(window.location.hash === '#meter' ? 'meter' : 'olist');
  return <><nav aria-label="Dataset" className="examples">
    <button aria-pressed={domain === 'olist'} onClick={() => { setDomain('olist'); window.location.hash = 'olist'; }}>Olist</button>
    <button aria-pressed={domain === 'meter'} onClick={() => { setDomain('meter'); window.location.hash = 'meter'; }}>Synthetic meters</button>
  </nav>{domain === 'meter' ? <MeterWorkspace /> : <OlistWorkspace />}</>;
}

function OlistWorkspace() {
  const { question, setQuestion, inputRef, editQuestion } = useQuestionDraft();
  const [showDataset, setShowDataset] = useState(false);
  const { dataset, reloadDataset } = useDataset();
  const chat = useChat();
  const ready = dataset.status === 'ready' && dataset.data.ready;
  return <div className="app-shell">
    <AppHeader showDataset={showDataset} onToggleDataset={() => setShowDataset(value => !value)} />
    <div className="workspace"><div id="dataset-sidebar" className={`sidebar-wrap ${showDataset ? 'mobile-open' : ''}`}><DatasetPanel state={dataset} retry={reloadDataset} /></div><main>
      {chat.turns.length === 0
        ? <ChatWelcome />
        : <div className="chat-toolbar"><button type="button" className="secondary-button" onClick={chat.reset}>เริ่มแชทใหม่</button></div>}
      <ChatThread turns={chat.turns} dataset={dataset.status === 'ready' ? dataset.data : undefined} disabled={!ready || chat.loading} onExecute={chat.execute} onCancel={chat.cancel} onRetry={chat.retry} />
      {!ready && dataset.status !== 'loading' && <p className="availability-note" role="status">รอฐานข้อมูลพร้อมใช้งานก่อนถามข้อมูล</p>}
      <QueryComposer question={question} onChange={setQuestion} onEdit={editQuestion} inputRef={inputRef} onSubmit={() => { chat.ask(question.trim()); setQuestion(''); }} loading={chat.loading} disabled={!ready} />
      <footer className="workspace-footer"><span>Olist Brazilian E-Commerce · ข้อมูลในอดีต</span><span>Clef Flash / Decision Model</span></footer>
    </main></div>
  </div>;
}
