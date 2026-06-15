// Auto-structures plain-prose product descriptions into Markdown so they render
// with headings, bold labels, and bullet lists — without requiring admins to
// type Markdown syntax. Descriptions entered as flat text (one line per section,
// "Label: value" feature lines) otherwise render as an undifferentiated wall
// even after remark-breaks adds line breaks, because the source carries no
// structure for the renderer to express.
//
// This is a deliberately CONSERVATIVE heuristic. It only promotes lines whose
// shape is unambiguous, and it refuses to touch anything that already contains
// Markdown — so hand-authored descriptions and this function's own output are
// passed through verbatim (making it idempotent and safe to run on every
// render).

// Any of: an ATX heading (`#`..`######`), a bold span (`**`), or a list marker
// at line start (`-`/`*`/`+`). Presence of any means the author (or a previous
// pass) already wrote Markdown, so we leave the text exactly as-is.
const ALREADY_MARKDOWN = /(?:^|\n)\s*#{1,6}\s|\*\*|(?:^|\n)\s*[-*+]\s/;

// "Label: value" — a short label with no sentence punctuation, a colon, then a
// non-empty value. The 45-char cap and the excluded `.!?` keep whole sentences
// that merely contain a colon from being mistaken for a label.
const LABEL = /^([^:.!?]{1,45}):\s+(\S.*)$/;

const MAX_QUESTION_HEADING = 70; // a standalone short question is a section title
const MAX_COLON_HEADING_LEN = 40; // a short "Section:" label is a section title
const MAX_COLON_HEADING_WORDS = 5;

function wordCount(line: string): number {
  return line.split(/\s+/).filter(Boolean).length;
}

type Block =
  | { kind: 'heading'; text: string }
  | { kind: 'para'; lines: string[] }
  | { kind: 'list'; items: string[] };

/**
 * Rewrites plain-prose descriptions into structured Markdown. Already-Markdown
 * input (and this function's own output) is returned unchanged.
 */
export function autoStructureDescription(raw: string): string {
  if (!raw || !raw.trim()) return raw;
  if (ALREADY_MARKDOWN.test(raw)) return raw;

  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) {
      blocks.push({ kind: 'para', lines: para });
      para = [];
    }
  };
  const flushList = () => {
    if (list.length) {
      blocks.push({ kind: 'list', items: list });
      list = [];
    }
  };

  for (const rawLine of raw.split('\n')) {
    const line = rawLine.trim();

    // A blank line is a hard block boundary (paragraph break in the source).
    if (!line) {
      flushPara();
      flushList();
      continue;
    }

    // Heading: a short standalone question ("Dlaczego to Twój styl?").
    if (line.endsWith('?') && line.length <= MAX_QUESTION_HEADING) {
      flushPara();
      flushList();
      blocks.push({ kind: 'heading', text: line });
      continue;
    }

    // Heading: a short section label ending in a colon ("Specyfikacja
    // materiałowa:"). The colon is dropped from the rendered heading.
    if (
      line.endsWith(':') &&
      line.length <= MAX_COLON_HEADING_LEN &&
      wordCount(line) <= MAX_COLON_HEADING_WORDS
    ) {
      flushPara();
      flushList();
      blocks.push({ kind: 'heading', text: line.slice(0, -1).trimEnd() });
      continue;
    }

    // Bullet: a "Label: value" feature line → bold label + value. Consecutive
    // matches accrete into one list.
    const label = line.match(LABEL);
    if (label) {
      flushPara();
      list.push(`- **${label[1].trimEnd()}:** ${label[2].trim()}`);
      continue;
    }

    // Otherwise: ordinary prose. Consecutive prose lines stay in one block so
    // remark-breaks renders intra-paragraph newlines as <br>, as before.
    flushList();
    para.push(line);
  }
  flushPara();
  flushList();

  return blocks
    .map((b) => {
      if (b.kind === 'heading') return `## ${b.text}`;
      if (b.kind === 'list') return b.items.join('\n');
      return b.lines.join('\n');
    })
    .join('\n\n');
}
