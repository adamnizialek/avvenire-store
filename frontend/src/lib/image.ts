const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000';

export function resolveImageUrl(url: string): string {
  if (url.startsWith('/')) {
    return `${API_BASE}${url}`;
  }
  return url;
}
