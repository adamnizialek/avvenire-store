import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Markdown } from './markdown';

// End-to-end render check: exercises the full pipeline (autoStructureDescription
// → ReactMarkdown + remark-breaks + the custom component map) and asserts the
// real HTML a shopper sees. The unit tests cover the Markdown string; this
// covers that the string actually renders as headings / lists / bold.

const SNEAKERS_PLAIN = [
  'Marzysz o dodatkowych centymetrach wzrostu? To buty, które modelują sylwetkę.',
  'Dlaczego to inwestycja w Twój styl?',
  'Dyskretne uniesienie: Ukryty koturn optycznie wydłuża nogi.',
  'System błyskawicznego zapinania: Trzy szerokie rzepy.',
  '',
  'Specyfikacja materiałowa:',
  'Materiał zewnętrzny: Zamsz ekologiczny.',
  'Podeszwa: Antypoślizgowa guma.',
].join('\n');

const KARDIGAN_MD = `Zwykły wstęp do swetra.

## Dlaczego pokochasz ten model?

- **Unikalny detal** — siedem klamer typu lobster.`;

describe('Markdown renders auto-structured plain prose as real HTML', () => {
  const html = renderToStaticMarkup(<Markdown>{SNEAKERS_PLAIN}</Markdown>);

  it('renders question/section lines as <h2> headings', () => {
    expect(html).toContain('<h2');
    expect(html).toContain('Dlaczego to inwestycja w Twój styl?');
    expect(html).toContain('Specyfikacja materiałowa');
  });

  it('renders "Label: value" lines as a bulleted list with bold labels', () => {
    expect(html).toContain('<ul');
    expect(html).toContain('<li');
    expect(html).toContain('<strong');
    expect(html).toContain('Dyskretne uniesienie');
  });

  it('keeps the intro line as a paragraph', () => {
    expect(html).toContain('<p');
    expect(html).toContain('Marzysz o dodatkowych centymetrach wzrostu');
  });
});

describe('Markdown leaves already-Markdown descriptions intact', () => {
  it('still renders headings, bold and bullets for hand-authored Markdown', () => {
    const html = renderToStaticMarkup(<Markdown>{KARDIGAN_MD}</Markdown>);
    expect(html).toContain('<h2');
    expect(html).toContain('<ul');
    expect(html).toContain('<strong');
    expect(html).toContain('Unikalny detal');
  });
});
