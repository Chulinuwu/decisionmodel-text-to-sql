import { databases } from '../../config/databases';
import { databaseStatusLabels } from '../../config/labels';
import { databaseStatus } from '../../utils/database-status';
import type { DatabaseListProps } from '../../types/props';

export function DatabaseList({ connectedId, detailOf, onConnect, onBrowse }: DatabaseListProps) {
  return <ul className="database-list">
    {databases.map(database => {
      const status = databaseStatus(detailOf(database.id));
      const connected = database.id === connectedId;
      return <li key={database.id} className={`database-item${connected ? ' connected' : ''}`}>
        <div className="database-name"><span className={`status-dot ${status}`} title={databaseStatusLabels[status]} /><strong>{database.name}</strong>{connected && <span className="connected-badge">เชื่อมต่ออยู่</span>}</div>
        <p className="database-description" title={database.description}>{database.description}</p>
        <span className="sr-only">{databaseStatusLabels[status]}</span>
        <div className="database-actions">
          {!connected && <button type="button" className="row-button" onClick={() => onConnect(database)}>เชื่อมต่อ</button>}
          <button type="button" className="row-button" onClick={() => onBrowse(database)}>ดูข้อมูล</button>
        </div>
      </li>;
    })}
  </ul>;
}
