# Product Photo Reordering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin reorder a product's photos (move earlier / move later) in both the Add Product and Edit Product forms, with the first photo marked as the primary image.

**Architecture:** Frontend-only. Product images already persist as an ordered `simple-json` array of `{ url, alt }`, and every consumer (product card, product detail, cart snapshot, Stripe) already honors array position. So reordering is a pure React-state change in `AdminProductForm.tsx`: a `moveImage(index, dir)` helper swaps a photo with its neighbour, and the existing submit (`POST`/`PATCH`) persists the new order untouched. Reorder controls are move buttons (not drag-and-drop) — zero new dependencies, keyboard + screen-reader accessible, disabled at the ends.

**Tech Stack:** React 19 + Vite + TS, `lucide-react` icons, Tailwind v4. Typecheck via `npm run build` (`tsc -b`); lint via `npm run lint`. No frontend test runner exists (no vitest/testing-library in `frontend/package.json`), so the type-check + lint + manual smoke test are the verification gates — consistent with the frontend portion of the alt-text feature.

**Spec:** `docs/superpowers/specs/2026-06-15-product-photo-reordering-design.md`

**Working branch:** `feat/product-photo-reordering` (already checked out).

> **No backend / schema / Stripe / DTO change.** Order already round-trips through the existing `images` array, so there is no DDL, no `synchronize` hazard, and nothing to touch outside `AdminProductForm.tsx`. The downstream consumers (`ProductCard.tsx` `images[0]`/`images[1]`, `ProductDetail.tsx` `images[0]` thumbnail + `images.map` collage, `imageUrls()` for Stripe) read array position as-is and need no edits.

> **No automated test task.** The frontend has no test harness; adding one (vitest/testing-library) for a single reorder helper is out of scope per the approved spec (YAGNI). The `moveImage` logic is verified by the manual smoke test in Task 2. `tsc -b` is the type-safety gate.

---

## Task 1: Reorder controls in `AdminProductForm.tsx`

Add a `moveImage` helper and render move-earlier / move-later buttons plus a "Primary" badge on each image preview, in both create and edit modes.

**Files:**
- Modify: `frontend/src/pages/admin/AdminProductForm.tsx:2` (icon imports)
- Modify: `frontend/src/pages/admin/AdminProductForm.tsx:101-103` (add `moveImage` after `removeImage`)
- Modify: `frontend/src/pages/admin/AdminProductForm.tsx:262-303` (replace the image-previews block)

- [ ] **Step 1: Add the chevron icon imports**

In `frontend/src/pages/admin/AdminProductForm.tsx`, replace the `lucide-react` import (line 2):

```ts
import { Upload, X, Plus, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
```

- [ ] **Step 2: Add the `moveImage` helper**

In the same file, add this helper immediately **after** the `removeImage` function (currently lines 101-103), before `updateAlt`:

```ts
  // Reorder photos by swapping a photo with its neighbour. The first photo is the
  // product's primary image (drives the product card, cart thumbnail, and Stripe),
  // so moving a photo to the front is how the admin sets the primary. dir is -1
  // (earlier / toward primary) or +1 (later). No wraparound at the ends.
  const moveImage = (index: number, dir: -1 | 1) => {
    setImages((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
```

- [ ] **Step 3: Replace the image-previews block with previews + reorder controls**

Replace the comment + `{images.length > 0 && ( ... )}` block (currently lines 262-303) with:

```tsx
        {/* Image previews + reorder controls. The first image is the product's
            primary (drives the card, cart thumbnail, and Stripe). Create mode
            shows an alt-text input per image (rows) with a vertical up/down move
            strip; edit mode is a compact grid with a horizontal left/right move
            bar under each thumbnail. */}
        {images.length > 0 && (
          <div className={product ? 'flex flex-wrap gap-3' : 'space-y-2'}>
            {images.map((img, i) => {
              const thumb = (
                <div className="group/img relative shrink-0">
                  <img
                    src={resolveUrl(img.url)}
                    alt={img.alt || `Image ${i + 1}`}
                    className="h-24 w-24 rounded-md object-cover"
                  />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
                      Primary
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    aria-label={`Remove image ${i + 1}`}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );

              const moveEarlier = (
                <button
                  type="button"
                  onClick={() => moveImage(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move image ${i + 1} earlier`}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-input bg-background text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {product ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronUp className="h-4 w-4" />
                  )}
                </button>
              );

              const moveLater = (
                <button
                  type="button"
                  onClick={() => moveImage(i, 1)}
                  disabled={i === images.length - 1}
                  aria-label={`Move image ${i + 1} later`}
                  className="flex h-6 w-6 items-center justify-center rounded-md border border-input bg-background text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {product ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              );

              // Edit mode: compact grid cell — thumbnail with a horizontal move
              // bar beneath it.
              if (product) {
                return (
                  <div key={i} className="space-y-1">
                    {thumb}
                    <div className="flex justify-center gap-1">
                      {moveEarlier}
                      {moveLater}
                    </div>
                  </div>
                );
              }

              // Create mode: row — thumbnail, a vertical move strip, then the
              // alt-text input.
              return (
                <div key={i} className="flex items-start gap-3">
                  {thumb}
                  <div className="flex flex-col gap-1">
                    {moveEarlier}
                    {moveLater}
                  </div>
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`alt-${i}`}
                      className="text-xs text-muted-foreground"
                    >
                      Alt text (optional)
                    </Label>
                    <Input
                      id={`alt-${i}`}
                      value={img.alt ?? ''}
                      onChange={(e) => updateAlt(i, e.target.value)}
                      placeholder="Describe this photo for screen readers"
                      maxLength={250}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
```

(The submit handler already sends `images` in its payload — `handleSubmit`, line 146 — so no change is needed there; it now sends the reordered `ProductImage[]`.)

- [ ] **Step 4: Typecheck / build the frontend**

Run (from `frontend/`): `npm run build`
Expected: `tsc -b` reports no errors and the Vite build completes. (If `moveImage`'s `dir` union or any JSX is mistyped, tsc fails here naming the file/line — fix it.)

- [ ] **Step 5: Lint the frontend**

Run (from `frontend/`): `npm run lint`
Expected: no new lint errors in `AdminProductForm.tsx` (all four new chevron imports are used; no unused vars).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/admin/AdminProductForm.tsx
git commit -m "feat(products): reorder photos in admin form with move buttons"
```

---

## Task 2: Manual smoke test

Confirm reordering works end-to-end in both modes and persists. No files change.

**Files:** none (verification only).

- [ ] **Step 1: Start the dev servers**

Start the backend (`cd backend && npm run start:dev`) and frontend (`cd frontend && npm run dev`). Log in as an admin and open **Manage Products**.

- [ ] **Step 2: Reorder in edit mode and verify persistence**

Edit an existing product that has 3+ photos. Confirm:
- the first thumbnail shows the **"Primary"** badge;
- each thumbnail has a left/right move bar beneath it;
- the first thumbnail's **left** (earlier) button and the last thumbnail's **right** (later) button are **disabled**.

Click the second photo's **left** button so it becomes first. The "Primary" badge moves to it. Click **Update Product**, then re-open the same product → the new order persisted (the moved photo is still first).

- [ ] **Step 3: Verify the storefront reflects the new primary**

On a product listing page, the `ProductCard` main tile is the newly-promoted photo (and the hover image is the new second photo). On the product detail page, the collage and the cart thumbnail lead with the new primary.

- [ ] **Step 4: Reorder in create mode**

Click **Add Product**. Upload or paste 3 photos. Confirm each row shows the up/down move strip between the thumbnail and the alt-text input, the first row shows the "Primary" badge, and the end buttons are disabled appropriately. Reorder a photo with the up/down buttons, fill the rest of the form, and **Create Product**. Open the new product in edit mode → it persisted in the chosen order.

- [ ] **Step 5: Integrity checks**

Confirm reordering never drops or duplicates a photo, and never changes any photo's alt text (in create mode, type alt text on a photo, then move it — the text moves with it).

- [ ] **Step 6: Final commit (only if verification required fixes)**

```bash
git add -A
git commit -m "fix(products): adjust photo reorder controls after smoke test"
```

(Skip if no changes were required.)

---

## Self-Review (completed during planning)

- **Spec coverage:**
  - Move buttons, both modes, no drag-and-drop / no new dep → Task 1 Step 1 (chevron imports), Step 3 (buttons in both the `product` grid branch and the create row branch).
  - `moveImage` adjacent swap, no wraparound → Task 1 Step 2.
  - Disabled at the ends → Task 1 Step 3 (`disabled={i === 0}` / `disabled={i === images.length - 1}`).
  - aria-labels (keyboard/SR accessible) → Task 1 Step 3 (`Move image N earlier`/`later`).
  - "Primary" badge on first image → Task 1 Step 3 (`i === 0` span).
  - Save path unchanged → noted after Task 1 Step 3.
  - Frontend-only, no backend/schema/Stripe change → plan header notes.
  - Manual verification (no test harness) → Task 2, all steps; persistence, storefront primary, create mode, integrity all covered.
- **Placeholder scan:** every code step contains the full code; every run step states the exact command and expected result. No TBD/TODO.
- **Type consistency:** `moveImage(index: number, dir: -1 | 1)` is defined once (Task 1 Step 2) and called as `moveImage(i, -1)` / `moveImage(i, 1)` (Task 1 Step 3) — the literal args match the `-1 | 1` union. `images`/`setImages`, `removeImage`, `updateAlt`, and `resolveUrl` are existing identifiers reused unchanged. All four imported icons (`ChevronUp`, `ChevronDown`, `ChevronLeft`, `ChevronRight`) are referenced in Step 3, so no unused-import lint error.
