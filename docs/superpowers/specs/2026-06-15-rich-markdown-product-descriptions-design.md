# Rich Markdown product descriptions — design

**Date:** 2026-06-15
**Status:** Approved

## Problem

Product descriptions render as a single flat `<p>` on the product detail page
(`frontend/src/pages/ProductDetail.tsx:151`), and the admin authors them through
a single-line `<Input>` (`frontend/src/pages/admin/AdminProductForm.tsx:190-198`),
which strips newlines. AI-generated descriptions (e.g. *Kardigan z Industrialnymi
Zapięciami*) carry rich implicit structure — an intro, a *"Dlaczego pokochasz ten
model?"* section of labelled benefits, and a *Skład / Kolor / Wykończenie / Okucia*
spec list — that collapses into an unreadable wall of text.

## Approach

Render descriptions as **Markdown** and let admins author Markdown. Chosen over a
lightweight newline renderer (less flexible) and structured DB columns (large,
risky change — prod runs `synchronize: false` with no migrations, so new columns
500 prod until manually ALTERed).

## Changes

### 1. `Markdown` component — `frontend/src/components/ui/markdown.tsx` (new)

Wraps `react-markdown` + `remark-gfm`. **No `rehype-raw`**, so raw HTML embedded in
a description is ignored — XSS-safe by construction. A tuned `components` map styles
output to the store's minimalist look (no `@tailwindcss/typography` dependency):

- root/body: `text-sm text-muted-foreground leading-relaxed`
- `h2`/`h3`: `text-sm font-semibold uppercase tracking-wide text-foreground`, top margin
- `p`: `mb-3 last:mb-0`
- `ul`: `list-disc pl-5 space-y-1.5 mb-3`; `ol`: `list-decimal …`
- `strong`: `font-semibold text-foreground` (bold labels pop against muted body)
- `a`: underlined, `target="_blank"`, `rel="noopener noreferrer"`

### 2. Storefront — `ProductDetail.tsx`

Replace `<p className="text-sm text-muted-foreground">{product.description}</p>`
with `<Markdown>{product.description}</Markdown>`. Plain single-paragraph
descriptions (the seeded English ones) still render as one paragraph.

### 3. Admin authoring — `AdminProductForm.tsx`

Add a shadcn-style `Textarea` (`frontend/src/components/ui/textarea.tsx`, new) and
swap the description `<Input>` for it (multi-line, ~8 rows). Add a hint:
"Supports Markdown — headings, **bold**, and `- bullet lists`."

### 4. Data fix — `backend/scripts/update-descriptions.mjs` (new)

One-off Neon script (serverless WebSocket driver over 443, **`synchronize: false`**
so it never touches the prod schema). Looks up the product by exact name and updates
its `description` to a reformatted Markdown string. Run:
`DATABASE_URL='postgresql://…' node scripts/update-descriptions.mjs`.

## Dependencies

Add `react-markdown` and `remark-gfm` to `frontend`.

## Out of scope

No schema/DTO changes (`description` stays free `text`, already uncapped). No
structured columns. Seeded short descriptions left unchanged. No frontend test
harness bootstrapped (none exists; change is presentational + a one-off script —
verified via build, lint, adversarial diff review, and visual check).
