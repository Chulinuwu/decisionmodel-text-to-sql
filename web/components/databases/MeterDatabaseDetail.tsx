import type { MeterDatabaseDetailProps } from '../../types/props';

export function MeterDatabaseDetail({ info, tables, onBrowseRows }: MeterDatabaseDetailProps) {
  return <div className="detail-grid">
    <section className="detail-summary" aria-label="ภาพรวมข้อมูล">
      <div className="source-state"><span className="status-dot" />ข้อมูลจำลอง (synthetic) ไม่ได้มาจากโรงงานจริง</div>
      <dl className="detail-stats">
        <div><dt>เวลาอ้างอิงของข้อมูล</dt><dd>{new Date(info.context.asOf).toLocaleString('en-GB', { timeZone: info.context.timezone })}</dd></div>
        <div><dt>เขตเวลา</dt><dd>{info.context.timezone}</dd></div>
      </dl>
      <p className="coverage-window"><strong>ที่มาของข้อมูล</strong> ชุดข้อมูลจำลองสำหรับสาธิต รหัสชุดข้อมูล <code>{info.fingerprint}</code></p>
    </section>
    <section aria-label="ขอบเขตข้อมูล">
      <div className="schema-heading"><h3>ตาราง</h3><span>{tables.length}</span></div>
      <ul className="browse-table-list">{tables.map(table => <li key={table}><code>{table}</code><button type="button" className="row-button" onClick={() => onBrowseRows(table)}>ดูแถวข้อมูล</button></li>)}</ul>
      <div className="schema-heading"><h3>ทรัพยากรที่วัด</h3><span>{info.resources.length}</span></div>
      <ul className="tag-list">{info.resources.map(resource => <li key={resource}>{resource}</li>)}</ul>
      <div className="schema-heading"><h3>อาคาร</h3><span>{info.buildings.length}</span></div>
      <ul className="tag-list">{info.buildings.map(building => <li key={building}>{building}</li>)}</ul>
      <div className="schema-heading"><h3>ชั้น</h3><span>{info.floors.length}</span></div>
      <ul className="tag-list">{info.floors.map(floor => <li key={floor}>{floor}</li>)}</ul>
    </section>
  </div>;
}
