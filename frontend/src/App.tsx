import { useCallback, useMemo, useState } from "react";

import "./App.css";

import {
  AddressAutocomplete,
  mapsAutocompleteEnabled,
  type AddressSelection,
} from "./AddressAutocomplete";

type NdjsonLine =
  | { event: "open" }
  | { event: "vision_delta"; text: string }
  | {
      event: "context";
      enhanced_query?: string;
      job_description?: string;
      photo_analysis?: string | null;
    }
  | {
      event: "jurisdiction";
      site_address?: string | null;
      profile?: Record<string, unknown>;
    }
  | { event: "step"; step?: string; data?: unknown }
  | { event: "summary_delta"; text: string }
  | {
      event: "complete";
      summary?: string;
      source_urls?: string[];
      site_address?: string | null;
      zip?: string;
      city?: string | null;
      county?: string | null;
      jurisdiction?: unknown;
    }
  | { event: "error"; message: string };

async function detailFromBadResponse(res: Response): Promise<string> {
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const body = (await res.json()) as { detail?: unknown };
      const d = body.detail;
      if (typeof d === "string") {
        return d;
      }
      if (Array.isArray(d)) {
        return d
          .map((x) => (typeof x === "object" && x !== null ? JSON.stringify(x) : String(x)))
          .join("; ");
      }
    } catch {
      /* fallback below */
    }
  }
  const t = await res.text().catch(() => "");
  return t.trim() || `${res.status} ${res.statusText}`;
}

function parseNdjsonObjects(buffer: string): { lines: NdjsonLine[]; rest: string } {
  const parts = buffer.split("\n");
  const rest = parts.pop() ?? "";
  const lines: NdjsonLine[] = [];
  for (const raw of parts) {
    const line = raw.trim();
    if (!line) {
      continue;
    }
    try {
      lines.push(JSON.parse(line) as NdjsonLine);
    } catch {
      lines.push({ event: "error", message: "Malformed stream line from server." });
    }
  }
  return { lines, rest };
}

export default function App() {
  const mapsOk = mapsAutocompleteEnabled();

  const [selection, setSelection] = useState<AddressSelection | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [searchLimit, setSearchLimit] = useState(5);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [visionText, setVisionText] = useState("");
  const [summary, setSummary] = useState("");
  const [sourceUrls, setSourceUrls] = useState<string[]>([]);
  const [meta, setMeta] = useState<{
    site?: string | null;
    zip?: string;
    city?: string | null;
    county?: string | null;
  } | null>(null);

  const canSubmit = useMemo(() => {
    return Boolean(selection?.formattedAddress && selection.zip && !busy);
  }, [selection, busy]);

  const resetOutput = useCallback(() => {
    setError(null);
    setPhase("");
    setSteps([]);
    setVisionText("");
    setSummary("");
    setSourceUrls([]);
    setMeta(null);
  }, []);

  const runResearch = useCallback(async () => {
    if (!selection) {
      return;
    }
    resetOutput();
    setBusy(true);
    setPhase("Connecting…");

    const form = new FormData();
    form.append("zip_code", selection.zip);
    form.append("site_address", selection.formattedAddress);
    form.append("job_description", jobDescription.trim());
    form.append("search_limit", String(searchLimit));
    if (imageFile) {
      form.append("image", imageFile);
    }

    try {
      const res = await fetch("/api/research", { method: "POST", body: form });
      if (!res.ok) {
        throw new Error(await detailFromBadResponse(res));
      }
      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error("No response body from server.");
      }

      const dec = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        buf += dec.decode(value, { stream: true });
        const { lines, rest } = parseNdjsonObjects(buf);
        buf = rest;

        for (const row of lines) {
          switch (row.event) {
            case "open":
              setPhase("Started");
              break;
            case "vision_delta":
              setPhase("Analyzing photo");
              setVisionText((prev) => prev + row.text);
              break;
            case "context":
              setPhase(row.photo_analysis ? "Context ready (photo + job)" : "Context ready");
              break;
            case "jurisdiction":
              setPhase("Jurisdiction locked");
              if (row.site_address != null || row.profile) {
                setMeta((m) => ({
                  ...m,
                  site: row.site_address ?? m?.site,
                }));
              }
              break;
            case "step": {
              const name = typeof row.step === "string" ? row.step : "step";
              setPhase(`Research: ${name}`);
              setSteps((s) =>
                s.includes(name) ? s : [...s, name],
              );
              break;
            }
            case "summary_delta":
              setPhase("Writing summary");
              setSummary((prev) => prev + row.text);
              break;
            case "complete": {
              setPhase("Complete");
              if (typeof row.summary === "string" && row.summary.length > 0) {
                setSummary(row.summary);
              }
              if (Array.isArray(row.source_urls)) {
                setSourceUrls(row.source_urls);
              }
              setMeta({
                site: row.site_address ?? undefined,
                zip: row.zip,
                city: row.city ?? undefined,
                county: row.county ?? undefined,
              });
              break;
            }
            case "error":
              throw new Error(row.message);
            default:
              break;
          }
        }
      }

      const tail = buf.trim();
      if (tail) {
        try {
          const last = JSON.parse(tail) as NdjsonLine;
          if (last.event === "error") {
            throw new Error(last.message);
          }
        } catch {
          /* ignore incomplete tail */
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("");
    } finally {
      setBusy(false);
    }
  }, [selection, jobDescription, searchLimit, imageFile, resetOutput]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1 className="app-title">Reg Guard</h1>
          <p className="app-tagline">
            Compliance research for U.S. job sites — pick an address, describe the scope, optionally
            add a photo, then stream jurisdiction and source-backed summary from the API on port
            8000 (proxied via <code>/api</code>).
          </p>
        </div>
      </header>

      <div className="app-grid">
        <section className="rg-panel">
          <h2>Job site</h2>
          {!mapsOk ? (
            <div className="rg-banner rg-banner--warn" role="status">
              Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>frontend/.env</code> and restart{' '}
              <code>npm run dev</code> to enable verified U.S. address search (required by the backend).
            </div>
          ) : null}

          <div className="rg-field">
            <div id="job-site-address-label" className="rg-field-label-text">
              Address (Google Places)
            </div>
            <AddressAutocomplete disabled={busy} onSelection={setSelection} />
            {selection ? (
              <p className="field-hint">
                Selected ZIP <strong>{selection.zip}</strong> — must match Places result for{' '}
                <code>/research</code>.
              </p>
            ) : (
              <p className="field-hint">
                Choose a full U.S. address from the dropdown so the backend can geocode jurisdiction.
              </p>
            )}
          </div>

          <div className="rg-field">
            <label htmlFor="job-desc">Job description</label>
            <textarea
              id="job-desc"
              className="rg-input"
              placeholder="Voice-style notes or scope: trades, AHJ concerns, timelines…"
              value={jobDescription}
              disabled={busy}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <div className="rg-field">
            <label htmlFor="site-photo">Job-site photo (optional)</label>
            <input
              id="site-photo"
              className="rg-input"
              type="file"
              accept="image/*"
              disabled={busy}
              onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
            />
            <p className="field-hint">
              Sends vision analysis into the research context when included.
            </p>
          </div>

          <div className="rg-field rg-row">
            <label htmlFor="search-limit">
              Sources per scout step{' '}
              <span style={{ fontWeight: 400, color: "var(--rg-muted)" }}>(1–20)</span>
            </label>
            <input
              id="search-limit"
              className="rg-input"
              type="number"
              min={1}
              max={20}
              value={searchLimit}
              disabled={busy}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (!Number.isFinite(n)) {
                  return;
                }
                setSearchLimit(Math.min(20, Math.max(1, Math.round(n))));
              }}
            />
          </div>

          <div className="rg-actions">
            <button
              type="button"
              className="rg-btn rg-btn--primary"
              disabled={!canSubmit}
              onClick={() => void runResearch()}
            >
              {busy ? "Researching…" : "Run compliance research"}
            </button>
            <button
              type="button"
              className="rg-btn rg-btn--ghost"
              disabled={busy}
              onClick={resetOutput}
            >
              Clear results
            </button>
          </div>
        </section>

        <section className="rg-panel">
          <h2>Results</h2>

          {busy && phase ? (
            <div className="rg-phase" aria-live="polite">
              <span className="rg-dot-pulse" aria-hidden />
              {phase}
            </div>
          ) : null}

          {!busy && phase === "Complete" ? (
            <div className="rg-banner rg-banner--muted" role="status">
              Stream finished.{meta?.zip ? ` ZIP ${meta.zip}.` : ""}
              {meta?.city ? ` ${meta.city},` : ""}
              {meta?.county ? ` ${meta.county}` : ""}
            </div>
          ) : null}

          {error ? (
            <div className="rg-banner rg-banner--warn" role="alert">
              {error}
            </div>
          ) : null}

          {steps.length > 0 ? (
            <ul className="rg-step-log" aria-label="Research pipeline steps">
              {steps.map((s) => (
                <li key={s} className="done">
                  {s}
                </li>
              ))}
            </ul>
          ) : null}

          {visionText ? (
            <div>
              <strong className="rg-subheading">Vision (streaming)</strong>
              <div className="vision-snippet">{visionText}</div>
            </div>
          ) : null}

          <div>
            <strong className="rg-subheading">Summary</strong>
            <div className="rg-summary">{summary}</div>
          </div>

          {sourceUrls.length > 0 ? (
            <div className="rg-sources">
              <h3>Sources</h3>
              <ul>
                {sourceUrls.map((u) => (
                  <li key={u}>
                    <a href={u} target="_blank" rel="noreferrer noopener">
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
