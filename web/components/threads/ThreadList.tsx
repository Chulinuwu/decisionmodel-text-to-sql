import type { ThreadListProps } from '../../types/props';

export function ThreadList({ threads, activeId, onOpen }: ThreadListProps) {
  const started = threads.filter(thread => thread.turns.length > 0);
  if (started.length === 0) return <p className="muted small">ยังไม่มีแชท เริ่มถามได้จากช่องด้านล่าง</p>;
  return <ul className="thread-list">
    {started.map(thread => <li key={thread.id}>
      <button type="button" className={`thread-item${thread.id === activeId ? ' active' : ''}`} aria-current={thread.id === activeId ? 'true' : undefined} onClick={() => onOpen(thread.id)}>
        <span className="thread-title">{thread.turns[0].request.question}</span>
        <span className="thread-database">{thread.database.name}</span>
      </button>
    </li>)}
  </ul>;
}
