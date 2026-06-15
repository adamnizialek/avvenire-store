# Per-photo alt text in product *edit* mode — design

**Date:** 2026-06-15
**Status:** Approved
**Branch:** `worktree-feat+alt-text-edit-mode` (off `origin/main`)

## Problem

Per-photo alt text can be entered when **creating** a product, but not when
**editing** an existing one. In edit mode the admin form renders only a compact
thumbnail grid (thumbnail + reorder buttons) with no alt-text input, so an admin
cannot view or correct the alt text of an already-saved product.

The data and persistence already work end-to-end — the gap is purely the edit-mode UI.

## What already works (no change needed)

- **State load:** `useState<ProductImage[]>(product?.images || [])` — edit mode
  already loads existing images *with their alt text* into form state.
- **Submit:** `handleSubmit` already sends the full `images` array (each `{ url, alt }`)
  on `PATCH /products/:id`.
- **Backend:** `UpdateProductDto` validates `alt` (optional, `@MaxLength(250)`,
  via `@Transform(toProductImageDtos)`), and `ProductsService.update()` persists it
  through `normalizeImages()`. No backend change required.

Because existing alt text is already loaded and re-sent, today's edit mode actually
*preserves* alt text — it is merely invisible and uneditable. This change only
surfaces the existing create-mode input in edit mode.

## Decision

**Unify the per-image row layout so edit mode renders exactly like create mode:**
thumbnail (+ remove button + Primary badge) → vertical move strip → alt-text input.

This removes the `product ? grid : rows` special-casing entirely (single code path,
fully consistent between create and edit).

### Base-branch note

The worktree is branched from `origin/main`, which during this session advanced to
`c4974b1` — it now includes the merged **photo-reordering** (move buttons) and
**markdown-descriptions** work. So the unified row includes the reorder move buttons
*and* the alt input. (Earlier scoping assumed `main` lacked reordering; that is no
longer the case, and the unified-rows outcome is unaffected — it is simply the
"rows with move buttons + alt input" layout.)

## Implementation (single file: `frontend/src/pages/admin/AdminProductForm.tsx`)

1. **Wrapper:** change `className={product ? 'flex flex-wrap gap-3' : 'space-y-2'}`
   → `className="space-y-2"` (rows in both modes).
2. **Move-button icons:** drop the `product ?` conditional in `moveEarlier`/`moveLater`;
   always use `ChevronUp` / `ChevronDown` (the vertical strip orientation).
3. **Delete the `if (product) { return <grid cell> }` branch** so every image renders
   the single row layout (thumb + move strip + labeled alt `Input`,
   placeholder "Describe this photo for screen readers", `maxLength={250}`).
4. **Imports:** remove now-unused `ChevronLeft`, `ChevronRight` from the `lucide-react`
   import.
5. **Comment:** replace the stale "edit mode is a compact grid…" comment with one
   describing the unified row layout.

## Testing & verification

The frontend has **no test harness** (no vitest/jest/testing-library; scripts are only
`dev`/`build`/`lint`/`preview`), and no `*.test.tsx` exist repo-wide. Standing up a
component-test stack for a declarative JSX change is out of scope. Verification:

- `npx tsc -b` — typecheck (also flags the unused imports if not removed).
- `npm run lint` — eslint.
- `npm run build` — full compile.
- Manual: open the admin product form in **edit** mode for a product with images and
  confirm each image shows its alt input pre-filled; edit one and save; reload and
  confirm it persisted; create-mode behaviour unchanged.

## Out of scope

- Reorder/move buttons (already merged) and any change to their behaviour.
- Backend changes (alt already validated + persisted on update).
- Unifying the `alt?: string` (frontend type) vs `alt: string` (backend) mismatch.
- Introducing a frontend test framework.
