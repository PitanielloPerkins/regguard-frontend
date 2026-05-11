/**
 * Vite-exposed configuration (``import.meta.env``).
 *
 * - ``VITE_BACKEND_ORIGIN``: API host used for absolute URLs (e.g. Dallas ``/run-research``) and Vite dev proxy target.
 *   Default ``http://127.0.0.1:8000``.
 */

export function getBackendOrigin(): string {
  const v = import.meta.env.VITE_BACKEND_ORIGIN;
  if (typeof v === "string" && v.trim()) {
    return v.replace(/\/+$/, "");
  }
  return "http://127.0.0.1:8000";
}

/** Absolute Dallas permits fixture endpoint (Flask or merged FastAPI). */
export function getRunResearchAbsoluteUrl(): string {
  return `${getBackendOrigin()}/run-research`;
}
