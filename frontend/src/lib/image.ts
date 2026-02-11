const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export function resolveImageUrl(url: string): string {
  if (url.startsWith('/')) {
    return `${API_BASE}${url}`;
  }
  if (url.includes('res.cloudinary.com') && !url.includes('f_auto')) {
    return url.replace('/upload/', '/upload/f_auto,q_auto/');
  }
  return url;
}
