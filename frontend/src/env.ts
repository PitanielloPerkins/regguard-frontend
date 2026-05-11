/**
 * Reg Guard handshake: all browser-originated backend calls use this origin (Dallas ``/run-research``, etc.).
 * Intentionally fixed to the local Flask API — do not read ``VITE_BACKEND_ORIGIN`` (avoids proxy drift).
 */
export const REG_GUARD_BACKEND_ORIGIN_HANDSHAKE = "http://127.0.0.1:8000";

export function getBackendOrigin(): string {
  return REG_GUARD_BACKEND_ORIGIN_HANDSHAKE;
}

/** Absolute Dallas permits fixture endpoint (Flask or merged FastAPI). */
export function getRunResearchAbsoluteUrl(): string {
  return `${getBackendOrigin()}/run-research`;
}
