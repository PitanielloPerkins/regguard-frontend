/**
 * Backend URL resolution for Reg Guard
 * 
 * LOCAL: Vite proxies /api to localhost:8000
 * PRODUCTION (Vercel): Uses VITE_BACKEND_ORIGIN env var (should be https://regguard-api.onrender.com)
 */
export function backendUrl(path: string): string {
  let p = path.trim();
  
  // Ensure path starts with /
  if (!p.startsWith('/')) {
    p = `/${p}`;
  }
  
  // LOCAL DEVELOPMENT: Use relative /api path (Vite proxies to backend)
  if (import.meta.env.DEV) {
    return `/api${p}`;
  }
  
  // PRODUCTION: Use full backend URL from env var
  const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN || 'https://regguard-api.onrender.com';
  return `${backendOrigin}${p}`;
}
