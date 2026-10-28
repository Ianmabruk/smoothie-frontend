import { useEffect, useRef } from 'react';
import { markdownToHtml, renderMathInElement } from './markdown';

export default function MarkdownMessage({ text, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = markdownToHtml(text);
    renderMathInElement(ref.current);
  }, [text]);

  return (
    <div className={`whitespace-pre-wrap break-words ${className}`} ref={ref} />
  );
}
