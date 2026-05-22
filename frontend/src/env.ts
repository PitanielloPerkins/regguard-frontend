/**
 * Reg Guard backend origin for browser-originated API calls.
 *
 * - **Local dev:** defaults to ``http://127.0.0.1:8000`` (no ``/api`` prefix).
 * - **Vercel (same deploy):** omit ``VITE_BACKEND_ORIGIN`` — uses ``/api`` on the current origin.
 * - **Split API host:** set ``VITE_BACKEND_ORIGIN`` to your public FastAPI base (with or without ``/api``).
 */
export const DEFAULT_BACKEND_ORIGIN = 'http://127.0.0.1:8000';

function normalizedBackendOrigin(): string | null {
  const raw = import.meta.env.VITE_BACKEND_ORIGIN;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\/+$/, '');
  return trimmed || null;
}

export function getBackendOrigin(): string {
  const configured = normalizedBackendOrigin();
  if (configured) return configured;
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return window.location.origin;
  }
  return DEFAULT_BACKEND_ORIGIN;
}

/** True when API calls should use the Vercel ``/api/*`` rewrite (same-origin production). */
function usesVercelApiPrefix(): boolean {
  if (normalizedBackendOrigin()) return false;
  if (!import.meta.env.PROD) return false;
  return typeof window !== 'undefined';
}

/**
 * Absolute URL for a backend route (e.g. ``/research`` → ``/api/research`` on Vercel).
 * Normalizes paths and strips a duplicate ``/api`` segment when present.
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
  const origin = getBackendOrigin();
  const apiPrefix = usesVercelApiPrefix() ? '/api' : '';
  return `${origin}${apiPrefix}${p}`;
}

/** Absolute research SSE endpoint (POST). */
export function getRunResearchAbsoluteUrl(): string {
  return backendUrl('/research');
}
