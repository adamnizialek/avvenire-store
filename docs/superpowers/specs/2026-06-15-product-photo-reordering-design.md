# Design: Reorder product photos in the admin form

**Date:** 2026-06-15
**Status:** Approved (design), pending implementation plan
**Author:** Adam (with Claude)

## Goal

Let the admin change the **order** of a product's photos in the admin form,
in both create (Add Product) and edit (Edit Product) modes. The first photo in
the array is the product's **primary** image, so reordering is how the admin
chooses which photo leads.

Reordering uses **move buttons** (move earlier / move later) on each
thumbnail — not drag-and-drop. This was chosen for zero new dependencies, full
keyboard + screen-reader accessibility, and reliable touch behavior, matching
the codebase's lean-deps and a11y-conscious style.

## Background — current state

- **Storage:** Product images are stored in a `simple-json` column as an
  **ordered array** of `{ url, alt }` objects (`product.entity.ts:39` →
  `images: ProductImage[]`; type in `products/product-image.ts`). Array order
  is the display order.
- **Order is already meaningful downstream** — every consumer honors array
  position, so changing the array order is sufficient:
  - `ProductCard.tsx:20` — `images[0]` is the main tile, `images[1]` the hover
    image.
  - `ProductDetail.tsx:101` — `images[0]?.url` is the cart-snapshot thumbnail;
    `images.map(...)` (`:127`) renders the collage in array order.
  - Stripe boundary — `imageUrls()` (`product-image.ts:31`) maps in order, so
    the first image is Stripe's primary `product_data.images[0]`.
- **Admin form:** `AdminProductForm.tsx` holds `images: ProductImage[]` in
  React state and sends the whole array on submit
  (`POST /products` or `PATCH /products/:id`). Create mode (`!product`) renders
  vertical rows with an alt-text input per image; edit mode (`product` present)
  renders a compact wrapping thumbnail grid (`flex flex-wrap gap-2`) with just
  the thumbnail and a remove (`X`) button.
- **No reorder affordance exists today** — images sit in upload/paste order.

## Core change — frontend only

This is a **pure frontend change**. The data shape, entity, DTOs, service,
Stripe mapping, and DB are all unchanged. Reordering mutates the order of the
existing `images` array in form state; the existing submit persists it. This
also sidesteps the project's "no formal migrations in prod" hazard entirely
(no schema touch).

### State logic (`AdminProductForm.tsx`)

Add one helper alongside the existing `removeImage` / `updateAlt`:

```ts
// dir: -1 = move toward the front (earlier / toward primary), +1 = toward back
const moveImage = (index: number, dir: -1 | 1) => {
  setImages((prev) => {
    const target = index + dir;
    if (target < 0 || target >= prev.length) return prev; // no wraparound
    const next = [...prev];
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
};
```

Pure array reorder by adjacent swap. No effect on `alt`, `url`, upload, or any
other state.

### UI — both create and edit modes

Each thumbnail gains two move controls plus an end-state indicator:

- **Move earlier** and **move later** buttons, rendered as `lucide-react`
  chevrons next to the existing remove (`X`) button.
  - *Create mode* (vertical rows): `ChevronUp` / `ChevronDown`.
  - *Edit mode* (compact grid): `ChevronLeft` / `ChevronRight`, as a small
    control strip on the thumbnail, consistent with the grid's left-to-right
    flow.
- Both are real `<button type="button">` with descriptive aria-labels
  (`Move image {i + 1} earlier` / `... later`), matching the existing
  aria-labelled remove button. Keyboard- and screen-reader-accessible by
  default.
- **Disabled at the ends:** the first image's "earlier" button and the last
  image's "later" button are `disabled` (no wraparound), so the affordance
  communicates the boundaries.
- **Primary badge:** the first image (`i === 0`) shows a small "Primary" badge,
  making the special role of position 0 obvious (it drives the card, hover,
  cart thumbnail, and Stripe).

### Save path — unchanged

`handleSubmit` already sends the full `images` array for both create and
update. The reordered array flows through untouched; no submit changes needed.

## Files touched

| Layer | File | Change |
|---|---|---|
| FE form | `frontend/src/pages/admin/AdminProductForm.tsx` | `moveImage` helper; move-earlier/later buttons + "Primary" badge in both create rows and edit grid; end buttons disabled |

No other files change. Backend, DTOs, entity, Stripe, types, seed, and the
storefront render paths are all untouched (they already honor array order).

## Testing / verification

The frontend has **no test harness** (no vitest / testing-library in
`frontend/package.json`), so there is no existing unit-test layer to extend
without introducing test infrastructure — out of scope for this change.
Verification is manual against the running app:

1. **Edit mode:** open a product with several photos, move a non-first photo to
   the front, save, reload the edit form → order persisted; the moved photo is
   now first and shows the "Primary" badge.
2. **Storefront reflects new primary:** the product card's main tile and hover
   image, and the product-detail collage / cart thumbnail, reflect the new
   order.
3. **Create mode:** add several photos, reorder before first save, create →
   the new product persists in the chosen order.
4. **Boundaries:** the first photo's "earlier" and the last photo's "later"
   buttons are disabled; reordering never drops or duplicates a photo and never
   alters any photo's alt text.

## Non-goals (YAGNI)

- **No drag-and-drop** and **no new dependency** (explicitly chosen: move
  buttons).
- No multi-select or bulk move; one adjacent swap per click.
- No backend, DTO, entity, Stripe, or schema change — order already round-trips
  through the existing array.
- No "set as primary" shortcut beyond moving a photo to the front (moving to
  front *is* setting primary).
- No new automated test infrastructure for the frontend.
