// Anchor the strip to the trailing /api segment so hostnames like
// https://api.example.com/api don't get mangled by a plain string replace.
const API_BASE =
  import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') ||
  'http://localhost:3000';

export function resolveImageUrl(url: string, width?: number): string {
  if (!url) return url;
  if (url.startsWith('/')) {
    return `${API_BASE}${url}`;
  }
  if (url.includes('res.cloudinary.com') && !url.includes('/upload/f_auto')) {
    const transform = width
      ? `f_auto,q_auto,w_${width},c_limit`
      : 'f_auto,q_auto';
    return url.replace('/upload/', `/upload/${transform}/`);
  }
  return url;
}
