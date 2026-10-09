import { examples } from '../../config/examples';
import { Icon } from './Icon';
import type { QueryComposerProps } from '../../types/props';

export function QueryComposer({ question, onChange, onEdit, onSubmit, inputRef, loading, disabled }: QueryComposerProps) {
  return <section className="chat-composer" aria-label="ถามข้อมูล">
    <form className="question-card" onSubmit={event => { event.preventDefault(); if (!disabled && !loading && question.trim().length >= 3) onSubmit(); }}>
      <label className="sr-only" htmlFor="question">คำถามเกี่ยวกับข้อมูล Olist</label>
      <textarea ref={inputRef} id="question" maxLength={600} value={question} onChange={event => onChange(event.target.value)} placeholder="เช่น จำนวนคำสั่งซื้อแยกตามรัฐของลูกค้าในปี 2017" onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
      <div className="composer-footer"><span>ภาษาไทยหรืออังกฤษ <span className="shortcut">· Ctrl / ⌘ + Enter</span></span><button className="primary-button" type="submit" disabled={disabled || loading || question.trim().length < 3}>{loading ? 'กำลังค้นหาคำตอบ' : 'ถามข้อมูล'}<Icon name="arrow" /></button></div>
    </form>
    <div className="examples"><span>ลองเริ่มจาก</span>{examples.map(example => <button key={example.label} disabled={loading} onClick={() => onEdit(example.question)}>{example.label}</button>)}</div>
  </section>;
}
