import { useCallback, useEffect, useId, useRef, useState } from "react";
import "./App.css";

type ResearchJson = {
  zip: string;
  summary: string;
  source_urls: string[];
  enhanced_query: string;
  job_description: string;
  photo_analysis: string | null;
};

type StreamProgress = {
  enhanced_query: string;
  job_description: string;
  photo_analysis: string | null;
  links: string[];
  stepsDone: string[];
};

const STEP_TITLE: Record<string, string> = {
  step_jurisdiction: "Jurisdiction",
  step_building_permits: "Permits & AHJ",
  step_building_codes: "Adopted codes",
};

function appendUrls(ordered: string[], rows: { url?: string | null }[]): string[] {
  const seen = new Set(ordered);
  const out = [...ordered];
  for (const row of rows) {
    const u = row.url;
    if (u && !seen.has(u)) {
      seen.add(u);
      out.push(u);
    }
  }
  return out;
}

function getSpeechCtor(): (new () => SpeechRecognition) | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

function parseWorkflowBullets(summary: string): string[] {
  const out: string[] = [];
  for (const line of summary.split(/\r?\n/)) {
    const t = line.trim();
    if (t.startsWith("•")) {
      out.push(t.replace(/^•\s*/, "").trim());
    }
  }
  return out;
}

function parsePhotoTipLines(photo: string | null): string[] {
  if (!photo?.trim()) {
    return [];
  }
  return photo
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^•\s*/, "").trim())
    .filter(Boolean);
}

function formatMemoDate(): string {
  return new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ResearchMemo({
  result,
  memoRef,
}: {
  result: ResearchJson;
  memoRef: React.RefObject<HTMLElement | null>;
}) {
  const workflowBullets = parseWorkflowBullets(result.summary);
  const narrativeLines = result.summary.split(/\r?\n/).filter((line) => !line.trim().startsWith("•"));
  let narrative = narrativeLines.join("\n").trim();
  if (workflowBullets.length === 0) {
    narrative = result.summary.trim();
  }
  const photoTips = parsePhotoTipLines(result.photo_analysis);
  const showAppendix =
    result.enhanced_query.length > 2 && !result.enhanced_query.trim().startsWith("— (no");

  return (
    <article ref={memoRef} className="rg-memo">
      <header className="rg-memo__header">
        <p className="rg-memo__kicker">Technical memorandum</p>
        <h2 className="rg-memo__title">Regulatory research summary</h2>
        <dl className="rg-memo__meta">
          <div className="rg-memo__meta-row">
            <dt>Subject</dt>
            <dd>Building code and permit pointers — U.S. ZIP {result.zip}</dd>
          </div>
          <div className="rg-memo__meta-row">
            <dt>Date</dt>
            <dd>{formatMemoDate()}</dd>
          </div>
          <div className="rg-memo__meta-row">
            <dt>Source</dt>
            <dd>Reg Guard research (automated; verify with AHJ)</dd>
          </div>
        </dl>
      </header>

      <div className="rg-memo__body">
        <section className="rg-memo__section">
          <h3 className="rg-memo__section-head">Applicable Code Sections</h3>
          <p className="rg-memo__lead">
            Official and code-library URLs surfaced for this jurisdiction. Confirm adoption,
            edition year, and amendments with the Authority Having Jurisdiction before relying on
            them in the field.
          </p>
          {result.source_urls.length ? (
            <ol className="rg-memo__codes">
              {result.source_urls.map((u) => (
                <li key={u}>
                  <a href={u} target="_blank" rel="noreferrer">
                    {u}
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <p className="rg-memo__muted">
              No source URLs were returned for this run. Try a higher results limit or refine job
              context.
            </p>
          )}
        </section>

        <section className="rg-memo__section">
          <h3 className="rg-memo__section-head">Key Requirements</h3>
          {workflowBullets.length > 0 ? (
            <ul className="rg-memo__list">
              {workflowBullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
          {narrative ? (
            <div className="rg-memo__narrative">
              <pre className="rg-memo__pre">{narrative}</pre>
            </div>
          ) : null}
        </section>

        <section className="rg-memo__section">
          <h3 className="rg-memo__section-head">Pro-Tips</h3>
          <ul className="rg-memo__list rg-memo__list--tips">
            <li>
              Confirm which code edition is legally in effect; online indexes may lag adopted
              amendments or local supplements.
            </li>
            <li>
              Keep a dated record (PDFs, permits, inspection approvals) for each code path you rely
              on during the job.
            </li>
            <li>
              When the site spans municipal boundaries, check city and county (or special district)
              rules separately.
            </li>
            {photoTips.map((t, i) => (
              <li key={`photo-tip-${i}-${t.slice(0, 40)}`}>
                <span className="rg-memo__tip-label">From site photo: </span>
                {t}
              </li>
            ))}
          </ul>
        </section>

        {showAppendix && (
          <aside className="rg-memo__appendix">
            <h4 className="rg-memo__subhead">Appendix — research context (verbatim)</h4>
            <pre className="rg-memo__pre rg-memo__pre--sm">{result.enhanced_query.trim()}</pre>
          </aside>
        )}
      </div>

      <footer className="rg-memo__actions rg-no-print">
        <button type="button" className="rg-memo__pdf-btn" onClick={() => window.print()}>
          Download PDF
        </button>
        <p className="rg-memo__pdf-hint">
          Opens print — choose &ldquo;Save as PDF&rdquo; as the destination.
        </p>
      </footer>
    </article>
  );
}

function ResearchResultsSkeleton() {
  return (
    <section
      className="rg-panel rg-skeleton"
      aria-busy="true"
      aria-label="Loading research results"
    >
      <h2>Results</h2>
      <p className="rg-skeleton-hint">Generating compliance research…</p>
      <p className="rg-sect-title">Summary</p>
      <div className="rg-skel-block" />
      <div className="rg-skel-line rg-skel-line--long" />
      <div className="rg-skel-line rg-skel-line--med" />
      <p className="rg-sect-title rg-skeleton-spacing">Official links</p>
      <div className="rg-skel-line rg-skel-line--short" />
      <div className="rg-skel-line rg-skel-line--link" />
      <div className="rg-skel-line rg-skel-line--link" />
    </section>
  );
}

function App() {
  const fileInputId = useId();
  const [zip, setZip] = useState("");
  const [job, setJob] = useState("");
  const [limit, setLimit] = useState(5);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ResearchJson | null>(null);
  const [streamProgress, setStreamProgress] = useState<StreamProgress | null>(null);
  const [listening, setListening] = useState(false);
  const [noSpeech, setNoSpeech] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [locatingZip, setLocatingZip] = useState(false);
  const [locationToast, setLocationToast] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const recRef = useRef<SpeechRecognition | null>(null);
  const prevUrl = useRef<string | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraVideoRef = useRef<HTMLVideoElement | null>(null);
  const locationToastTimerRef = useRef<number | null>(null);
  const memoPrintRef = useRef<HTMLElement | null>(null);

  const showLocationToast = useCallback(
    (kind: "success" | "error", text: string) => {
      if (locationToastTimerRef.current !== null) {
        window.clearTimeout(locationToastTimerRef.current);
        locationToastTimerRef.current = null;
      }
      setLocationToast({ kind, text });
      locationToastTimerRef.current = window.setTimeout(() => {
        setLocationToast(null);
        locationToastTimerRef.current = null;
      }, 4000);
    },
    [],
  );

  useEffect(() => {
    return () => {
      if (locationToastTimerRef.current !== null) {
        window.clearTimeout(locationToastTimerRef.current);
      }
    };
  }, []);

  const locateFromDevice = useCallback(() => {
    if (locatingZip) {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      showLocationToast(
        "error",
        "This browser does not support location. Type your ZIP in the field above.",
      );
      return;
    }
    if (typeof window !== "undefined" && !window.isSecureContext) {
      showLocationToast(
        "error",
        "Location for ZIP detection needs a secure (HTTPS) page. You can type your ZIP in.",
      );
      return;
    }
    setLocatingZip(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const qs = new URLSearchParams({
            latitude: String(latitude),
            longitude: String(longitude),
          });
          const r = await fetch(`/api/geocode-zip?${qs}`);
          const data = (await r.json()) as { zip?: string; detail?: unknown };
          if (r.ok && data.zip) {
            setZip(data.zip);
            showLocationToast("success", "Location detected!");
          } else {
            let msg = "Could not look up a ZIP. Try again or type your ZIP.";
            if (typeof data.detail === "string") {
              msg = data.detail;
            } else if (Array.isArray(data.detail) && data.detail[0]) {
              const f = data.detail[0] as { msg?: string };
              if (typeof f?.msg === "string") {
                msg = f.msg;
              }
            }
            showLocationToast("error", msg);
          }
        } catch {
          showLocationToast(
            "error",
            "Could not look up a ZIP. Try again or type your ZIP.",
          );
        } finally {
          setLocatingZip(false);
        }
      },
      (geoErr: GeolocationPositionError) => {
        setLocatingZip(false);
        if (geoErr.code === 1) {
          showLocationToast(
            "error",
            "Location access is off for this site. You can type your ZIP above, or allow location in your browser settings and try again.",
          );
        } else {
          showLocationToast(
            "error",
            "GPS signal weak—please type your ZIP.",
          );
        }
      },
      { enableHighAccuracy: false, maximumAge: 0, timeout: 10_000 },
    );
  }, [locatingZip, showLocationToast]);

  const stopMic = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (listening) {
      stopMic();
      return;
    }
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      setNoSpeech(true);
      return;
    }
    setNoSpeech(false);
    setErr(null);
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.continuous = false;
    recRef.current = rec;
    rec.onresult = (ev: SpeechRecognitionEvent) => {
      const bit = ev.results[0]?.[0];
      if (bit) {
        const t = (bit.transcript || "").trim();
        if (t) {
          setJob((prev) => (prev ? `${prev.trimEnd()} ${t}` : t));
        }
      }
    };
    rec.onerror = (ev) => {
      if (ev.error !== "aborted" && ev.error !== "not-allowed" && ev.error !== "no-speech") {
        setErr(`Speech: ${ev.error}${ev.message ? ` — ${ev.message}` : ""}`);
      }
    };
    rec.onend = () => {
      setListening(false);
      recRef.current = null;
    };
    try {
      rec.start();
      setListening(true);
    } catch (e) {
      setErr(
        e instanceof Error ? e.message : "Could not start speech recognition.",
      );
      setListening(false);
    }
  }, [listening, stopMic]);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
  };

  useEffect(() => {
    if (prevUrl.current) {
      URL.revokeObjectURL(prevUrl.current);
      prevUrl.current = null;
    }
    if (!file) {
      setPreview(null);
      return;
    }
    const u = URL.createObjectURL(file);
    prevUrl.current = u;
    setPreview(u);
    return () => {
      if (prevUrl.current) {
        URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = null;
      }
    };
  }, [file]);

  const closeCamera = useCallback(() => {
    setCameraOpen(false);
    setVideoReady(false);
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current = null;
    const v = cameraVideoRef.current;
    if (v) {
      v.srcObject = null;
    }
  }, []);

  const openCamera = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErr("Camera is not supported in this browser.");
      return;
    }
    if (!window.isSecureContext) {
      setErr("Camera requires a secure (HTTPS) connection.");
      return;
    }
    setErr(null);
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: true,
        });
      }
      cameraStreamRef.current = stream;
      setVideoReady(false);
      setCameraOpen(true);
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        setErr("Camera access was denied. Allow camera in your browser settings, then try again.");
      } else if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        setErr("No camera was found on this device.");
      } else {
        setErr(
          e instanceof Error ? e.message : "Could not open the camera.",
        );
      }
    }
  }, []);

  useEffect(() => {
    if (!cameraOpen) {
      return;
    }
    const video = cameraVideoRef.current;
    const stream = cameraStreamRef.current;
    if (!video || !stream) {
      return;
    }
    video.playsInline = true;
    video.muted = true;
    setVideoReady(false);
    video.srcObject = stream;
    const play = () => {
      void video.play().catch(() => {});
    };
    const onMeta = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoReady(true);
      }
    };
    video.addEventListener("loadeddata", onMeta);
    video.addEventListener("canplay", play);
    play();
    if (video.readyState >= 2 && video.videoWidth > 0) {
      setVideoReady(true);
    }
    return () => {
      video.removeEventListener("loadeddata", onMeta);
      video.removeEventListener("canplay", play);
      video.srcObject = null;
    };
  }, [cameraOpen]);

  useEffect(() => {
    if (!cameraOpen) {
      return;
    }
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        closeCamera();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cameraOpen, closeCamera]);

  const captureFromCamera = useCallback(() => {
    const video = cameraVideoRef.current;
    if (!video || !videoReady || video.readyState < 2) {
      return;
    }
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    closeCamera();
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          return;
        }
        const f = new File([blob], "camera-capture.jpg", {
          type: "image/jpeg",
        });
        setFile(f);
      },
      "image/jpeg",
      0.92,
    );
  }, [videoReady, closeCamera]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setResult(null);
    setStreamProgress(null);
    if (!/^\d{5}(-\d{4})?$/.test(zip.replace(/\s/g, ""))) {
      setErr("Enter a valid U.S. ZIP (5 digits or ZIP+4).");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("zip_code", zip.replace(/\s/g, ""));
      fd.append("job_description", job);
      fd.append("search_limit", String(limit));
      if (file) {
        fd.append("image", file);
      }
      const r = await fetch("/api/research", { method: "POST", body: fd });
      if (!r.ok) {
        const text = await r.text();
        let msg = "Request failed. Check the API and your keys.";
        try {
          const data = JSON.parse(text) as { detail?: unknown };
          const d = data.detail;
          if (typeof d === "string") {
            msg = d;
          } else if (Array.isArray(d)) {
            msg = d
              .map((i: { msg?: string }) => i?.msg)
              .filter(Boolean)
              .join(" ");
          }
        } catch {
          if (text.trim()) {
            msg = text.slice(0, 500);
          }
        }
        setErr(msg);
        return;
      }
      if (!r.body) {
        setErr("No response body from server.");
        return;
      }
      const reader = r.body.getReader();
      const dec = new TextDecoder();
      let buffer = "";

      type NdjsonEv = {
        event?: string;
        step?: string;
        data?: { results?: { url?: string | null }[] };
        enhanced_query?: string;
        job_description?: string;
        photo_analysis?: string | null;
        zip?: string;
        summary?: string;
        source_urls?: string[];
      };

      const handleNdjsonLine = (rawLine: string): boolean => {
        const line = rawLine.trim();
        if (!line) {
          return true;
        }
        let ev: NdjsonEv;
        try {
          ev = JSON.parse(line) as NdjsonEv;
        } catch {
          setErr("Invalid stream line from server.");
          return false;
        }
        if (ev.event === "context") {
          setStreamProgress((p) => ({
            enhanced_query: String(ev.enhanced_query ?? ""),
            job_description: String(ev.job_description ?? ""),
            photo_analysis: ev.photo_analysis ?? null,
            links: p?.links ?? [],
            stepsDone: p?.stepsDone ?? [],
          }));
        } else if (ev.event === "step" && ev.step) {
          const stepKey = ev.step;
          const title = STEP_TITLE[stepKey] ?? stepKey;
          const rows = ev.data?.results ?? [];
          setStreamProgress((p) => {
            if (!p) {
              return {
                enhanced_query: "",
                job_description: job,
                photo_analysis: null,
                links: appendUrls([], rows),
                stepsDone: [title],
              };
            }
            return {
              ...p,
              links: appendUrls(p.links, rows),
              stepsDone: [...p.stepsDone, title],
            };
          });
        } else if (ev.event === "complete") {
          setResult({
            zip: String(ev.zip ?? ""),
            summary: String(ev.summary ?? ""),
            source_urls: ev.source_urls ?? [],
            enhanced_query: String(ev.enhanced_query ?? ""),
            job_description: String(ev.job_description ?? ""),
            photo_analysis: ev.photo_analysis ?? null,
          });
          setStreamProgress(null);
        }
        return true;
      };

      const drainNewlineDelimitedLines = (): boolean => {
        for (;;) {
          const nl = buffer.indexOf("\n");
          if (nl < 0) {
            break;
          }
          const raw = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (!handleNdjsonLine(raw)) {
            return false;
          }
        }
        return true;
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value?.byteLength) {
          buffer += dec.decode(value, { stream: true });
        }
        if (!drainNewlineDelimitedLines()) {
          return;
        }
        if (done) {
          buffer += dec.decode(new Uint8Array(0), { stream: false });
          if (!drainNewlineDelimitedLines()) {
            return;
          }
          break;
        }
      }

      const tail = buffer.trim();
      if (tail && !handleNdjsonLine(tail)) {
        return;
      }
    } catch (ex) {
      setErr(
        ex instanceof Error ? ex.message : "Network error — is the API running?",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rg-app">
      {locationToast && (
        <div
          className={
            (locationToast.kind === "success"
              ? "rg-toast rg-toast--success"
              : "rg-toast rg-toast--error") + " rg-no-print"
          }
          role={locationToast.kind === "success" ? "status" : "alert"}
          aria-live={locationToast.kind === "success" ? "polite" : "assertive"}
        >
          {locationToast.text}
        </div>
      )}
      <header className="rg-hero rg-no-print">
        <h1>Reg Guard</h1>
        <p>Agentic compliance research — jobsite voice, photo, and code links</p>
      </header>

      <form onSubmit={submit} className="rg-panel rg-no-print" autoComplete="off">
        <h2>Request</h2>
        <div className="rg-row rg-grid-2">
          <div>
            <label className="rg-label" htmlFor="zip">
              ZIP
            </label>
            <div className="rg-wrap-zip">
              <input
                id="zip"
                className="rg-input rg-input--has-locate"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                placeholder="75001"
                inputMode="numeric"
                autoComplete="postal-code"
              />
              <button
                type="button"
                className={`rg-locate${locatingZip ? " locating" : ""}`}
                onClick={locateFromDevice}
                disabled={locatingZip}
                title="Use my location to fill ZIP"
                aria-label="Locate me and fill ZIP code"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M12 2.5V6M12 18v3.5M2.5 12H6M18 12h3.5M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div>
            <label className="rg-label" htmlFor="slim">
              Results / step
            </label>
            <select
              id="slim"
              className="rg-select"
              value={limit}
              onChange={(e) => setLimit(+e.target.value)}
            >
              {[3, 5, 8, 10, 12].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="rg-row">
          <label className="rg-label" htmlFor="job">
            Job description
          </label>
          <div className="rg-wrap-desc">
            <textarea
              id="job"
              className="rg-textarea"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="Describe the work (type or use the mic)…"
            />
            <button
              type="button"
              className={`rg-mic${listening ? " listening" : ""}`}
              onClick={toggleMic}
              title={
                getSpeechCtor()
                  ? "Speech to text (browser)"
                  : "Speech not supported in this browser"
              }
              disabled={!getSpeechCtor()}
              aria-pressed={listening}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
                <path d="M19 11a7 7 0 0 1-14 0H3a8 8 0 0 0 6 7.7V21H8v2h8v-2h-1v-2.3A8 8 0 0 0 21 11h-2z" />
              </svg>
            </button>
          </div>
          {noSpeech && (
            <p className="rg-err" style={{ marginTop: "0.5rem" }}>
              This browser does not support speech recognition. Use Chrome, Edge, or
              Safari.
            </p>
          )}
        </div>
        <div className="rg-row">
          <span className="rg-label">Job site photo (optional)</span>
          <div className="rg-photo-row">
            <label className="rg-drop" htmlFor={fileInputId}>
              <input
                id={fileInputId}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={onFile}
              />
              {file
                ? `Selected: ${file.name}`
                : "Click or drop an image (JPEG, PNG, WebP, GIF)"}
            </label>
            <button
              type="button"
              className="rg-btn-camera"
              onClick={openCamera}
              title="Take a photo with your camera"
              aria-label="Take photo with camera"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden
              >
                <path d="M9 2 7.2 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.2L15 2H9zm3 4a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0 2a3 3 0 1 1 0 6 3 3 0 0 0 0-6z" />
              </svg>
              <span>Take Photo</span>
            </button>
          </div>
          {preview && (
            <div className="rg-preview-wrap">
              <img className="rg-thumb" src={preview} alt="Upload preview" />
              <p style={{ fontSize: "0.8rem", color: "var(--rg-muted)", margin: 0 }}>
                Thumbnail only. Sent to the API for vision analysis.
              </p>
            </div>
          )}
        </div>
        {err && <p className="rg-err">{err}</p>}
        <button className="rg-btn-primary" type="submit" disabled={loading}>
          {loading ? "Researching…" : "Run research"}
        </button>
      </form>

      {loading && !streamProgress && (
        <section className="rg-no-print">
          <ResearchResultsSkeleton />
        </section>
      )}

      {streamProgress && (
        <section
          className="rg-memo rg-memo--draft rg-no-print"
          aria-busy="true"
          aria-label="Research in progress"
        >
          <header className="rg-memo__header">
            <p className="rg-memo__kicker">Technical memorandum (draft)</p>
            <h2 className="rg-memo__title">Research in progress</h2>
            <p className="rg-memo__lead rg-memo__muted">
              Steps:{" "}
              {streamProgress.stepsDone.length
                ? streamProgress.stepsDone.join(" → ")
                : "starting Universal Scout…"}
            </p>
          </header>
          <div className="rg-memo__body">
            <section className="rg-memo__section">
              <h3 className="rg-memo__section-head">Applicable Code Sections</h3>
              {streamProgress.links.length ? (
                <ol className="rg-memo__codes">
                  {streamProgress.links.map((u) => (
                    <li key={u}>
                      <a href={u} target="_blank" rel="noreferrer">
                        {u}
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="rg-memo__muted">Collecting official links…</p>
              )}
            </section>
            {streamProgress.enhanced_query ? (
              <section className="rg-memo__section">
                <h3 className="rg-memo__section-head">Key Requirements</h3>
                <pre className="rg-memo__pre rg-memo__pre--sm">{streamProgress.enhanced_query}</pre>
              </section>
            ) : null}
            {streamProgress.photo_analysis ? (
              <section className="rg-memo__section">
                <h3 className="rg-memo__section-head">Pro-Tips</h3>
                <pre className="rg-memo__pre rg-memo__pre--sm">{streamProgress.photo_analysis}</pre>
              </section>
            ) : null}
          </div>
        </section>
      )}

      {result && <ResearchMemo result={result} memoRef={memoPrintRef} />}

      {cameraOpen && (
        <div
          className="rg-modal-backdrop rg-no-print"
          role="presentation"
          onClick={closeCamera}
        >
          <div
            className="rg-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rg-camera-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="rg-camera-title" className="rg-modal-title">
              Camera
            </h3>
            <div className="rg-camera-preview">
              <video
                ref={cameraVideoRef}
                className="rg-camera-video"
                playsInline
                muted
              />
              {!videoReady && (
                <p className="rg-camera-wait" aria-live="polite">
                  Starting camera…
                </p>
              )}
            </div>
            <div className="rg-modal-actions">
              <button
                type="button"
                className="rg-btn-secondary"
                onClick={closeCamera}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rg-btn-capture"
                onClick={captureFromCamera}
                disabled={!videoReady}
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="rg-footer rg-no-print" role="contentinfo">
        <p>
          Reg Guard is an AI-powered assistant. All information must be verified
          by the contractor using the official links provided. We are not a
          regulatory body.
        </p>
        <p className="rg-credit">
          Voice uses your browser&rsquo;s Speech API; server runs Reg Guard
          research only.
        </p>
      </footer>
    </div>
  );
}

export default App;
