import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import "./App.css";

import {
  AddressAutocomplete,
  type AddressAutocompleteHandle,
  mapsAutocompleteEnabled,
  type AddressSelection,
} from "./AddressAutocomplete";

type NdjsonLine =
  | { event: "open" }
  | { event: "heartbeat"; ts?: number }
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

function speechRecognitionCtor(): (new () => SpeechRecognition) | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

async function warmMicrophonePermission(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    return;
  }
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  for (const track of stream.getTracks()) {
    track.stop();
  }
}

export default function App() {
  const geoSupported =
    typeof navigator !== "undefined" &&
    navigator.geolocation != null &&
    typeof navigator.geolocation.getCurrentPosition === "function";

  const speechCtorMounted =
    typeof window !== "undefined"
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : undefined;
  const speechSupportedOnMount =
    typeof speechCtorMounted === "function";

  useEffect(() => {
    console.log("[RegGuard handshake]", {
      geolocation: geoSupported,
      navigatorGeolocationPresent: !!navigator.geolocation,
      SpeechRecognitionCtor: speechSupportedOnMount,
      SpeechRecognition_standard: !!window.SpeechRecognition,
      webkitSpeechRecognition: !!window.webkitSpeechRecognition,
    });
  }, [geoSupported, speechSupportedOnMount]);

  const mapsOk = mapsAutocompleteEnabled();
  const addressRef = useRef<AddressAutocompleteHandle>(null);
  const dictationAnchorRef = useRef("");
  const dictationFinalAccumRef = useRef("");
  const listeningRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const initialRevisionRef = useRef<string | null>(null);
  const lastPollRevisionRef = useRef<string | null>(null);
  const dismissedRevisionRef = useRef<string | null>(null);
  const researchSawChunkRef = useRef(false);
  const researchCompleteRef = useRef(false);

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
  const [locatingMe, setLocatingMe] = useState(false);
  const [locateMessage, setLocateMessage] = useState<string | null>(null);
  const [dictationActive, setDictationActive] = useState(false);
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  const [backendStale, setBackendStale] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number | null>(null);
  const [streamBroken, setStreamBroken] = useState(false);
  const [meta, setMeta] = useState<{
    site?: string | null;
    zip?: string;
    city?: string | null;
    county?: string | null;
  } | null>(null);

  const setJobDescriptionRef = useRef(setJobDescription);
  setJobDescriptionRef.current = setJobDescription;
  const setSpeechHintRef = useRef(setSpeechHint);
  setSpeechHintRef.current = setSpeechHint;
  const setDictationActiveRef = useRef(setDictationActive);
  setDictationActiveRef.current = setDictationActive;

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
    setStreamBroken(false);
  }, []);

  const runResearch = useCallback(async () => {
    if (!selection) {
      return;
    }
    resetOutput();
    setStreamBroken(false);
    researchSawChunkRef.current = false;
    researchCompleteRef.current = false;
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
      const res = await fetch("/api/research", {
        method: "POST",
        body: form,
        cache: "no-store",
      });
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
        if (value && value.byteLength > 0) {
          researchSawChunkRef.current = true;
        }
        buf += dec.decode(value, { stream: true });
        const { lines, rest } = parseNdjsonObjects(buf);
        buf = rest;

        for (const row of lines) {
          switch (row.event) {
            case "open":
              setPhase("Started");
              break;
            case "heartbeat":
              setPhase((p) =>
                p.startsWith("Research:") || p === "Writing summary" ? p : "Research scan in progress…",
              );
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
              researchCompleteRef.current = true;
              setStreamBroken(false);
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

      if (researchSawChunkRef.current && !researchCompleteRef.current) {
        setStreamBroken(true);
        setError((prev) => prev ?? "Research stream ended before completion.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
      setPhase("");
      if (researchSawChunkRef.current && !researchCompleteRef.current) {
        setStreamBroken(true);
      }
    } finally {
      setBusy(false);
    }
  }, [selection, jobDescription, searchLimit, imageFile, resetOutput]);

  const handleLocateMe = useCallback(() => {
    setLocateMessage(null);
    if (!geoSupported || !mapsOk) {
      return;
    }
    setLocatingMe(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        try {
          const q = new URLSearchParams({
            latitude: String(lat),
            longitude: String(lon),
          });
          const res = await fetch(`/api/reverse-geocode-address?${q}`, { method: "GET" });
          if (!res.ok) {
            setLocateMessage(await detailFromBadResponse(res.clone()));
            setLocatingMe(false);
            return;
          }
          const data = (await res.json()) as { formatted_address?: string; zip?: string };
          const formattedAddress =
            typeof data.formatted_address === "string" ? data.formatted_address.trim() : "";
          const zip = typeof data.zip === "string" ? data.zip.trim() : "";
          if (!formattedAddress || zip.length !== 5) {
            setLocateMessage("Could not decode that location into a U.S. address with ZIP.");
            setLocatingMe(false);
            return;
          }
          const sel = { formattedAddress, zip };
          setSelection(sel);
          addressRef.current?.setLocatedAddress(sel);
          setLocateMessage(null);
        } catch (e) {
          setLocateMessage(e instanceof Error ? e.message : String(e));
        }
        setLocatingMe(false);
      },
      (err) => {
        setLocateMessage(
          err.message ? `Location unavailable: ${err.message}` : "Location permission denied.",
        );
        setLocatingMe(false);
      },
      { enableHighAccuracy: false, timeout: 18_000, maximumAge: 0 },
    );
  }, [geoSupported, mapsOk]);

  const speechCtor = useMemo(() => speechRecognitionCtor(), []);
  const speechSupported = Boolean(speechCtor) && speechSupportedOnMount;

  useEffect(() => {
    if (!speechCtor) {
      recognitionRef.current = null;
      return;
    }

    const transcriptFor = (r: SpeechRecognitionResult): string => {
      try {
        const a = typeof r.item === "function" ? r.item(0) : undefined;
        const alt = (a ?? r[0]) as SpeechRecognitionAlternative | undefined;
        return typeof alt?.transcript === "string" ? alt.transcript : "";
      } catch {
        return "";
      }
    };

    const rec = new speechCtor();

    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";

    rec.onstart = () => {
      console.log("[RegGuard speech] onstart — browser is listening");
    };

    rec.onresult = (ev) => {
      console.log("[RegGuard speech] onresult", {
        resultIndex: ev.resultIndex,
        resultsLength: ev.results.length,
      });

      let newFinalChunk = "";
      let interimChunk = "";

      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const txt = transcriptFor(r);
        console.log("[RegGuard speech] segment", i, { isFinal: r.isFinal, transcript: txt });
        if (r.isFinal) {
          newFinalChunk += txt;
        } else {
          interimChunk += txt;
        }
      }

      dictationFinalAccumRef.current += newFinalChunk;
      const nextText =
        dictationAnchorRef.current + dictationFinalAccumRef.current + interimChunk;

      console.log("[RegGuard speech] setJobDescription", {
        mergedLength: nextText.length,
        preview: nextText.slice(-120),
      });

      setJobDescriptionRef.current(nextText);
    };

    rec.onerror = (ev) => {
      if (ev.error === "audio-capture" || ev.error === "not-allowed") {
        window.alert(
          `Speech recognition: ${ev.error}\n${(ev.message && String(ev.message).trim()) || "Microphone unavailable or blocked for this site."}`,
        );
      }

      if (ev.error === "aborted" || ev.error === "no-speech") {
        return;
      }
      if (ev.error === "not-allowed") {
        setSpeechHintRef.current(
          "Microphone permission denied. Use site settings to allow the microphone, then try dictation again.",
        );
      } else if (ev.error === "audio-capture") {
        setSpeechHintRef.current("No microphone found or it is busy in another app.");
      } else {
        setSpeechHintRef.current(`Voice input paused (${ev.error}). You can keep typing.`);
      }
      listeningRef.current = false;
      setDictationActiveRef.current(false);
    };

    rec.onend = () => {
      console.log("[RegGuard speech] onend — recognition session ended");
      if (!listeningRef.current) {
        setDictationActiveRef.current(false);
        return;
      }
      try {
        recognitionRef.current?.start();
      } catch {
        listeningRef.current = false;
        setDictationActiveRef.current(false);
      }
    };

    recognitionRef.current = rec;

    return () => {
      listeningRef.current = false;
      try {
        rec.abort();
      } catch {
        /* noop */
      }
      recognitionRef.current = null;
    };
  }, [speechCtor]);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const r = await fetch("/api/dashboard-revision", { cache: "no-store" });
        if (!alive || !r.ok) {
          return;
        }
        const j = (await r.json()) as { revision?: string; version?: string };
        let rev = typeof j.revision === "string" && j.revision.length > 0 ? j.revision : "";
        if (!rev && typeof j.version === "string") {
          rev = `version:${j.version}`;
        }
        if (!rev) {
          return;
        }
        lastPollRevisionRef.current = rev;
        if (initialRevisionRef.current === null) {
          initialRevisionRef.current = rev;
          return;
        }
        if (rev !== initialRevisionRef.current && rev !== dismissedRevisionRef.current) {
          setBackendStale(true);
        }
      } catch {
        /* proxy down or offline */
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 30_000);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, []);

  useEffect(() => {
    if (!backendStale) {
      setAutoRefreshSec(null);
      return;
    }
    let sec = 12;
    setAutoRefreshSec(sec);
    const id = window.setInterval(() => {
      sec -= 1;
      setAutoRefreshSec(sec);
      if (sec <= 0) {
        window.clearInterval(id);
        window.location.reload();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [backendStale]);

  const dismissBackendNotice = useCallback(() => {
    dismissedRevisionRef.current = lastPollRevisionRef.current;
    setBackendStale(false);
  }, []);

  const toggleDictation = useCallback(() => {
    if (!speechCtor) {
      setSpeechHint("Voice dictation is not supported in this browser. Try Chrome or Edge.");
      return;
    }

    const rec = recognitionRef.current;
    if (!rec) {
      setSpeechHint("Speech engine is not ready yet. Reload the page and try again.");
      return;
    }

    if (listeningRef.current) {
      listeningRef.current = false;
      try {
        rec.stop();
      } catch {
        rec.abort();
      }
      setDictationActive(false);
      return;
    }

    setSpeechHint(null);
    void (async () => {
      try {
        await warmMicrophonePermission();
      } catch {
        setSpeechHint(
          "Microphone warmup was blocked—you may still get a browser prompt; choose Allow to dictate.",
        );
      }

      dictationAnchorRef.current = jobDescription;
      dictationFinalAccumRef.current = "";
      listeningRef.current = true;

      try {
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        rec.start();
        setDictationActive(true);
      } catch {
        listeningRef.current = false;
        setSpeechHint("Could not start the microphone. Confirm permissions and try again.");
        setDictationActive(false);
      }
    })();
  }, [jobDescription, speechCtor]);

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
            <div className="rg-address-bar">
              <div className="rg-address-slot">
                <AddressAutocomplete
                  ref={addressRef}
                  disabled={busy || locatingMe}
                  onSelection={setSelection}
                />
              </div>
              <button
                type="button"
                className="rg-btn rg-btn--ghost rg-locate-btn"
                title="Use current location"
                aria-label="Locate me with GPS"
                disabled={busy || locatingMe || !mapsOk || !geoSupported}
                onClick={() => handleLocateMe()}
              >
                {locatingMe ? (
                  <span className="rg-locate-loading" aria-hidden />
                ) : (
                  <svg className="rg-locate-icon" viewBox="0 0 24 24" aria-hidden>
                    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                    <path
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      d="M12 19v3M12 2v3M21 11h3M3 11h3M17.657 17.657l2.121 2.121M6.344 17.657l-2.12 2.121M17.657 6.344l2.121-2.12M6.344 6.344L4.223 4.223"
                    />
                  </svg>
                )}
              </button>
            </div>
            {!geoSupported ? (
              <p className="field-hint">
                Locate Me isn’t supported in this browser — use search or enter an address manually.
              </p>
            ) : null}
            {locateMessage ? (
              <div className="rg-banner rg-banner--warn" role="alert">
                {locateMessage}
              </div>
            ) : null}
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
            <div className="rg-job-desc-head">
              <label htmlFor="job-desc">Job description</label>
              <button
                type="button"
                className={`rg-btn rg-btn--ghost rg-mic-btn${dictationActive ? " rg-mic-btn--active" : ""}`}
                title={dictationActive ? "Stop dictation" : "Dictate with microphone"}
                aria-label={dictationActive ? "Stop voice dictation" : "Start voice dictation"}
                aria-pressed={dictationActive}
                disabled={busy || !speechSupported}
                onClick={() => toggleDictation()}
              >
                {dictationActive ? (
                  <span className="rg-mic-pulse" aria-hidden />
                ) : (
                  <svg
                    className="rg-mic-icon"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 1 1-6 0V5a3 3 0 0 1 3-3Z" />
                    <path d="M19 10v1a7 7 0 1 1-14 0v-1" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                    <line x1="8" x2="16" y1="22" y2="22" />
                  </svg>
                )}
              </button>
            </div>
            {!speechSupported ? (
              <p className="field-hint">
                Voice dictation requires a Chromium-based desktop browser (speech recognition APIs).
              </p>
            ) : null}
            {speechHint ? (
              <p id="job-desc-speech-hint" className="field-hint rg-speech-hint" role="status">
                {speechHint}
              </p>
            ) : null}
            <textarea
              id="job-desc"
              className={`rg-input${dictationActive ? " rg-input--dictating" : ""}`}
              placeholder="Type or use the microphone: trades, scope, timelines, AHJ questions…"
              value={jobDescription}
              disabled={busy}
              onChange={(e) => setJobDescription(e.target.value)}
              aria-describedby={speechHint ? "job-desc-speech-hint" : undefined}
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

          {streamBroken && !busy ? (
            <div className="rg-banner rg-banner--muted" role="status">
              <span>The research stream stopped before completion. Partial results may appear above.</span>{" "}
              <button
                type="button"
                className="rg-btn rg-btn--primary rg-btn--compact"
                disabled={!selection?.formattedAddress || !selection.zip}
                onClick={() => void runResearch()}
              >
                Resume Research
              </button>
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

      {backendStale ? (
        <div className="rg-update-toast" role="status" aria-live="polite">
          <div className="rg-update-toast-inner">
            <span>A newer API build was detected.{autoRefreshSec !== null ? ` Refreshing in ${autoRefreshSec}s…` : ""}</span>
            <span className="rg-update-actions">
              <button type="button" className="rg-btn rg-btn--primary rg-btn--compact" onClick={() => window.location.reload()}>
                Refresh now
              </button>
              <button type="button" className="rg-btn rg-btn--ghost rg-btn--compact" onClick={dismissBackendNotice}>
                Skip once
              </button>
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
