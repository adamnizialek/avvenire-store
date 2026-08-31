import { describe, expect, it } from 'vitest';
import {
  ogImageUrl,
  productSeo,
  productJsonLd,
  buildSitemap,
  replaceSeoBlock,
  productHeadTags,
  SEO_MARKER_START,
  SEO_MARKER_END,
  escapeHtml,
} from './seo';
import type { Product } from '@/types';

const product: Product = {
  id: 'abc-123',
  name: 'Merino Wool Sweater',
  description:
    'A **cozy** sweater.\n\nMade from 100% merino wool. Perfect for winter & "layering".',
  price: 149.9,
  category: 'clothing',
  inventory: [
    { size: 'M', quantity: 0 },
    { size: 'L', quantity: 3 },
  ],
  images: [
    { url: 'https://res.cloudinary.com/demo/image/upload/v1/sweater.jpg', alt: 'front' },
    { url: 'https://res.cloudinary.com/demo/image/upload/v1/back.jpg' },
  ],
  stripePriceId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const ORIGIN = 'https://avvenire.vercel.app';

describe('ogImageUrl', () => {
  it('sizes a Cloudinary image to 1200x630 for social unfurls', () => {
    const url = ogImageUrl(product.images[0].url);
    expect(url).toContain('/upload/');
    expect(url).toMatch(/w_1200/);
    expect(url).toMatch(/h_630/);
    expect(url).toMatch(/c_fill/);
  });

  it('falls back to the site OG image when there is no product image', () => {
    expect(ogImageUrl(undefined, ORIGIN)).toBe(`${ORIGIN}/og.png`);
  });
});

describe('productSeo', () => {
  it('builds a title, plain-text description, and canonical path', () => {
    const seo = productSeo(product, ORIGIN);
    expect(seo.title).toBe('Merino Wool Sweater — AVVENIRE');
    expect(seo.canonical).toBe(`${ORIGIN}/products/abc-123`);
    // Markdown stripped, collapsed to a single line, truncated for meta length.
    expect(seo.description).not.toContain('**');
    expect(seo.description).not.toContain('\n');
    expect(seo.description.length).toBeLessThanOrEqual(160);
  });
});

describe('productJsonLd', () => {
  it('emits Product + Offer schema with price and availability', () => {
    const ld = productJsonLd(product, ORIGIN);
    expect(ld['@type']).toBe('Product');
    expect(ld.name).toBe('Merino Wool Sweater');
    expect(ld.offers['@type']).toBe('Offer');
    expect(ld.offers.price).toBe('149.90');
    expect(ld.offers.priceCurrency).toBe('USD');
    // Some size still in stock -> InStock.
    expect(ld.offers.availability).toBe('https://schema.org/InStock');
    expect(ld.image).toContain('res.cloudinary.com');
  });

  it('marks a fully sold-out product OutOfStock', () => {
    const soldOut = { ...product, inventory: [{ size: 'M', quantity: 0 }] };
    expect(productJsonLd(soldOut, ORIGIN).offers.availability).toBe(
      'https://schema.org/OutOfStock',
    );
  });
});

describe('buildSitemap', () => {
  it('lists static routes and every product URL', () => {
    const xml = buildSitemap([product], ORIGIN);
    expect(xml).toContain('<?xml');
    expect(xml).toContain(`<loc>${ORIGIN}/</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/products</loc>`);
    expect(xml).toContain(`<loc>${ORIGIN}/products/abc-123</loc>`);
    expect(xml).toContain('<lastmod>2026-01-01</lastmod>');
  });

  it('xml-escapes product ids/urls safely', () => {
    // ids are uuids in practice, but never trust input in a document builder
    const weird = { ...product, id: 'a&b', createdAt: product.createdAt };
    expect(buildSitemap([weird], ORIGIN)).toContain('/products/a&amp;b');
  });
});

describe('replaceSeoBlock', () => {
  const marked = `<!doctype html><html><head>${SEO_MARKER_START}<title>AVVENIRE</title><meta property="og:title" content="AVVENIRE">${SEO_MARKER_END}</head><body></body></html>`;

  it('swaps the whole marked block, leaving no duplicate static tags', () => {
    const out = replaceSeoBlock(marked, productHeadTags(product, ORIGIN));
    // Exactly one title, and it is the product title (static default gone).
    expect(out.match(/<title>/g)?.length).toBe(1);
    expect(out).toContain('<title>Merino Wool Sweater — AVVENIRE</title>');
    // Exactly one og:title, and it is the product's.
    expect(out.match(/property="og:title"/g)?.length).toBe(1);
    expect(out).toContain('content="Merino Wool Sweater — AVVENIRE"');
    expect(out).toContain('application/ld+json');
  });

  it('falls back to inserting before </head> when markers are absent', () => {
    const plain =
      '<!doctype html><html><head><title>X</title></head><body></body></html>';
    const out = replaceSeoBlock(plain, '<meta name="x" content="y">');
    expect(out).toContain('<meta name="x" content="y"></head>');
  });
});

describe('productHeadTags', () => {
  it('escapes the JSON-LD script close sequence', () => {
    const evil = { ...product, name: 'Tee </script><script>alert(1)' };
    const tags = productHeadTags(evil, ORIGIN);
    // No raw closing script tag can break out of the JSON-LD block.
    expect(tags).not.toContain('</script><script>alert(1)</script>');
    expect(tags).toContain('\\u003c/script');
  });
});

describe('escapeHtml', () => {
  it('neutralizes markup and quotes for attribute/text context', () => {
    expect(escapeHtml('a<b>&"\'')).toBe('a&lt;b&gt;&amp;&quot;&#39;');
  });
});
