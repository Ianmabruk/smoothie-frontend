/**
 * Secure Markdown + math renderer for Smoothie AI.
 *
 * Model output is treated as untrusted:
 *   - it is parsed with marked,
 *   - sanitized with DOMPurify (only a safe subset of HTML/attributes),
 *   - math expressions are rendered client-side with KaTeX.
 * No `<script>`, `onclick`, `style` or other executable/injectable HTML is
 * allowed through from the model.
 */

import { marked } from 'marked';
import DOMPurify from 'dompurify';
import katex from 'katex';

const MATH_DISPLAY_DOUBLE_DOLLAR = /\$\$([\s\S]*?)\$\$/g;
const MATH_DISPLAY_BRACKET = /\\\[([\s\S]*?)\\\]/g;
const MATH_INLINE = /\\(([\s\S]*?)\\)/g;

const placeholders = [];
const NULL = '\x00';

function extractMath(text) {
  placeholders.length = 0;
  return text
    // Display math: $$...$$
    .replace(MATH_DISPLAY_DOUBLE_DOLLAR, (match, tex) => {
      placeholders.push({ type: 'block', tex: tex.trim() });
      return `${NULL}SMOOTHIE_MATH_${placeholders.length - 1}${NULL}`;
    })
    // Display math: \[...\]
    .replace(MATH_DISPLAY_BRACKET, (match, tex) => {
      placeholders.push({ type: 'block', tex: tex.trim() });
      return `${NULL}SMOOTHIE_MATH_${placeholders.length - 1}${NULL}`;
    })
    // Inline math: \(...\)
    .replace(MATH_INLINE, (match, tex) => {
      placeholders.push({ type: 'inline', tex: tex.trim() });
      return `${NULL}SMOOTHIE_MATH_${placeholders.length - 1}${NULL}`;
    });
}

function restoreMath(html) {
  return html.replace(new RegExp(`${NULL}SMOOTHIE_MATH_(\\d+)${NULL}`, 'g'), (match, index) => {
    const item = placeholders[Number(index)];
    if (!item) return match;
    const escapedTex = item.tex
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
    if (item.type === 'block') {
      return `<div class="math block" data-tex="${escapedTex}"></div>`;
    }
    return `<span class="math" data-tex="${escapedTex}"></span>`;
  });
}

const ALLOWED_TAGS = new Set([
  'p', 'br', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
  'strong', 'em', 'a', 'hr', 'div', 'span', 'table',
  'thead', 'tbody', 'tr', 'th', 'td',
]);
const ALLOWED_ATTRS = {
  a: ['href', 'title', 'target'],
  div: ['class'],
  span: ['class', 'data-tex'],
  code: ['class'],
  th: ['class'],
  td: ['class'],
  tr: ['class'],
  table: ['class'],
};

export function markdownToHtml(text) {
  if (!text) return '';
  const withoutMath = extractMath(String(text));
  let html = marked.parse(withoutMath);
  html = restoreMath(html);

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: Array.from(ALLOWED_TAGS),
    ALLOWED_ATTR: ALLOWED_ATTRS,
    USE_PROFILES: { html: true },
  });
}

export function renderMathInElement(element) {
  if (!element) return;
  const mathNodes = element.querySelectorAll('.math');
  mathNodes.forEach((node) => {
    const tex = node.getAttribute('data-tex') || '';
    if (!tex) return;
    try {
      const html = katex.renderToString(tex, {
        displayMode: node.classList.contains('block'),
        throwOnError: false,
      });
      node.innerHTML = html;
    } catch {
      node.textContent = `[Math: ${tex}]`;
    }
  });
}
