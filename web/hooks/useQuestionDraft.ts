import { useRef, useState } from 'react';

export function useQuestionDraft() {
  const [question, setQuestion] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  return { question, setQuestion, inputRef };
}