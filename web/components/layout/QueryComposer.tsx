import { useLayoutEffect } from 'react';
import { Icon } from './Icon';
import type { QueryComposerProps } from '../../types/props';

export function QueryComposer({ question, onChange, onSubmit, placeholder, inputRef, loading, disabled }: QueryComposerProps) {
  // Resetting to auto first lets the box shrink again; the CSS max-height caps growth.
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    input.style.height = 'auto';
    input.style.height = `${input.scrollHeight}px`;
  }, [question, inputRef]);
  return <section className="chat-composer" aria-label="ถามข้อมูล">
    <form className="question-card" onSubmit={event => { event.preventDefault(); if (!disabled && !loading && question.trim().length >= 3) onSubmit(); }}>
      <label className="sr-only" htmlFor="question">คำถามเกี่ยวกับข้อมูล</label>
      <textarea ref={inputRef} id="question" rows={1} maxLength={600} value={question} onChange={event => onChange(event.target.value)} placeholder={placeholder} onKeyDown={event => {
        // isComposing: Enter that confirms an IME candidate must not send.
        if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); }
      }} />
      <button className="send-button" type="submit" aria-busy={loading} disabled={disabled || loading || question.trim().length < 3}><span className="sr-only">{loading ? 'กำลังค้นหาคำตอบ' : 'ถามข้อมูล'}</span><Icon name="send" /></button>
    </form>
  </section>;
}