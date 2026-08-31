import { describe, expect, it } from 'vitest';
import { resolveSeo, seoTagMap } from '@/lib/seo';

describe('resolveSeo', () => {
  it('uses provided values', () => {
    const seo = resolveSeo({
      title: 'Merino Sweater — AVVENIRE',
      description: 'A cozy sweater.',
      canonical: 'https://avvenire.vercel.app/products/abc',
      image: 'https://res.cloudinary.com/x/og.jpg',
      type: 'product',
    });
    expect(seo.title).toBe('Merino Sweater — AVVENIRE');
    expect(seo.canonical).toBe('https://avvenire.vercel.app/products/abc');
    expect(seo.type).toBe('product');
  });

  it('falls back to site defaults', () => {
    const seo = resolveSeo({});
    expect(seo.title).toContain('AVVENIRE');
    expect(seo.description).toContain('premium');
    expect(seo.canonical).toBeNull();
    expect(seo.image).toContain('/og.png');
    expect(seo.type).toBe('website');
  });
});

describe('seoTagMap', () => {
  it('maps title/description into OG + Twitter tags', () => {
    const map = seoTagMap(resolveSeo({ title: 'T', description: 'D' }));
    expect(map['meta[property="og:title"]']).toBe('T');
    expect(map['meta[name="twitter:title"]']).toBe('T');
    expect(map['meta[name="description"]']).toBe('D');
    expect(map['meta[name="twitter:card"]']).toBe('summary_large_image');
  });

  it('omits canonical/og:url when no canonical is given', () => {
    const map = seoTagMap(resolveSeo({ title: 'T' }));
    expect(map['link[rel="canonical"]']).toBeUndefined();
    expect(map['meta[property="og:url"]']).toBeUndefined();
  });

  it('includes canonical + og:url when given', () => {
    const map = seoTagMap(resolveSeo({ canonical: 'https://x/products/1' }));
    expect(map['link[rel="canonical"]']).toBe('https://x/products/1');
    expect(map['meta[property="og:url"]']).toBe('https://x/products/1');
  });
});
