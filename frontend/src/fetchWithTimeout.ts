/** Default timeout for API probes and JSON calls — avoids hung “zombie” requests in the UI. */
export const DEFAULT_FETCH_TIMEOUT_MS = 5000;

export type FetchWithTimeoutInit = RequestInit & { timeoutMs?: number };

/**
 * ``fetch`` wrapper that aborts after ``timeoutMs`` (default 5s). Combines with any caller ``signal``.
 * Do not use for long-lived SSE streams — pass plain ``fetch`` there instead.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: FetchWithTimeoutInit,
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const { timeoutMs: _omit, signal: userSignal, ...rest } = init ?? {};
  const controller = new AbortController();
  const id = window.setTimeout(() => {
    controller.abort(new DOMException("Request timed out", "TimeoutError"));
  }, timeoutMs);

  const onUserAbort = () => {
    controller.abort(userSignal?.reason);
  };

  try {
    if (userSignal) {
      if (userSignal.aborted) {
        controller.abort(userSignal.reason);
      } else {
        userSignal.addEventListener("abort", onUserAbort, { once: true });
      }
    }
    return await fetch(input, { ...rest, signal: controller.signal });
  } finally {
    window.clearTimeout(id);
    userSignal?.removeEventListener("abort", onUserAbort);
  }
}
