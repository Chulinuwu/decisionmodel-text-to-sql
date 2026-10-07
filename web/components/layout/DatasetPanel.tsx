import { useState } from 'react';
import type { DatasetPanelProps } from '../../types/props';
import { numberLocale } from '../../config/labels';
import { Icon } from './Icon';

export function DatasetPanel({ state, retry }: DatasetPanelProps) {
  const [search, setSearch] = useState('');
  return <aside className="dataset-panel" aria-label="โครงสร้างข้อมูล">
    <div className="dataset-heading"><span className="eyebrow">DATA SOURCE</span><Icon name="database" /></div>
    <h2>Brazilian E-Commerce</h2>
    <p className="muted small">Olist · ข้อมูลสาธารณะจาก Kaggle</p>
    {state.status === 'loading' && <p role="status" className="muted">กำลังอ่านฐานข้อมูล...</p>}
    {state.status === 'error' && <div className="sidebar-error" role="alert"><p>{state.message}</p><button className="text-button" onClick={retry}>ลองเชื่อมต่ออีกครั้ง</button></div>}
    {state.status === 'ready' && <>
      <div className="source-state"><span className={`status-dot ${state.data.ready ? '' : 'offline'}`} />{state.data.ready ? 'เชื่อมต่อ PostgreSQL แล้ว' : 'ฐานข้อมูลยังไม่พร้อม'}</div>
      <div className="dataset-count"><strong>{state.data.orders.toLocaleString(numberLocale)}</strong><span>คำสั่งซื้อ</span></div>
      <p className="date-range">{state.data.minDate.slice(0, 10)} <span>ถึง</span> {state.data.maxDate.slice(0, 10)}</p>
      <p className="coverage-window"><strong>ช่วงที่ข้อมูลครบ</strong> {state.data.schema.coverage.start} <span>ถึงก่อน</span> {state.data.schema.coverage.end}</p>
      <div className="schema-heading"><h3>ตารางและคอลัมน์</h3><span>{state.data.schema.relations.length}</span></div>
      <label className="sr-only" htmlFor="schema-search">ค้นหาตารางหรือคอลัมน์</label>
      <input id="schema-search" className="schema-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="ค้นหาตาราง / คอลัมน์" type="search" />
      <div className="schema-list">
        {state.data.schema.relations.filter(relation => `${relation.name} ${relation.description} ${relation.columns.map(column => `${column.name} ${column.description}`).join(' ')}`.toLowerCase().includes(search.toLowerCase())).map(relation => <details key={relation.name} className="relation">
          <summary><span>{relation.name}</span><span className="row-count">{state.data.tables.find(table => table.name === relation.name)?.rows.toLocaleString(numberLocale) ?? relation.columns.length}</span></summary>
          <p className="relation-description">{relation.description}</p>
          <p className="grain"><strong>1 แถว:</strong> {relation.grain}</p>
          <ul className="column-list">{relation.columns.map(column => <li key={column.name}><div><code>{column.name}</code><span>{column.type}{column.nullable ? ' · null' : ''}</span></div><p>{column.description}</p>{column.values.length > 0 && <small>{column.values.join(', ')}</small>}</li>)}</ul>
        </details>)}
      </div>
      <details className="schema-edges"><summary>ความสัมพันธ์ที่เชื่อมได้</summary>{state.data.schema.edges.map(edge => <p key={edge.id}><code>{edge.from}.{edge.fromColumn}</code><br /><span>เชื่อมกับ </span><code>{edge.to}.{edge.toColumn}</code><small>{edge.cardinality}</small></p>)}</details>
      <a className="source-link" href={state.data.source} target="_blank" rel="noreferrer">ดูแหล่งข้อมูลต้นฉบับ ↗</a>
    </>}
  </aside>;
}
