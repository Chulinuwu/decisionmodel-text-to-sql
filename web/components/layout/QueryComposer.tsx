import { examples } from '../../config/examples';
import { Icon } from './Icon';
import type { QueryComposerProps } from '../../types/props';

export function QueryComposer({ question, onChange, onEdit, onSubmit, inputRef, loading, disabled }: QueryComposerProps) {
  return <section aria-labelledby="question-heading">
    <div className="intro"><span className="eyebrow">YOUR DATA, IN PLAIN LANGUAGE</span><h1 id="question-heading">อยากรู้อะไรจากข้อมูลนี้?</h1><p>เริ่มด้วยคำถามของคุณ แล้วดูคำตอบจากข้อมูลจริง</p></div>
    <form className="question-card" onSubmit={event => { event.preventDefault(); if (!disabled && !loading && question.trim().length >= 3) onSubmit(); }}>
      <label className="sr-only" htmlFor="question">คำถามเกี่ยวกับข้อมูล Olist</label>
      <textarea ref={inputRef} id="question" maxLength={600} value={question} onChange={event => onChange(event.target.value)} placeholder="เช่น จำนวนคำสั่งซื้อแยกตามรัฐของลูกค้าในปี 2017" onKeyDown={event => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
      <div className="composer-footer"><span>ภาษาไทยหรืออังกฤษ <span className="shortcut">· Ctrl / ⌘ + Enter</span></span><button className="primary-button" type="submit" disabled={disabled || loading || question.trim().length < 3}>{loading ? 'กำลังค้นหาคำตอบ' : 'ถามข้อมูล'}<Icon name="arrow" /></button></div>
    </form>
    <div className="examples"><span>ลองเริ่มจาก</span>{examples.map(example => <button key={example.label} disabled={loading} onClick={() => onEdit(example.question)}>{example.label}</button>)}</div>
    <p className="scope-note">ดูแถว สรุปจำนวน ผลรวม ค่าเฉลี่ย และจัดกลุ่มจากคอลัมน์ที่มี เลือกช่วงเวลาและเรียงลำดับได้ สูงสุด 100 แถวต่อคำถาม</p>
    <p className="experimental-note">ต้นแบบทดลอง การตีความคำถามยังคลาดเคลื่อนได้ โปรดตรวจแผนและเงื่อนไขก่อนใช้ผลลัพธ์</p>
  </section>;
}
