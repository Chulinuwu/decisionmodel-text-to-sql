import { useEffect, useRef, useState } from 'react';
import { Icon } from '../layout/Icon';
import { ChatDatabaseDetail } from './ChatDatabaseDetail';
import { MeterDatabaseDetail } from './MeterDatabaseDetail';
import { TableBrowser } from './TableBrowser';
import type { DatabaseDialogProps } from '../../types/props';

export function DatabaseDialog({ database, detail, onRetry, onClose }: DatabaseDialogProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [table, setTable] = useState<string | null>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  // The dialog element has no padding, so a click whose target is the dialog itself landed on the backdrop.
  return <dialog ref={dialog} className="database-dialog" aria-labelledby="database-dialog-title" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="dialog-body">
      <header className="dialog-header">
        <div><span className="eyebrow">DATA SOURCE</span><h2 id="database-dialog-title">{database.name}</h2></div>
        <button type="button" className="icon-button" aria-label="ปิด" onClick={() => dialog.current?.close()}><Icon name="close" /></button>
      </header>
      {table !== null && <TableBrowser key={table} tablesUrl={database.endpoints.tables} table={table} onBack={() => setTable(null)}
        totalRows={detail.status === 'ready' && detail.data.engine === 'chat' ? detail.data.info.tables.find(entry => entry.name === table)?.rows : undefined} />}
      {/* Hidden rather than unmounted so the schema search and expanded tables survive a trip to the data view. */}
      <div hidden={table !== null}>
        <p className="dialog-about">{database.about}</p>
        <div className="dialog-examples"><h3>ตัวอย่างคำถาม</h3><ul>{database.examples.map(example => <li key={example}>{example}</li>)}</ul></div>
        {detail.status === 'loading' && <p role="status" className="muted">กำลังอ่านฐานข้อมูล...</p>}
        {detail.status === 'error' && <div className="sidebar-error" role="alert"><p>{detail.message}</p><button type="button" className="text-button" onClick={onRetry}>ลองเชื่อมต่ออีกครั้ง</button></div>}
        {detail.status === 'ready' && (detail.data.engine === 'chat' ? <ChatDatabaseDetail info={detail.data.info} onBrowseRows={setTable} /> : database.engine === 'meter' && <MeterDatabaseDetail info={detail.data.info} tables={database.tables} onBrowseRows={setTable} />)}
      </div>
    </div>
  </dialog>;
}
