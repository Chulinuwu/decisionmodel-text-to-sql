import { Icon } from './Icon';
import type { QueryComposerProps } from '../../types/props';

export function QueryComposer({ question, onChange, onSubmit, inputRef, loading, disabled }: QueryComposerProps) {
  return <section className="chat-composer" aria-label="ถามข้อมูล">
    <form className="question-card composer-row" onSubmit={event => { event.preventDefault(); if (!disabled && !loading && question.trim().length >= 3) onSubmit(); }}>
      <label className="sr-only" htmlFor="question">คำถามเกี่ยวกับข้อมูล</label>
      <textarea ref={inputRef} id="question" rows={1} maxLength={600} value={question} onChange={event => onChange(event.target.value)} placeholder="เช่น จำนวนคำสั่งซื้อแยกตามรัฐของลูกค้าในปี 2017" onKeyDown={event => {
        // isComposing: Enter that confirms an IME candidate must not send.
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
      }} />
      <button className="primary-button" type="submit" disabled={disabled || loading || question.trim().length < 3}>{loading ? 'กำลังค้นหาคำตอบ' : 'ถามข้อมูล'}<Icon name="arrow" /></button>
    </form>
  </section>;
}