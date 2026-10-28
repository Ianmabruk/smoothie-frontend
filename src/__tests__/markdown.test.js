import { describe, expect, it } from 'vitest';
import { markdownToHtml } from '../markdown';

describe('markdownToHtml', () => {
  it('renders headings, lists and code blocks', () => {
    const html = markdownToHtml('# Heading\n\n- item one\n- item two\n\n```js\nconsole.log("hi");\n```\n');
    expect(html).toContain('<h1');
    expect(html).toContain('<li>item one</li>');
    expect(html).toContain('<code');
  });

  it('converts inline math to a sanitized math span', () => {
    const html = markdownToHtml('The area is \\( \\pi r^2 \\).');
    expect(html).toContain('data-tex');
    expect(html).toContain('class="math"');
    expect(html).not.toContain('<script');
  });

  it('converts display math to a block math div', () => {
    const html = markdownToHtml('$$ E = mc^2 $$');
    expect(html).toContain('class="math block"');
    expect(html).toContain('data-tex="E = mc^2"');
  });

  it('sanitizes script injection attempts', () => {
    const html = markdownToHtml('Hello <script>alert("xss")</script>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('alert');
  });

  it('sanitizes onclick handlers', () => {
    const html = markdownToHtml('<a href="#" onclick="alert(1)">link</a>');
    expect(html).not.toContain('onclick');
  });
});
