import ReactMarkdown, { type Components } from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import { cn } from '@/lib/utils';
import { autoStructureDescription } from '@/lib/structure-description';

// Section headings share one look. Authors writing `#` get downgraded to <h2>
// so a description never introduces a second <h1> alongside the product name.
// Sentence case (not uppercase) keeps multi-word / question headings readable
// and preserves any intentional casing the author typed.
const headingClass =
  'mt-5 mb-2 text-base font-semibold text-foreground first:mt-0';

const components: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  h1: ({ children }) => <h2 className={headingClass}>{children}</h2>,
  h2: ({ children }) => <h2 className={headingClass}>{children}</h2>,
  h3: ({ children }) => <h3 className={headingClass}>{children}</h3>,
  ul: ({ children }) => (
    <ul className="mb-3 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="mb-3 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>
  ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  // Bold labels (e.g. "Skład:") need to read against the muted body text.
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-foreground underline underline-offset-2 hover:no-underline"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-5 border-border" />,
};

interface MarkdownProps {
  children: string;
  className?: string;
}

/**
 * Renders trusted Markdown content with the store's typography. Raw HTML is not
 * rendered (no rehype-raw), so descriptions cannot inject markup — XSS-safe.
 *
 * Plain-prose descriptions (no Markdown syntax) are first run through
 * autoStructureDescription, which promotes question/section lines to headings
 * and "Label: value" lines to bold-label bullets. Descriptions that already
 * contain Markdown are passed through untouched.
 *
 * remark-breaks then turns a single newline into a hard line break (<br>).
 * Without it, CommonMark treats a lone newline as a soft break that the browser
 * collapses to a space, so descriptions typed in the admin textarea (one Enter
 * between lines) render as one run-on block. Blank-line paragraphs, headings,
 * and lists are unaffected — the plugin only rewrites intra-block soft breaks.
 */
export function Markdown({ children, className }: MarkdownProps) {
  const content = autoStructureDescription(children);
  return (
    <div className={cn('text-sm leading-relaxed text-muted-foreground', className)}>
      <ReactMarkdown components={components} remarkPlugins={[remarkBreaks]}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
