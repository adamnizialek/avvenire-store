export interface ProductImage {
  url: string;
  alt: string;
}

type RawImage = string | { url?: unknown; alt?: unknown } | null | undefined;

/**
 * Normalize a stored/incoming images value into { url, alt } objects.
 * Tolerates the legacy `string[]` shape and any partial objects, trims urls
 * and alt, defaults a missing alt to '', and drops entries with no usable url.
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
      const alt = typeof item.alt === 'string' ? item.alt.trim() : '';
      result.push({ url, alt });
    }
  }
  return result;
}

/** Plain url strings — used at the Stripe boundary, which requires string[]. */
export function imageUrls(raw: unknown): string[] {
  return normalizeImages(raw).map((image) => image.url);
}
