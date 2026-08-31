import type { Product } from '../types';

export const SITE_NAME = 'AVVENIRE';
export const DEFAULT_ORIGIN = 'https://avvenire.vercel.app';
export const DEFAULT_TITLE = `${SITE_NAME} — Premium Fashion Store`;
export const DEFAULT_DESCRIPTION =
  'Discover premium clothing, shoes, and accessories at AVVENIRE. Curated luxury fashion with worldwide shipping.';

export interface SeoInput {
  title?: string;
  description?: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'product' | 'article';
}

export interface ResolvedSeo {
  title: string;
  description: string;
  canonical: string | null;
  image: string;
  type: string;
}

/** Resolve SEO props against the site defaults into concrete tag values. */
export function resolveSeo(props: SeoInput): ResolvedSeo {
  return {
    title: props.title ?? DEFAULT_TITLE,
    description: props.description ?? DEFAULT_DESCRIPTION,
    canonical: props.canonical ?? null,
    image: props.image ?? ogImageUrl(undefined, DEFAULT_ORIGIN),
    type: props.type ?? 'website',
  };
}

/** The (selector -> value) map of head tags the client <Seo> owns. */
export function seoTagMap(seo: ResolvedSeo): Record<string, string> {
  const map: Record<string, string> = {
    'meta[name="description"]': seo.description,
    'meta[property="og:type"]': seo.type,
    'meta[property="og:title"]': seo.title,
    'meta[property="og:description"]': seo.description,
    'meta[property="og:image"]': seo.image,
    'meta[name="twitter:card"]': 'summary_large_image',
    'meta[name="twitter:title"]': seo.title,
    'meta[name="twitter:description"]': seo.description,
    'meta[name="twitter:image"]': seo.image,
  };
  if (seo.canonical) {
    map['link[rel="canonical"]'] = seo.canonical;
    map['meta[property="og:url"]'] = seo.canonical;
  }
  return map;
}

/** Escapes text for safe insertion into HTML text or double-quoted attributes. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * A Cloudinary image resized to the 1200x630 that Facebook/Twitter/Vinted
 * unfurlers expect. Non-Cloudinary or missing images fall back to the static
 * site OG card.
 */
export function ogImageUrl(url?: string, origin: string = DEFAULT_ORIGIN): string {
  if (url && url.includes('res.cloudinary.com') && url.includes('/upload/')) {
    return url.replace('/upload/', '/upload/w_1200,h_630,c_fill,f_auto,q_auto/');
  }
  if (url && /^https?:\/\//.test(url)) return url;
  return `${origin}/og.png`;
}

/** Markdown/whitespace stripped, collapsed, and truncated for a meta description. */
export function toMetaDescription(text: string, max = 160): string {
  const plain = text
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1') // links/images -> label
    .replace(/[*_`#>~-]/g, ' ') // markdown punctuation
    .replace(/\s+/g, ' ')
    .trim();
  if (plain.length <= max) return plain;
  return plain.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

export interface ProductSeo {
  title: string;
  description: string;
  canonical: string;
  image: string;
}

export function productSeo(product: Product, origin: string = DEFAULT_ORIGIN): ProductSeo {
  return {
    title: `${product.name} — ${SITE_NAME}`,
    description: toMetaDescription(product.description),
    canonical: `${origin}/products/${product.id}`,
    image: ogImageUrl(product.images?.[0]?.url, origin),
  };
}

interface JsonLdOffer {
  '@type': 'Offer';
  price: string;
  priceCurrency: string;
  availability: string;
  url: string;
}

export interface ProductJsonLd {
  '@context': 'https://schema.org';
  '@type': 'Product';
  name: string;
  description: string;
  image: string;
  category: string;
  offers: JsonLdOffer;
}

export function productJsonLd(
  product: Product,
  origin: string = DEFAULT_ORIGIN,
): ProductJsonLd {
  const inStock = (product.inventory ?? []).some((i) => i.quantity > 0);
  const url = `${origin}/products/${product.id}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: toMetaDescription(product.description, 500),
    image: ogImageUrl(product.images?.[0]?.url, origin),
    category: product.category,
    offers: {
      '@type': 'Offer',
      price: Number(product.price).toFixed(2),
      priceCurrency: 'USD',
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url,
    },
  };
}

const STATIC_ROUTES = ['/', '/products', '/products/new-arrivals'];

export function buildSitemap(
  products: Product[],
  origin: string = DEFAULT_ORIGIN,
): string {
  const url = (loc: string, lastmod?: string) =>
    `  <url><loc>${escapeHtml(origin + loc)}</loc>${
      lastmod ? `<lastmod>${String(lastmod).slice(0, 10)}</lastmod>` : ''
    }</url>`;
  const rows = [
    ...STATIC_ROUTES.map((r) => url(r)),
    ...products.map((p) => url(`/products/${p.id}`, p.createdAt)),
  ];
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    rows.join('\n') +
    '\n</urlset>\n'
  );
}

// index.html wraps its static, site-default SEO tags between these markers so
// the prerender function can swap the whole block for per-product tags —
// replacing (not appending) avoids a crawler seeing two og:title tags and
// unfurling the generic one.
export const SEO_MARKER_START = '<!--SEO-->';
export const SEO_MARKER_END = '<!--/SEO-->';

/**
 * Replaces the marked SEO block with new tags. Used by the Vercel prerender
 * function so crawlers and link-unfurlers, which never run the SPA's JS, see
 * per-product meta. Falls back to inserting before </head> if the markers are
 * absent (e.g. an older build).
 */
export function replaceSeoBlock(html: string, tags: string): string {
  const start = html.indexOf(SEO_MARKER_START);
  const end = html.indexOf(SEO_MARKER_END);
  if (start === -1 || end === -1 || end < start) {
    return html.replace('</head>', `${tags}</head>`);
  }
  return (
    html.slice(0, start) +
    SEO_MARKER_START +
    tags +
    html.slice(end)
  );
}

/** The full <head> meta block (title, OG, Twitter, canonical, JSON-LD) for a product. */
export function productHeadTags(
  product: Product,
  origin: string = DEFAULT_ORIGIN,
): string {
  const seo = productSeo(product, origin);
  const jsonLd = JSON.stringify(productJsonLd(product, origin));
  const meta = (attr: string, key: string, content: string) =>
    `<meta ${attr}="${key}" content="${escapeHtml(content)}">`;
  return [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}">`,
    `<link rel="canonical" href="${escapeHtml(seo.canonical)}">`,
    meta('property', 'og:type', 'product'),
    meta('property', 'og:title', seo.title),
    meta('property', 'og:description', seo.description),
    meta('property', 'og:url', seo.canonical),
    meta('property', 'og:image', seo.image),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', seo.title),
    meta('name', 'twitter:description', seo.description),
    meta('name', 'twitter:image', seo.image),
    // data-seo-jsonld lets the client <Seo> upsert this exact node instead of
    // adding a second one. JSON-LD is data — escape the '<' so the closing
    // </script> sequence can't break out of the block.
    `<script type="application/ld+json" data-seo-jsonld>${jsonLd.replace(
      /</g,
      '\\u003c',
    )}</script>`,
  ].join('');
}
