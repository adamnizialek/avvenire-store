import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Product } from '../src/types';
import { buildSitemap } from '../src/lib/seo';

// Dynamic sitemap so newly added products are discoverable without a rebuild.
// Referenced from public/robots.txt. Served at /sitemap.xml via a vercel.json
// rewrite.

const API_ORIGIN =
  process.env.API_ORIGIN || 'https://avvenire-api.onrender.com';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  const host = (req.headers['x-forwarded-host'] ?? req.headers.host) as string;
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https';
  const origin = `${proto}://${host}`;

  let products: Product[] = [];
  try {
    const r = await fetch(`${API_ORIGIN}/api/products`);
    if (r.ok) {
      products = (await r.json()) as Product[];
    }
  } catch {
    // Serve a sitemap of just the static routes if the API is unreachable.
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader(
    'Cache-Control',
    's-maxage=3600, stale-while-revalidate=86400',
  );
  res.status(200).send(buildSitemap(products, origin));
}
