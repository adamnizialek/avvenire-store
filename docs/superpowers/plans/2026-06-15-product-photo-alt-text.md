# Product Photo Alt Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the admin set optional alt text per product photo when creating a product; the storefront uses it as an override and falls back to the product name when blank.

**Architecture:** Each image changes from a bare URL string to a `{ url, alt }` object. Because the DB column is schemaless JSON (`simple-json`), no DB migration is needed. The backend normalizes images at every boundary (read, write, Stripe) via one shared helper, so legacy string data is transparently upgraded and the Stripe API still receives plain URL strings. The admin form shows alt inputs in create mode only; edit mode round-trips existing alt text untouched.

**Tech Stack:** NestJS + TypeORM + Postgres (backend), Jest (`rootDir: src`, specs co-located, `npm test`), class-validator 0.14.3 / class-transformer 0.5.1; React 19 + Vite + TS (frontend, typecheck via `npm run build` → `tsc -b`).

**Spec:** `docs/superpowers/specs/2026-06-15-product-photo-alt-text-design.md`

**Working branch:** `feat/product-photo-alt-text` (already checked out).

> **Prod safety (important):** Prod runs with TypeORM `synchronize` OFF, and adding
> a new entity `@Column` silently 500s prod until the table is manually `ALTER`ed
> (this caused a login outage on 2026-06-15). This plan **adds no column** — it
> reuses the existing `images` `simple-json` column (already present in prod) and
> only changes the JSON shape stored inside it. No DDL / `ALTER` is required, so
> the migration gotcha does not apply.

> **Note on seed data:** The spec mentioned optionally updating `backend/seed.mjs` to the object shape. It is intentionally **not** a task here: `normalizeImages()` upgrades legacy string seeds on read, so changing the seed adds verbose churn with no behavioral value. Left as-is.

---

## Task 1: Backend image normalizer + helpers

The single source of truth for the image shape and for converting any stored/legacy
value into normalized `{ url, alt }` objects (and into plain URL strings for Stripe).

**Files:**
- Create: `backend/src/modules/products/product-image.ts`
- Test: `backend/src/modules/products/product-image.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `backend/src/modules/products/product-image.spec.ts`:

```ts
import { normalizeImages, imageUrls } from './product-image';

describe('normalizeImages', () => {
  it('returns [] for non-array input', () => {
    expect(normalizeImages(undefined)).toEqual([]);
    expect(normalizeImages(null)).toEqual([]);
    expect(normalizeImages('nope')).toEqual([]);
  });

  it('converts legacy string urls to { url, alt: "" }', () => {
    expect(normalizeImages(['http://x/a.jpg'])).toEqual([
      { url: 'http://x/a.jpg', alt: '' },
    ]);
  });

  it('passes objects through and defaults a missing alt to ""', () => {
    expect(
      normalizeImages([
        { url: 'http://x/a.jpg', alt: 'A red tee' },
        { url: 'http://x/b.jpg' },
      ]),
    ).toEqual([
      { url: 'http://x/a.jpg', alt: 'A red tee' },
      { url: 'http://x/b.jpg', alt: '' },
    ]);
  });

  it('drops entries without a usable url and trims whitespace', () => {
    expect(
      normalizeImages(['   ', { alt: 'no url' }, { url: '  http://x/c.jpg  ' }]),
    ).toEqual([{ url: 'http://x/c.jpg', alt: '' }]);
  });

  it('imageUrls returns only the url strings', () => {
    expect(
      imageUrls(['http://x/a.jpg', { url: 'http://x/b.jpg', alt: 'B' }]),
    ).toEqual(['http://x/a.jpg', 'http://x/b.jpg']);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (from `backend/`): `npm test -- product-image.spec`
Expected: FAIL — `Cannot find module './product-image'`.

- [ ] **Step 3: Write the implementation**

Create `backend/src/modules/products/product-image.ts`:

```ts
export interface ProductImage {
  url: string;
  alt: string;
}

type RawImage = string | { url?: unknown; alt?: unknown } | null | undefined;

/**
 * Normalize a stored/incoming images value into { url, alt } objects.
 * Tolerates the legacy `string[]` shape and any partial objects, trims urls,
 * defaults a missing alt to '', and drops entries that have no usable url.
 */
export function normalizeImages(raw: unknown): ProductImage[] {
  if (!Array.isArray(raw)) return [];
  const result: ProductImage[] = [];
  for (const item of raw as RawImage[]) {
    if (typeof item === 'string') {
      const url = item.trim();
      if (url) result.push({ url, alt: '' });
    } else if (item && typeof item === 'object') {
      const url = typeof item.url === 'string' ? item.url.trim() : '';
      if (!url) continue;
      const alt = typeof item.alt === 'string' ? item.alt : '';
      result.push({ url, alt });
    }
  }
  return result;
}

/** Plain url strings — used at the Stripe boundary, which requires string[]. */
export function imageUrls(raw: unknown): string[] {
  return normalizeImages(raw).map((image) => image.url);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run (from `backend/`): `npm test -- product-image.spec`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/products/product-image.ts backend/src/modules/products/product-image.spec.ts
git commit -m "feat(products): add ProductImage type and normalizeImages helper"
```

---

## Task 2: Backend shape migration (entity, DTOs, service, Stripe)

Flip the backend from `string[]` to `ProductImage[]`. These files share the type,
so they change together to keep the build green. Validation accepts `{ url, alt? }`
objects and coerces legacy string elements; the service normalizes on read and
write; Stripe receives plain URLs.

**Files:**
- Modify: `backend/src/modules/products/entities/product.entity.ts:34-38`
- Modify: `backend/src/modules/products/dto/create-product.dto.ts`
- Modify: `backend/src/modules/products/dto/update-product.dto.ts`
- Modify: `backend/src/modules/products/products.service.ts`
- Modify: `backend/src/modules/stripe/stripe.service.ts:42-56`
- Test: `backend/src/modules/products/dto/create-product.dto.spec.ts`
- Test: `backend/src/modules/products/products.service.spec.ts`

- [ ] **Step 1: Write the failing DTO test**

Create `backend/src/modules/products/dto/create-product.dto.spec.ts`:

```ts
import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

function makeDto(images: unknown) {
  return plainToInstance(CreateProductDto, {
    name: 'Tee',
    description: 'A tee',
    price: 10,
    category: 'clothing',
    inventory: [{ size: 'M', quantity: 1 }],
    images,
  });
}

describe('CreateProductDto images', () => {
  it('accepts an array of { url, alt } objects', async () => {
    const dto = makeDto([{ url: 'http://x/a.jpg', alt: 'A red tee' }]);
    expect(await validate(dto)).toHaveLength(0);
  });

  it('coerces a legacy string element into a { url } object', async () => {
    const dto = makeDto(['http://x/a.jpg']);
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.images?.[0]).toMatchObject({ url: 'http://x/a.jpg' });
  });

  it('rejects an image object with no url', async () => {
    const dto = makeDto([{ alt: 'orphan' }]);
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });

  it('rejects alt text longer than 250 characters', async () => {
    const dto = makeDto([{ url: 'http://x/a.jpg', alt: 'x'.repeat(251) }]);
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the DTO test to verify it fails**

Run (from `backend/`): `npm test -- create-product.dto.spec`
Expected: FAIL — `images` currently validated as `string[]`, so the object cases error and the coercion expectation is unmet.

- [ ] **Step 3: Update the entity**

In `backend/src/modules/products/entities/product.entity.ts`, add the import near the other imports (after line 10):

```ts
import { ProductImage } from '../product-image';
```

Change the images column (currently lines 37-38) to:

```ts
  @Column('simple-json', { default: '[]' })
  images: ProductImage[];
```

- [ ] **Step 4: Add `ProductImageDto` and update `CreateProductDto`**

Rewrite `backend/src/modules/products/dto/create-product.dto.ts` to:

```ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsInt,
  IsNotEmpty,
  ArrayMinSize,
  Min,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { plainToInstance, Transform, Type } from 'class-transformer';

export class InventoryItemDto {
  @IsString()
  @IsNotEmpty()
  size: string;

  @IsInt()
  @Min(0)
  quantity: number;
}

export class ProductImageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2048)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  alt?: string;
}

// Coerce each element to a ProductImageDto instance ourselves (a legacy bare
// string becomes { url }). Doing the instantiation inside @Transform makes the
// result independent of class-transformer's @Type ordering, and @ValidateNested
// then validates the real instances.
const toProductImageDtos = ({ value }: { value: unknown }) =>
  Array.isArray(value)
    ? value.map((item) =>
        plainToInstance(
          ProductImageDto,
          typeof item === 'string' ? { url: item } : (item ?? {}),
        ),
      )
    : value;

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  @IsNotEmpty()
  category: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  inventory: InventoryItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Transform(toProductImageDtos)
  images?: ProductImageDto[];

  @IsOptional()
  @IsString()
  stripePriceId?: string;
}
```

- [ ] **Step 5: Update `UpdateProductDto`**

Rewrite `backend/src/modules/products/dto/update-product.dto.ts` to reuse the new
image DTO + coercion:

```ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import {
  InventoryItemDto,
  ProductImageDto,
  toProductImageDtos,
} from './create-product.dto';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InventoryItemDto)
  inventory?: InventoryItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Transform(toProductImageDtos)
  images?: ProductImageDto[];

  @IsOptional()
  @IsString()
  stripePriceId?: string;
}
```

This requires exporting the coercion helper. In `create-product.dto.ts`, change
`const toProductImageDtos` to `export const toProductImageDtos`.

- [ ] **Step 6: Run the DTO test to verify it passes**

Run (from `backend/`): `npm test -- create-product.dto.spec`
Expected: PASS (4 tests).

- [ ] **Step 7: Write the failing service test**

Create `backend/src/modules/products/products.service.spec.ts`:

```ts
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { Product } from './entities/product.entity';

describe('ProductsService image normalization', () => {
  let service: ProductsService;
  let repo: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((entity) => entity),
      save: jest.fn(async (p) => p),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getRepositoryToken(Product), useValue: repo },
      ],
    }).compile();
    service = moduleRef.get(ProductsService);
  });

  it('normalizes legacy string images to objects on findAll', async () => {
    repo.find.mockResolvedValue([
      { id: 'p1', images: ['http://x/a.jpg', 'http://x/b.jpg'] },
    ]);
    const [product] = await service.findAll();
    expect(product.images).toEqual([
      { url: 'http://x/a.jpg', alt: '' },
      { url: 'http://x/b.jpg', alt: '' },
    ]);
  });

  it('preserves alt text and defaults a missing alt on findById', async () => {
    repo.findOne.mockResolvedValue({
      id: 'p1',
      images: [
        { url: 'http://x/a.jpg', alt: 'A red tee' },
        { url: 'http://x/b.jpg' },
      ],
    });
    const product = await service.findById('p1');
    expect(product.images).toEqual([
      { url: 'http://x/a.jpg', alt: 'A red tee' },
      { url: 'http://x/b.jpg', alt: '' },
    ]);
  });

  it('normalizes images on create before saving', async () => {
    const saved = await service.create({
      name: 'Tee',
      description: 'd',
      price: 10,
      category: 'clothing',
      inventory: [{ size: 'M', quantity: 1 }],
      images: [{ url: 'http://x/a.jpg', alt: 'A' }],
    } as never);
    expect(repo.save).toHaveBeenCalled();
    expect(saved.images).toEqual([{ url: 'http://x/a.jpg', alt: 'A' }]);
  });
});
```

- [ ] **Step 8: Run the service test to verify it fails**

Run (from `backend/`): `npm test -- products.service.spec`
Expected: FAIL — service does not yet normalize (findAll returns raw strings; create returns un-normalized objects without defaulted alt).

- [ ] **Step 9: Update `products.service.ts` to normalize on read and write**

In `backend/src/modules/products/products.service.ts`:

Add the import after the existing DTO imports (after line 10):

```ts
import { normalizeImages } from './product-image';
```

Add a private helper inside the class (e.g. just below the constructor):

```ts
  private withNormalizedImages(product: Product): Product {
    product.images = normalizeImages(product.images);
    return product;
  }
```

Change `findAll`'s return (currently lines 33-38) to normalize each result:

```ts
    const products = await this.productsRepository.find({
      where,
      order: { createdAt: 'DESC' },
      take,
      skip,
    });
    return products.map((product) => this.withNormalizedImages(product));
```

Change `findById` (currently lines 41-47) to normalize before returning:

```ts
  async findById(id: string): Promise<Product> {
    const product = await this.productsRepository.findOne({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return this.withNormalizedImages(product);
  }
```

Change `create` (currently lines 49-52) to normalize on write:

```ts
  async create(dto: CreateProductDto): Promise<Product> {
    const product = this.productsRepository.create({
      ...dto,
      images: normalizeImages(dto.images),
    });
    const saved = await this.productsRepository.save(product);
    return this.withNormalizedImages(saved);
  }
```

In `update` (currently lines 54-68), after the `Object.assign(product, updates);`
line and before `return`, normalize then return normalized:

```ts
    Object.assign(product, updates);
    product.images = normalizeImages(product.images);
    const saved = await this.productsRepository.save(product);
    return this.withNormalizedImages(saved);
```

(Replace the existing `return this.productsRepository.save(product);` line.)

- [ ] **Step 10: Run the service test to verify it passes**

Run (from `backend/`): `npm test -- products.service.spec`
Expected: PASS (3 tests).

- [ ] **Step 11: Update the Stripe boundary to send plain URLs**

In `backend/src/modules/stripe/stripe.service.ts`, add the import after line 4:

```ts
import { imageUrls } from '../products/product-image';
```

Replace the `product_data` block (currently lines 47-53) so images are mapped to
URL strings (Stripe requires `string[]`):

```ts
          product_data: {
            name: item.product.name,
            description: item.product.description,
            ...(imageUrls(item.product.images).length
              ? { images: imageUrls(item.product.images) }
              : {}),
          },
```

- [ ] **Step 12: Typecheck and run the full backend test suite**

Run (from `backend/`): `npm run build`
Expected: succeeds with no TypeScript errors.

Run (from `backend/`): `npm test`
Expected: all suites PASS (product-image, create-product.dto, products.service, and the existing orders.service spec).

- [ ] **Step 13: Commit**

```bash
git add backend/src/modules/products/entities/product.entity.ts \
        backend/src/modules/products/dto/create-product.dto.ts \
        backend/src/modules/products/dto/update-product.dto.ts \
        backend/src/modules/products/dto/create-product.dto.spec.ts \
        backend/src/modules/products/products.service.ts \
        backend/src/modules/products/products.service.spec.ts \
        backend/src/modules/stripe/stripe.service.ts
git commit -m "feat(products): store per-image alt text, normalize at all boundaries"
```

---

## Task 3: Frontend migration to ProductImage shape + alt inputs

Flip the frontend type to `ProductImage[]`, update every consumer to use `.url`
and `alt || fallback`, and add per-image alt inputs to the admin form in create
mode only (edit mode round-trips existing alt untouched). No frontend test
runner exists; `tsc -b` (via `npm run build`) is the type-safety gate.

**Files:**
- Modify: `frontend/src/types/index.ts:13-23`
- Modify: `frontend/src/components/features/ProductCard.tsx`
- Modify: `frontend/src/pages/ProductDetail.tsx:87,101,127-135`
- Modify: `frontend/src/pages/admin/AdminProducts.tsx:116-124`
- Modify: `frontend/src/pages/admin/AdminProductForm.tsx`

- [ ] **Step 1: Add the `ProductImage` type and update `Product`**

In `frontend/src/types/index.ts`, add the interface above `Product` and change
the `images` field. Replace the current `Product` interface (lines 13-23) with:

```ts
export interface ProductImage {
  url: string;
  alt?: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  inventory: InventoryItem[];
  images: ProductImage[];
  stripePriceId: string | null;
  createdAt: string;
}
```

- [ ] **Step 2: Update `ProductCard.tsx`**

In `frontend/src/components/features/ProductCard.tsx`:

Change line 13 to tolerate undefined length safely:

```ts
  const hasSecondImage = (product.images?.length ?? 0) >= 2;
```

Change the first `<img>` (lines 19-27) so `src` uses `.url` and `alt` overrides:

```tsx
          <img
            src={resolveImageUrl(product.images[0].url, 600)}
            alt={product.images[0].alt || product.name}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-opacity duration-500 ${
              hasSecondImage ? 'group-hover:opacity-0' : ''
            }`}
          />
```

Change the second `<img>` (lines 29-35):

```tsx
            <img
              src={resolveImageUrl(product.images[1].url, 600)}
              alt={product.images[1].alt || product.name}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
```

- [ ] **Step 3: Update `ProductDetail.tsx`**

In `frontend/src/pages/ProductDetail.tsx`:

Change the cart snapshot (line 101) to use `.url`:

```ts
      imageUrl: images[0]?.url ?? null,
```

Change the gallery image (lines 129-134) so `src` uses `.url` and `alt` overrides
with the existing fallback:

```tsx
                <img
                  src={resolveImageUrl(img.url)}
                  alt={img.alt || `${product.name} ${i + 1}`}
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover"
                />
```

(Line 87, `const images = product.images ?? [];`, stays as-is — it is now
`ProductImage[]`.)

- [ ] **Step 4: Update `AdminProducts.tsx` thumbnail**

In `frontend/src/pages/admin/AdminProducts.tsx`, change the thumbnail `<img>`
(lines 116-121) so `src` uses `.url`:

```tsx
                    {product.images?.[0] ? (
                      <img
                        src={resolveImageUrl(product.images[0].url)}
                        alt={product.name}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
```

- [ ] **Step 5: Update `AdminProductForm.tsx` — state, handlers, alt editing**

In `frontend/src/pages/admin/AdminProductForm.tsx`:

(a) Change the type import (line 9) to include `ProductImage`:

```ts
import type { Product, ProductImage } from '@/types';
```

(b) Change the images state (line 29) to objects:

```ts
  const [images, setImages] = useState<ProductImage[]>(product?.images || []);
```

(c) Change the upload push (line 88) to wrap the url in an object:

```ts
        setImages((prev) => [...prev, { url: res.data.url, alt: '' }]);
```

(d) Change the manual-URL push (line 112):

```ts
    setImages((prev) => [...prev, { url, alt: '' }]);
```

(e) Add an `updateAlt` handler next to `removeImage` (after line 103):

```ts
  const updateAlt = (index: number, alt: string) => {
    setImages((prev) =>
      prev.map((img, i) => (i === index ? { ...img, alt } : img)),
    );
  };
```

(f) Replace the image previews block (lines 257-276) with a row layout that shows
an "Alt text (optional)" input per image **only when creating** (`!product`):

```tsx
        {/* Image previews */}
        {images.length > 0 && (
          <div className="space-y-2">
            {images.map((img, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="group/img relative shrink-0">
                  <img
                    src={resolveUrl(img.url)}
                    alt={img.alt || `Image ${i + 1}`}
                    className="h-24 w-24 rounded-md object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-white shadow-sm"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                {!product && (
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
                )}
              </div>
            ))}
          </div>
        )}
```

(The submit handler already sends `images` in its payload at line 140, so no
change is needed there — it now sends `ProductImage[]`. In edit mode the existing
alt values live in `images` state and are round-tripped unchanged.)

- [ ] **Step 6: Typecheck / build the frontend**

Run (from `frontend/`): `npm run build`
Expected: `tsc -b` reports no errors and Vite build completes. (If any consumer of
`product.images` was missed, tsc fails here naming the file/line — fix it to use
`.url`.)

- [ ] **Step 7: Lint the frontend**

Run (from `frontend/`): `npm run lint`
Expected: no new lint errors in the changed files.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/types/index.ts \
        frontend/src/components/features/ProductCard.tsx \
        frontend/src/pages/ProductDetail.tsx \
        frontend/src/pages/admin/AdminProducts.tsx \
        frontend/src/pages/admin/AdminProductForm.tsx
git commit -m "feat(products): per-photo alt text in admin form and storefront rendering"
```

---

## Task 4: Final verification & manual smoke test

Confirm the whole feature works end-to-end and nothing regressed.

**Files:** none (verification only).

- [ ] **Step 1: Full backend test + build**

Run (from `backend/`): `npm test` → all PASS.
Run (from `backend/`): `npm run build` → no errors.

- [ ] **Step 2: Full frontend build + lint**

Run (from `frontend/`): `npm run build` → no errors.
Run (from `frontend/`): `npm run lint` → clean.

- [ ] **Step 3: Manual smoke — create with alt text**

Start backend and frontend dev servers. As an admin, create a new product with
two photos. Fill the "Alt text (optional)" input for the **first** photo (e.g.
"Front view of the navy hoodie") and leave the **second** blank. Save.

- [ ] **Step 4: Manual smoke — verify rendered alt attributes**

On the storefront product detail page, inspect the gallery images in dev tools:
- first image `alt` = the text you typed ("Front view of the navy hoodie");
- second image `alt` = the fallback `"<product name> 2"`.

On a product listing page, the `ProductCard` first image `alt` = your typed text.

- [ ] **Step 5: Manual smoke — edit preserves alt text**

Open the product you just created in the admin edit form. Confirm the alt-text
inputs are **not** shown (edit mode). Change only the price and save. Reload the
detail page and confirm the first image's `alt` is still your typed text (it was
round-tripped, not wiped).

- [ ] **Step 6: Manual smoke — legacy product still renders**

Open an older product (created before this change, stored as legacy string URLs).
Confirm its images still render and their `alt` is the product-name fallback (no
errors in the console). This verifies normalize-on-read.

- [ ] **Step 7: Final commit (if any verification fixes were needed)**

```bash
git add -A
git commit -m "test(products): verify alt text end-to-end"
```

(Skip if no changes were required.)

---

## Self-Review (completed during planning)

- **Spec coverage:** image shape change (Task 1, 2), no DB migration (Task 2 uses
  existing `simple-json`), normalize on read/write/Stripe (Task 1 helper, Task 2
  service+stripe), DTO validation incl. string coercion + alt cap (Task 2),
  create-mode-only alt inputs + edit round-trip (Task 3), storefront override +
  fallback (Task 3), backward compat for legacy rows (Task 1 helper + Task 4
  smoke). Seed update intentionally dropped (documented note above).
- **Placeholder scan:** every code/test step contains full code; every run step
  states the exact command and expected result. No TBD/TODO.
- **Type consistency:** `normalizeImages`/`imageUrls`/`ProductImage` (backend)
  and `ProductImage`/`updateAlt`/`withNormalizedImages` names are used
  identically across tasks; backend `ProductImage.alt` is `string` (normalized,
  defaults `''`), frontend `ProductImage.alt` is `alt?: string` (API always
  returns it populated). DTO `ProductImageDto`/`toProductImageDtos` exports line
  up between create and update DTOs.
