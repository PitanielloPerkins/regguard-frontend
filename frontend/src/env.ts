/**
 * Same-origin API paths for Reg Guard (HTTPS-safe on Vercel / iOS Safari).
 *
 * Browser calls always use relative ``/api/...`` URLs — never ``http://127.0.0.1`` or other
 * absolute dev origins (mixed-content blocked on HTTPS). Local Vite dev proxies ``/api`` to
 * the FastAPI server (see ``vite.config.ts``).
 */
export function backendUrl(path: string): string {
  let p = path.trim();
  if (p.startsWith('/api/')) {
    return p;
  }
  if (p.startsWith('api/')) {
    return `/${p}`;
  }
  if (!p.startsWith('/')) {
    p = `/${p}`;
  }
  return `/api${p}`;
}
