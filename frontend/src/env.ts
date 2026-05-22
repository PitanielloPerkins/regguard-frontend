/**
 * Reg Guard backend origin for browser-originated API calls.
 *
 * Set ``VITE_BACKEND_ORIGIN`` at build time (e.g. Vercel env) to your public FastAPI host.
 * Omit it for local dev — defaults to ``http://127.0.0.1:8000``.
 */
export const DEFAULT_BACKEND_ORIGIN = 'http://127.0.0.1:8000';

export function getBackendOrigin(): string {
  const raw = import.meta.env.VITE_BACKEND_ORIGIN;
  if (typeof raw === 'string') {
    const trimmed = raw.trim().replace(/\/+$/, '');
    if (trimmed) return trimmed;
  }
  return DEFAULT_BACKEND_ORIGIN;
}

/**
 * Absolute URL for a backend route (e.g. ``/research``).
 * Normalizes paths and strips a legacy ``/api`` prefix if present.
 */
export function backendUrl(path: string): string {
  let p = path.trim();
  if (p.startsWith('/api/')) {
    p = p.slice(4);
  } else if (p.startsWith('api/')) {
    p = `/${p.slice(4)}`;
  }
  if (!p.startsWith('/')) {
    p = `/${p}`;
  }
  return `${getBackendOrigin()}${p}`;
}

/** Absolute research SSE endpoint (POST). */
export function getRunResearchAbsoluteUrl(): string {
  return backendUrl('/research');
}
