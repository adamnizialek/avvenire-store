import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Markdown } from './markdown';

/**
 * Product descriptions are admin-entered but must stay XSS-safe even if an
 * admin account (or the DB) is compromised: an injected script must never
 * execute in shoppers' browsers. The Markdown component renders without
 * rehype-raw, so HTML in a description is escaped text — these tests pin
 * that down.
 */
describe('Markdown XSS hardening', () => {
  it('renders a <script> tag as inert text, not markup', () => {
    const html = renderToStaticMarkup(
      <Markdown>{'Hello <script>window.leak = document.cookie</script>'}</Markdown>,
    );
    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;');
  });

  it('never renders an <img> element (or live onerror handler) from HTML', () => {
    const html = renderToStaticMarkup(
      <Markdown>{'<img src=x onerror="window.leak=localStorage.auth_user">'}</Markdown>,
    );
    // The payload may survive as escaped text (inert), but must never become
    // an actual element with a live event handler.
    expect(html).not.toContain('<img');
  });

  it('strips javascript: URLs from markdown links', () => {
    const html = renderToStaticMarkup(
      <Markdown>{'[click me](javascript:alert(1))'}</Markdown>,
    );
    expect(html).not.toContain('javascript:');
  });

  it('renders an iframe/embed payload as inert text', () => {
    const html = renderToStaticMarkup(
      <Markdown>{'<iframe src="https://evil.example"></iframe>'}</Markdown>,
    );
    expect(html).not.toContain('<iframe');
  });
});
