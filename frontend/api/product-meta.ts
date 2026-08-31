import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Product } from '../src/types';
import { productHeadTags, replaceSeoBlock } from '../src/lib/seo';

// The storefront is a client-rendered SPA, so crawlers and link-unfurlers
// (Vinted/Instagram/Facebook — none run JS) would otherwise see only the
// generic site-default meta. This function serves /products/:id with real
// per-product <title>, Open Graph, Twitter, and Product/Offer JSON-LD injected
// into the built index.html, for humans and bots alike.

const API_ORIGIN =
  process.env.API_ORIGIN || 'https://avvenire-api.onrender.com';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const id = String(req.query.id ?? '');
  const host = (req.headers['x-forwarded-host'] ?? req.headers.host) as string;
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
  const origin = `${proto}://${host}`;

  let html: string;
  try {
    const templateRes = await fetch(`${origin}/index.html`);
    html = await templateRes.text();
  } catch {
    // If we cannot read the template, let the SPA's normal routing serve it.
    res.setHeader('Location', `/products/${id}`);
    res.status(302).end();
    return;
  }

  try {
    const productRes = await fetch(
      `${API_ORIGIN}/api/products/${encodeURIComponent(id)}`,
    );
    if (productRes.ok) {
      const product = (await productRes.json()) as Product;
      html = replaceSeoBlock(html, productHeadTags(product, origin));
    }
    // A non-OK response (e.g. /products/new-arrivals, or a deleted product)
    // just serves the site-default template — the SPA renders the right route.
  } catch {
    // API down: still serve the SPA shell with default meta.
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    's-maxage=300, stale-while-revalidate=3600',
  );
  res.status(200).send(html);
}
