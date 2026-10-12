import { useState } from 'react';
import type { ChatDatabaseDetailProps } from '../../types/props';
import { numberLocale } from '../../../shared/result-config';

export function ChatDatabaseDetail({ info, onBrowseRows }: ChatDatabaseDetailProps) {
  const [search, setSearch] = useState('');
  return <div className="detail-grid">
    <section className="detail-summary" aria-label="ภาพรวมข้อมูล">
      <div className="source-state"><span className={`status-dot ${info.ready ? '' : 'offline'}`} />{info.ready ? 'เชื่อมต่อ PostgreSQL แล้ว' : 'ฐานข้อมูลยังไม่พร้อม'}</div>
      <dl className="detail-stats">
        <div><dt>คำสั่งซื้อ</dt><dd>{info.orders.toLocaleString(numberLocale)}</dd></div>
        <div><dt>ลูกค้า</dt><dd>{info.customers.toLocaleString(numberLocale)}</dd></div>
        <div><dt>รายการสินค้า</dt><dd>{info.items.toLocaleString(numberLocale)}</dd></div>
      </dl>
      <p className="date-range">{info.minDate.slice(0, 10)} <span>ถึง</span> {info.maxDate.slice(0, 10)}</p>
      <p className="coverage-window"><strong>ช่วงที่ข้อมูลครบ</strong> {info.schema.coverage.start} <span>ถึงก่อน</span> {info.schema.coverage.end}</p>
      <details className="schema-edges"><summary>ความสัมพันธ์ที่เชื่อมได้</summary>{info.schema.edges.map(edge => <p key={edge.id}><code>{edge.from}.{edge.fromColumn}</code><br /><span>เชื่อมกับ </span><code>{edge.to}.{edge.toColumn}</code><small>{edge.cardinality}</small></p>)}</details>
      <a className="source-link" href={info.source} target="_blank" rel="noreferrer">ดูแหล่งข้อมูลต้นฉบับ ↗</a>
    </section>
    <section aria-label="ตารางและคอลัมน์">
      <div className="schema-heading"><h3>ตารางและคอลัมน์</h3><span>{info.schema.relations.length}</span></div>
      <label className="sr-only" htmlFor="schema-search">ค้นหาตารางหรือคอลัมน์</label>
      <input id="schema-search" className="schema-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาตาราง / คอลัมน์" type="search" />
      <div className="schema-list">
        {info.schema.relations.filter(relation => `${relation.name} ${relation.description} ${relation.columns.map(column => `${column.name} ${column.description}`).join(' ')}`.toLowerCase().includes(search.toLowerCase())).map(relation => <details key={relation.name} className="relation">
          <summary><span>{relation.name}</span><span className="row-count">{info.tables.find(table => table.name === relation.name)?.rows.toLocaleString(numberLocale) ?? relation.columns.length}</span></summary>
          <p className="relation-description">{relation.description}</p>
          <p className="grain"><strong>1 แถว:</strong> {relation.grain}</p>
          <button type="button" className="row-button relation-browse" onClick={() => onBrowseRows(relation.name)}>ดูแถวข้อมูล</button>
          <ul className="column-list">{relation.columns.map(column => <li key={column.name}><div><code>{column.name}</code><span>{column.type}{column.nullable ? ' · null' : ''}</span></div><p>{column.description}</p>{column.values.length > 0 && <small>{column.values.join(', ')}</small>}</li>)}</ul>
        </details>)}
      </div>
    </section>
  </div>;
}
