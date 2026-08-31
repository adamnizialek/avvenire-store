import { useEffect } from 'react';
import { resolveSeo, seoTagMap, type SeoInput } from '@/lib/seo';

interface SeoProps extends SeoInput {
  /** Structured data (e.g. Product/Offer) upserted as a single JSON-LD script. */
  jsonLd?: object;
}

const JSONLD_SELECTOR = 'script[type="application/ld+json"][data-seo-jsonld]';

function contentAttr(selector: string): 'content' | 'href' {
  return selector.startsWith('link') ? 'href' : 'content';
}

function elementFor(selector: string): HTMLElement {
  if (selector.startsWith('link')) {
    const link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    return link;
  }
  const meta = document.createElement('meta');
  const m = /(name|property)="([^"]+)"/.exec(selector);
  if (m) meta.setAttribute(m[1], m[2]);
  return meta;
}

/**
 * Per-route document metadata for the live app and client-side navigation.
 *
 * It UPSERTS the existing head tags in place (rather than rendering new ones),
 * so it updates the static site-default tags in index.html — and, in
 * production, the per-product tags the prerender function injected — instead of
 * appending duplicates. On unmount it restores the previous values, so
 * navigating away from a product reverts to the site defaults.
 *
 * NOTE: crawlers and link-unfurlers do not run this JS. Real per-product unfurl
 * metadata is injected server-side by the Vercel prerender function
 * (frontend/api/product-meta.ts); this is the human/SPA counterpart.
 */
export function Seo({ jsonLd, ...input }: SeoProps) {
  const { title, description, canonical, image, type } = input;
  // Stable dep: jsonLd is a fresh object each render, so key the effect on its
  // serialized value to avoid re-writing every tag on every render.
  const jsonLdKey = jsonLd ? JSON.stringify(jsonLd) : '';

  useEffect(() => {
    const seo = resolveSeo({ title, description, canonical, image, type });
    const previousTitle = document.title;
    document.title = seo.title;

    const restores: Array<() => void> = [];
    for (const [selector, value] of Object.entries(seoTagMap(seo))) {
      const attr = contentAttr(selector);
      const el =
        document.head.querySelector<HTMLElement>(selector) ??
        elementFor(selector);
      if (el.isConnected) {
        const prev = el.getAttribute(attr);
        el.setAttribute(attr, value);
        restores.push(() =>
          prev === null ? el.removeAttribute(attr) : el.setAttribute(attr, prev),
        );
      } else {
        el.setAttribute(attr, value);
        document.head.appendChild(el);
        restores.push(() => el.remove());
      }
    }

    let restoreJsonLd: (() => void) | undefined;
    if (jsonLdKey) {
      const json = jsonLdKey;
      const existing =
        document.head.querySelector<HTMLScriptElement>(JSONLD_SELECTOR);
      if (existing) {
        const prev = existing.textContent;
        existing.textContent = json;
        restoreJsonLd = () => {
          existing.textContent = prev;
        };
      } else {
        const script = document.createElement('script');
        script.type = 'application/ld+json';
        script.setAttribute('data-seo-jsonld', '');
        script.textContent = json;
        document.head.appendChild(script);
        restoreJsonLd = () => script.remove();
      }
    }

    return () => {
      document.title = previousTitle;
      restores.forEach((r) => r());
      restoreJsonLd?.();
    };
  }, [title, description, canonical, image, type, jsonLdKey]);

  return null;
}
