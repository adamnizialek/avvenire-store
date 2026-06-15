# Design: Alt text for product photos

**Date:** 2026-06-15
**Status:** Approved (design), pending implementation plan
**Author:** Adam (with Claude)

## Goal

Let the admin provide alt text for each product photo when adding a new
product. Alt text is an **optional override**: when blank, the storefront
falls back to today's behavior (product name, plus image index on the
detail gallery). The editing UI appears for **new products only**.

## Background — current state

- **Backend:** NestJS + TypeORM + Postgres (Neon). Product images are stored
  in a `simple-json` column as a plain array of URL strings
  (`product.entity.ts:38` → `images: string[]`). Image files are uploaded to
  Cloudinary via `POST /products/upload`, which returns `{ url }`. There is no
  alt-text field anywhere today.
- **Frontend:** React + Vite + TS. The admin create/edit form is a single
  shared component, `AdminProductForm.tsx`. The storefront fabricates alt text
  from the product name (`ProductCard.tsx:21`, `ProductDetail.tsx:131`).
- **Existing data:** live products already store `["url1","url2"]`, so any
  change to the image shape must not break them.

## Core change — image data shape

Each image becomes an object instead of a bare string:

```ts
export interface ProductImage {
  url: string;
  alt?: string;
}
// product.images: ProductImage[]
```

The DB column is schemaless JSON (`simple-json`), so **no DB migration is
required** — the column type is unchanged; only the JSON shape inside it
changes. This fits the project's current `synchronize`-based, no-formal-
migrations setup.

## Backward compatibility — normalize at the boundary

Rather than run a data migration over live rows, the backend normalizes
through one shared helper (new file `products/product-image.ts`):

```ts
normalizeImages(raw: unknown): ProductImage[]
// "url"            -> { url: "url", alt: "" }
// { url, alt }     -> { url, alt: alt ?? "" }
// null/undefined   -> []
// drops entries with no usable url
```

Applied at three points:

1. **On read** (`products.service.ts` find/findAll): every returned product's
   `images` is normalized, so the API *always* emits `{ url, alt }` objects.
   The frontend never has to know legacy string data existed.
2. **On write** (`products.service.ts` create/update): incoming images are
   normalized before saving (a stray string is tolerated → `{ url, alt: "" }`).
3. **At the Stripe boundary** (`stripe.service.ts:50-51`): images are mapped
   back to plain URLs — `images.map(i => i.url)` — because Stripe's
   `product_data.images` requires `string[]`. This is the one consumer that
   would silently break if missed, since `item.product` comes straight from the
   order relation (raw DB value, possibly legacy strings → normalize there too).

No existing rows are mutated; they're upgraded transparently on read. Seed
data (`seed.mjs`) is updated to the new object shape for consistency and to
demonstrate alt text, but this is not required for correctness (normalize-on-
read already handles string seeds).

## Admin form (`AdminProductForm.tsx`) — create mode only

- State changes from `string[]` to `ProductImage[]`.
- Upload handler pushes `{ url: res.data.url, alt: "" }`.
- Manual-URL handler pushes `{ url, alt: "" }`.
- **Create mode (`!product`):** each image preview gets a small
  "Alt text (optional)" input beneath it, writing to that image's `alt`.
- **Edit mode (`product` present):** no alt input is rendered, but existing
  `alt` values are held in state and **round-tripped unchanged** on save — so
  editing a product's name/price/etc. never wipes its alt text. A newly
  uploaded image in edit mode simply carries `alt: ""` (falls back to product
  name on the storefront), which is acceptable given alt editing is a
  create-time feature.
- Submit sends `images` as `ProductImage[]` for both create and update.

## Storefront rendering — alt as optional override

Everywhere an image renders, the alt attribute becomes
`image.alt || <existing fallback>` and the src uses `image.url`:

- `ProductCard.tsx` — `alt={img.alt || product.name}`; `src` uses `.url`;
  `hasSecondImage` still uses `.length`; second image alt likewise.
- `ProductDetail.tsx` — gallery `alt={img.alt || \`${product.name} ${i + 1}\`}`,
  `src={resolveImageUrl(img.url)}`; cart snapshot
  `imageUrl: images[0]?.url ?? null`.
- `AdminProducts.tsx` — thumbnail `src` uses `.url`; alt stays product name.

A blank alt therefore behaves exactly like today; a filled-in alt overrides it.

## DTO validation

`create-product.dto.ts` and `update-product.dto.ts` gain a nested, validated
image type:

```ts
class ProductImageDto {
  @IsString() @IsNotEmpty() @MaxLength(2048) url: string;
  @IsOptional() @IsString() @MaxLength(250) alt?: string;
}
// images?: @IsOptional @IsArray @ValidateNested({ each: true })
//          @Type(() => ProductImageDto) ProductImageDto[]
```

A `@Transform` coerces any legacy string element to `{ url: <string> }` before
validation, so older API clients still work. `alt` is capped at 250 chars
(comfortably above the ~125-char alt-text best practice) to prevent abuse.

## Files touched (end-to-end)

| Layer | File | Change |
|---|---|---|
| Backend type/helper | `products/product-image.ts` (new) | `ProductImage` type + `normalizeImages()` |
| Entity | `products/entities/product.entity.ts:38` | `images: ProductImage[]` |
| DTOs | `products/dto/create-product.dto.ts`, `update-product.dto.ts` | nested validated `{ url, alt? }` + string-coerce transform |
| Service | `products/products.service.ts` | normalize on create + read |
| Stripe | `stripe/stripe.service.ts:50` | map images → URLs (normalize-safe) |
| Seed | `backend/seed.mjs` | `string[]` → `{ url, alt }` |
| FE type | `frontend/src/types/index.ts:20` | `ProductImage` + `images: ProductImage[]` |
| FE form | `frontend/src/pages/admin/AdminProductForm.tsx` | object state, alt inputs (create only), round-trip on edit |
| FE render | `ProductCard.tsx`, `ProductDetail.tsx`, `AdminProducts.tsx` | `.url` + `alt || fallback` |

## Testing

- **Backend unit:** `normalizeImages()` — string→object, object passthrough,
  mixed array, null/empty, url-less entry dropped, alt defaulting.
- **Backend validation:** create-product DTO accepts `{ url, alt }` objects and
  coerced strings; rejects missing url and over-length alt.
- **Stripe mapping:** line-item images are plain URL strings for both legacy
  (string) and new (object) product image data.
- **Frontend:** create a product with alt text on one photo and blank on
  another; confirm the rendered `alt` attribute is the typed text where set and
  the product-name fallback where blank; confirm editing an existing product
  preserves its alt text.

## Non-goals (YAGNI)

- No alt-text editing UI in edit mode (explicitly chosen: new products only).
- No "decorative image" (`alt=""`) semantics — blank means fall back.
- No standalone DB data migration / backfill (normalize-on-read covers it). An
  idempotent backfill could be added later if mixed shapes become undesirable.
- No per-image reordering, captions, or other gallery features.
