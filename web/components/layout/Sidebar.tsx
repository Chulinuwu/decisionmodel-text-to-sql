import { DatabaseList } from '../databases/DatabaseList';
import { ThreadList } from '../threads/ThreadList';
import { Icon } from './Icon';
import type { SidebarProps } from '../../types/props';

export function Sidebar({ threads, activeId, onOpen, onNewChat, ...databaseProps }: SidebarProps) {
  return <aside className="sidebar" aria-label="แชทและฐานข้อมูล">
    <section className="sidebar-section" aria-labelledby="sidebar-chats">
      <h2 id="sidebar-chats" className="sidebar-heading">แชท</h2>
      <button type="button" className="primary-button new-chat-button" onClick={onNewChat}><Icon name="plus" />แชทใหม่</button>
      <ThreadList threads={threads} activeId={activeId} onOpen={onOpen} />
    </section>
    <section className="sidebar-section" aria-labelledby="sidebar-databases">
      <h2 id="sidebar-databases" className="sidebar-heading">ฐานข้อมูล</h2>
      <DatabaseList {...databaseProps} />
    </section>
  </aside>;
}
