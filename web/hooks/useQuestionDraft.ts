import { useRef, useState } from 'react';

export function useQuestionDraft() {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function editQuestion(value: string) {
    setQuestion(value);
    inputRef.current?.focus();
    inputRef.current?.scrollIntoView({ block: 'center' });
  }

  return { question, setQuestion, inputRef, editQuestion };
}
