import { useEffect, useState } from 'react';
import { ChatConversation } from '../components/chat/ChatConversation';
import { DatabaseDialog } from '../components/databases/DatabaseDialog';
import { Icon } from '../components/layout/Icon';
import { Sidebar } from '../components/layout/Sidebar';
import { MeterConversation } from '../components/meter/MeterConversation';
import { useDatabaseDetails } from '../hooks/useDatabaseDetails';
import { useWorkspace } from '../hooks/useWorkspace';
import type { DatabaseEntry } from '../types/database';
import { isChatThread } from '../utils/thread-store';

export function App() {
  const { threads, active, connect, newChat, open, update } = useWorkspace();
  const { detailOf, reload } = useDatabaseDetails();
  const [browsing, setBrowsing] = useState<DatabaseEntry | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  useEffect(() => setSidebarOpen(false), [active.id]);
  const detail = detailOf(active.database.id);
  return <div className={`workspace${sidebarOpen ? ' sidebar-open' : ''}`}>
    <div className="sidebar-wrap" id="sidebar">
      <Sidebar threads={threads} activeId={active.id} onOpen={open} onNewChat={newChat}
        connectedId={active.database.id} detailOf={detailOf} onConnect={connect} onBrowse={setBrowsing} />
    </div>
    <main className="chat-main">
      <button type="button" className="sidebar-toggle" aria-controls="sidebar" aria-expanded={sidebarOpen} onClick={() => setSidebarOpen(value => !value)}>
        <Icon name={sidebarOpen ? 'close' : 'menu'} />{active.database.name}
      </button>
      {isChatThread(active)
        ? <ChatConversation key={active.id} thread={active} detail={detail} onChange={update} />
        : <MeterConversation key={active.id} thread={active} detail={detail} onChange={update} />}
    </main>
    {sidebarOpen && <div className="sidebar-scrim" aria-hidden="true" onClick={() => setSidebarOpen(false)} />}
    {browsing && <DatabaseDialog database={browsing} detail={detailOf(browsing.id)} onRetry={() => reload(browsing)} onClose={() => setBrowsing(null)} />}
  </div>;
}
