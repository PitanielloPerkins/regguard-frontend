/**
 * Reg Guard — Expert Brain UI: SSE research → Contractor Action Plan, Accept (copy), PDF punch list export.
 * **Hard-sync:** Universal Scout **data fence** (City, ST on every query) + WA-state SERP drop live in `backend/scraper.py`;
 * digest + system prompt enforce **Plano Ord. 250.50** (two 8 ft rods, 20 ft apart — not 6 ft NEC narrative).
 */
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ToastContainer, toast } from "react-toastify";

import "react-toastify/dist/ReactToastify.css";
import "./App.css";

import {
  AddressAutocomplete,
  type AddressAutocompleteHandle,
  mapsAutocompleteEnabled,
  type AddressSelection,
} from "./AddressAutocomplete";
import {
  clearDictationSilenceTimer,
  DICTATION_SILENCE_MS,
  scheduleDictationSilenceStop,
} from "./speech-recognition";
import { downloadActionPlanPdf } from "./downloadActionPlanPdf";

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
  | { event: "reasoning"; phase?: string; text: string }
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

/** Markdown slice for live Universal Scout step payloads shown in the Contractor Action Plan panel. */
function scoutStepDataToMarkdown(stepKey: string, data: unknown): string {
  if (data == null || typeof data !== "object") {
    return "";
  }
  const d = data as Record<string, unknown>;
  const query = typeof d.query === "string" ? d.query.trim() : "";
  const results = Array.isArray(d.results) ? d.results : [];
  const heading =
    stepKey === "step_building_codes"
      ? "### Building codes (live scout)"
      : stepKey === "step_building_permits"
        ? "### Building permits (live scout)"
        : stepKey === "step_jurisdiction"
          ? "### Jurisdiction (live scout)"
          : `### Scout: ${stepKey}`;
  let md = `\n\n${heading}\n\n`;
  if (query) {
    md += `**Query:** ${query}\n\n`;
  }
  if (results.length === 0) {
    md += "_(No results in this batch.)_\n";
    return md;
  }
  for (const hit of results) {
    if (hit == null || typeof hit !== "object") {
      continue;
    }
    const h = hit as Record<string, unknown>;
    const title = typeof h.title === "string" ? h.title.trim() : "";
    const url = typeof h.url === "string" ? h.url.trim() : "";
    if (title && url) {
      md += `- [${title}](${url})\n`;
    } else if (url) {
      md += `- ${url}\n`;
    }
  }
  return md;
}

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

  useEffect(() => {
    const id = "rg-font-inter-roboto";
    if (document.getElementById(id)) {
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Roboto:wght@400;500;700&display=swap";
    document.head.appendChild(link);
  }, []);

  const mapsOk = mapsAutocompleteEnabled();
  const addressRef = useRef<AddressAutocompleteHandle>(null);
  /** When the Places field fires `onSelection` (typing, clearing, or picking), skip applying a stale GPS result. */
  const cancelPendingLocateApplyRef = useRef(false);
  const dictationAnchorRef = useRef("");
  const dictationFinalAccumRef = useRef("");
  const listeningRef = useRef(false);
  const dictationSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const initialRevisionRef = useRef<string | null>(null);
  const lastPollRevisionRef = useRef<string | null>(null);
  const dismissedRevisionRef = useRef<string | null>(null);
  const researchSawChunkRef = useRef(false);
  const researchCompleteRef = useRef(false);
  const researchEpochRef = useRef(0);

  const [selection, setSelection] = useState<AddressSelection | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [searchLimit, setSearchLimit] = useState(5);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<string[]>([]);
  const [visionText, setVisionText] = useState("");
  const [actionPlan, setActionPlan] = useState("");
  const [sourceUrls, setSourceUrls] = useState<string[]>([]);
  const [locatingMe, setLocatingMe] = useState(false);
  const [locateMessage, setLocateMessage] = useState<string | null>(null);
  const [dictationActive, setDictationActive] = useState(false);
  const [speechHint, setSpeechHint] = useState<string | null>(null);
  const [backendStale, setBackendStale] = useState(false);
  const [autoRefreshSec, setAutoRefreshSec] = useState<number | null>(null);
  const [streamBroken, setStreamBroken] = useState(false);
  const sseErrorToastedRef = useRef(false);
  const [sseConnectionLive, setSseConnectionLive] = useState(false);
  const [meta, setMeta] = useState<{
    site?: string | null;
    zip?: string;
    city?: string | null;
    county?: string | null;
  } | null>(null);
  const [planToolbarMsg, setPlanToolbarMsg] = useState<string | null>(null);
  /** Live line from backend Scout/Audit status frames (SSE ``reasoning``). */
  const [reasoningStep, setReasoningStep] = useState<string | null>(null);
  const actionPlanPanelRef = useRef<HTMLDivElement | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  const setJobDescriptionRef = useRef(setJobDescription);
  setJobDescriptionRef.current = setJobDescription;
  const setSpeechHintRef = useRef(setSpeechHint);
  setSpeechHintRef.current = setSpeechHint;
  const setDictationActiveRef = useRef(setDictationActive);
  setDictationActiveRef.current = setDictationActive;

  const canSubmit = useMemo(() => {
    return Boolean(selection?.formattedAddress && selection.zip && !busy);
  }, [selection, busy]);

  /** Subtle reasoning trace above results (live scout / synthesis cues). */
  const agentStatusLine = useMemo(() => {
    const locality =
      (meta?.city && meta?.zip ? `${meta.city}, ${meta.zip}` : null) ||
      (meta?.city
        ? meta.city
        : selection?.formattedAddress
          ? selection.formattedAddress.split(",").slice(0, 2).join(",").trim()
          : null) ||
      "your jurisdiction";

    if (!busy && streamBroken && phase !== "Complete") {
      return "Status — Stream interrupted before completion; partial results may appear below. Try Resume research or New Job.";
    }
    if (busy) {
      if (phase === "Connecting…") {
        return "Status — Connecting to Reg Guard research stream…";
      }
      if (phase === "Started") {
        return "Status — Session started; preparing regional compliance context…";
      }
      if (phase === "Context ready" || phase === "Context ready (photo + job)") {
        return "Status — Job + photo context packaged for Universal Scout…";
      }
      if (phase === "Jurisdiction locked") {
        return `Status — Jurisdiction locked for ${locality} — verifying AHJ path…`;
      }
      if (phase.startsWith("Research: step_jurisdiction")) {
        return `Status — Scouting ${locality} jurisdiction, AHJ hints & trusted municipal sources…`;
      }
      if (phase.startsWith("Research: step_building_permits")) {
        return `Status — Scouting building department & permit portals (${locality})…`;
      }
      if (phase.startsWith("Research: step_building_codes")) {
        return "Status — Analyzing adopted codes, NEC 2023 baseline & local amendment deltas…";
      }
      if (phase === "Writing Contractor Action Plan") {
        return "Status — Synthesizing Master Electrician punch list (fees, technical gotchas, inspections)…";
      }
      if (phase === "Analyzing photo") {
        return "Status — Analyzing job-site photo with vision model…";
      }
      if (phase.startsWith("Research:")) {
        const rest = phase.slice("Research: ".length).trim();
        return `Status — Research pipeline: ${rest}`;
      }
      return phase ? `Status — ${phase}` : "Status — Working…";
    }
    if (phase === "Complete") {
      return "Status — Research complete. Confirm fees, codes, and scope with your AHJ before mobilizing.";
    }
    return null;
  }, [busy, phase, meta, selection, streamBroken]);

  const resetOutput = useCallback(() => {
    setError(null);
    setPhase("");
    setSteps([]);
    setVisionText("");
    setActionPlan("");
    setSourceUrls([]);
    setMeta(null);
    setStreamBroken(false);
    setPlanToolbarMsg(null);
    setSseConnectionLive(false);
    setReasoningStep(null);
  }, []);

  const handleNewJob = useCallback(() => {
    researchEpochRef.current += 1;
    researchSawChunkRef.current = false;
    researchCompleteRef.current = false;
    sseErrorToastedRef.current = false;
    cancelPendingLocateApplyRef.current = true;

    listeningRef.current = false;
    clearDictationSilenceTimer(dictationSilenceTimerRef);
    dictationAnchorRef.current = "";
    dictationFinalAccumRef.current = "";
    try {
      recognitionRef.current?.stop();
    } catch {
      try {
        recognitionRef.current?.abort();
      } catch {
        /* noop */
      }
    }
    setDictationActive(false);
    setSpeechHint(null);
    setLocatingMe(false);

    setSelection(null);
    setJobDescription("");
    setImageFile(null);
    setSearchLimit(5);
    setLocateMessage(null);
    setBusy(false);
    resetOutput();
    addressRef.current?.clearForNewJob();
    setFileInputKey((k) => k + 1);

    window.requestAnimationFrame(() => {
      cancelPendingLocateApplyRef.current = false;
      const el = actionPlanPanelRef.current;
      if (el && typeof el.scrollTop === "number") {
        el.scrollTop = 0;
      }
    });

    toast.info("New job — workspace cleared.", { autoClose: 2200, hideProgressBar: true });
  }, [resetOutput]);

  const handleRefreshApp = useCallback(() => {
    window.location.reload();
  }, []);

  const runResearch = useCallback(async () => {
    if (!selection) {
      return;
    }
    resetOutput();
    setStreamBroken(false);
    researchSawChunkRef.current = false;
    researchCompleteRef.current = false;
    const epochAtStart = researchEpochRef.current;
    sseErrorToastedRef.current = false;
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
      await fetchEventSource("/api/research", {
        method: "POST",
        body: form,
        /** Long runs (Firecrawl + Claude); keep streaming while tab is in background. */
        openWhenHidden: true,
        cache: "no-store",
        async onopen(response) {
          if (!response.ok) {
            const detail = await detailFromBadResponse(response);
            toast.error(
              `Research failed to start (HTTP ${response.status}). ${detail.length > 220 ? `${detail.slice(0, 220)}…` : detail}`,
            );
            console.error("[RegGuard research] HTTP error", response.status, detail);
            throw new Error(detail);
          }
          setSseConnectionLive(true);
          toast.success("Connection active", {
            autoClose: 2000,
            hideProgressBar: true,
          });
          const ct = response.headers.get("content-type") ?? "";
          if (!ct.toLowerCase().includes("text/event-stream")) {
            console.warn("[RegGuard research] expected text/event-stream; got:", ct);
          }
        },
        onmessage(ev) {
          console.log("Stream chunk:", ev.data);
          const raw = typeof ev.data === "string" ? ev.data : "";
          if (!raw.trim()) {
            return;
          }
          researchSawChunkRef.current = true;

          let payload: Record<string, unknown>;
          try {
            payload = JSON.parse(raw) as Record<string, unknown>;
          } catch {
            if (researchEpochRef.current !== epochAtStart) {
              return;
            }
            setActionPlan((p) => (p ? `${p}\n\n` : "") + raw);
            return;
          }

          if (researchEpochRef.current !== epochAtStart) {
            return;
          }

          const appendToActionPlan = (text: string) => {
            if (researchEpochRef.current !== epochAtStart) {
              return;
            }
            const t = text.trim();
            if (!t) {
              return;
            }
            setActionPlan((p) => (p ? `${p}\n\n` : "") + t);
          };

          const eventName = payload.event;
          if (typeof eventName !== "string") {
            const s = payload.summary;
            if (typeof s === "string" && s.trim()) {
              appendToActionPlan(s);
            } else {
              appendToActionPlan(raw);
            }
            return;
          }

          const topSummary = payload.summary;
          if (
            typeof topSummary === "string" &&
            topSummary.trim() &&
            eventName !== "complete" &&
            eventName !== "summary_delta"
          ) {
            appendToActionPlan(topSummary);
          }

          switch (eventName) {
            case "open":
              setPhase("Started");
              break;
            case "heartbeat":
              setPhase((p) =>
                p.startsWith("Research:") || p === "Writing Contractor Action Plan"
                  ? p
                  : "Research scan in progress…",
              );
              break;
            case "vision_delta": {
              const vt = typeof payload.text === "string" ? payload.text : "";
              setPhase("Analyzing photo");
              setVisionText((prev) => prev + vt);
              break;
            }
            case "context": {
              const pa = payload.photo_analysis;
              setPhase(
                pa != null && String(pa).trim()
                  ? "Context ready (photo + job)"
                  : "Context ready",
              );
              break;
            }
            case "jurisdiction": {
              setPhase("Jurisdiction locked");
              const site = payload.site_address;
              const prof = payload.profile;
              if (site != null || prof != null) {
                setMeta((m) => ({
                  ...m,
                  site: typeof site === "string" ? site : m?.site,
                }));
              }
              break;
            }
            case "reasoning": {
              const line = typeof payload.text === "string" ? payload.text.trim() : "";
              if (line) {
                setReasoningStep(line);
              }
              break;
            }
            case "step": {
              const name = typeof payload.step === "string" ? payload.step : "step";
              setPhase(`Research: ${name}`);
              setSteps((s) =>
                s.includes(name) ? s : [...s, name],
              );
              if (
                name === "step_building_codes" ||
                name === "step_building_permits" ||
                name === "step_jurisdiction"
              ) {
                appendToActionPlan(scoutStepDataToMarkdown(name, payload.data));
              }
              break;
            }
            case "summary_delta": {
              const piece = typeof payload.text === "string" ? payload.text : "";
              if (!piece) {
                console.warn("[RegGuard research] summary_delta missing text", payload);
                break;
              }
              setPhase("Writing Contractor Action Plan");
              appendToActionPlan(piece);
              break;
            }
            case "complete": {
              researchCompleteRef.current = true;
              setStreamBroken(false);
              setPhase("Complete");
              setReasoningStep(null);
              const fin = typeof payload.summary === "string" ? payload.summary : "";
              if (fin.trim()) {
                setActionPlan(fin);
              }
              const urls = payload.source_urls;
              if (Array.isArray(urls)) {
                setSourceUrls(urls.filter((u): u is string => typeof u === "string"));
              }
              setMeta({
                site: typeof payload.site_address === "string" ? payload.site_address : undefined,
                zip: typeof payload.zip === "string" ? payload.zip : undefined,
                city: typeof payload.city === "string" ? payload.city : undefined,
                county: typeof payload.county === "string" ? payload.county : undefined,
              });
              break;
            }
            case "error": {
              const msg = typeof payload.message === "string" ? payload.message : "Unknown error";
              console.error("[RegGuard research] server error event", msg);
              throw new Error(msg);
            }
            default:
              console.warn("[RegGuard research] unknown SSE event shape", payload);
              break;
          }
        },
        onclose() {
          setSseConnectionLive(false);
          console.info("[RegGuard research] SSE connection closed");
        },
        onerror(err) {
          setSseConnectionLive(false);
          const msg = err instanceof Error ? err.message : String(err);
          const stack = err instanceof Error ? (err.stack ?? "") : "";
          sseErrorToastedRef.current = true;
          toast.error("Connection interrupted. Retrying...");
          console.error("[RegGuard research] SSE transport error (not retrying)", err, stack.slice(0, 800));
          throw err;
        },
      });

      if (
        researchEpochRef.current === epochAtStart &&
        researchSawChunkRef.current &&
        !researchCompleteRef.current
      ) {
        console.error("[RegGuard research] stream ended without complete event");
        setStreamBroken(true);
        setError((prev) => prev ?? "Research stream ended before completion.");
      }
    } catch (e) {
      const isAbort =
        e instanceof DOMException
          ? e.name === "AbortError"
          : e instanceof Error && e.name === "AbortError";
      if (researchEpochRef.current !== epochAtStart) {
        sseErrorToastedRef.current = false;
        return;
      }
      if (isAbort) {
        console.info("[RegGuard research] aborted");
        setError("Research was canceled.");
        setPhase("");
        if (researchSawChunkRef.current && !researchCompleteRef.current) {
          setStreamBroken(true);
        }
      } else {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[RegGuard research] failed", e);
        if (!sseErrorToastedRef.current) {
          toast.error(msg.length > 180 ? `${msg.slice(0, 180)}…` : msg);
        } else {
          sseErrorToastedRef.current = false;
        }
        setError(msg);
        setPhase("");
        if (researchSawChunkRef.current && !researchCompleteRef.current) {
          setStreamBroken(true);
        }
      }
    } finally {
      setBusy(false);
      setSseConnectionLive(false);
    }
  }, [selection, jobDescription, searchLimit, imageFile, resetOutput]);

  const geolocationReadOptions = useMemo<PositionOptions>(
    () => ({
      enableHighAccuracy: true,
      /** Fast fail; combined with maximumAge 0 to push a fresh hardware fix on Mac. */
      timeout: 5_000,
      maximumAge: 0,
    }),
    [],
  );

  const onAddressSelection = useCallback((sel: AddressSelection | null) => {
    cancelPendingLocateApplyRef.current = true;
    setSelection(sel);
  }, []);

  const runDeviceLocate = useCallback(
    (recenter: boolean) => {
      setLocateMessage(null);
      if (!geoSupported || !mapsOk) {
        return;
      }
      const typed = (addressRef.current?.getInputValue() ?? "").trim();
      if (!selection && typed) {
        setLocateMessage(
          "Choose an address from the suggestions list, or clear the field to use Locate Me / Recenter.",
        );
        return;
      }
      cancelPendingLocateApplyRef.current = false;
      setLocatingMe(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (cancelPendingLocateApplyRef.current) {
            setLocateMessage(
              "Address field changed before GPS finished — location not applied. Adjust the text or pick from the list, or try Locate / Recenter again.",
            );
            setLocatingMe(false);
            return;
          }
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            const q = new URLSearchParams({
              latitude: String(lat),
              longitude: String(lon),
            });
            if (recenter) {
              q.set("_", String(Date.now()));
            }
            const res = await fetch(`/api/reverse-geocode-address?${q}`, {
              method: "GET",
              cache: "no-store",
            });
            if (cancelPendingLocateApplyRef.current) {
              setLocateMessage(
                "Address field changed while resolving location — location not applied.",
              );
              setLocatingMe(false);
              return;
            }
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
            if (cancelPendingLocateApplyRef.current) {
              setLocateMessage(
                "Address field changed before geocode finished — location not applied.",
              );
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
        geolocationReadOptions,
      );
    },
    [geoSupported, mapsOk, geolocationReadOptions, selection],
  );

  const handleLocateMe = useCallback(() => runDeviceLocate(false), [runDeviceLocate]);
  const handleRecenter = useCallback(() => runDeviceLocate(true), [runDeviceLocate]);

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

      scheduleDictationSilenceStop({
        timerRef: dictationSilenceTimerRef,
        silenceMs: DICTATION_SILENCE_MS,
        isListening: () => listeningRef.current,
        stopRecognition: () => {
          listeningRef.current = false;
          const r = recognitionRef.current;
          if (!r) {
            return;
          }
          try {
            r.stop();
          } catch {
            try {
              r.abort();
            } catch {
              /* noop */
            }
          }
        },
        onSilenceStop: () => {
          setDictationActiveRef.current(false);
          setSpeechHintRef.current("Processing…");
        },
      });
    };

    rec.onerror = (ev) => {
      clearDictationSilenceTimer(dictationSilenceTimerRef);
      if (ev.error === "audio-capture" || ev.error === "not-allowed") {
        toast.error(
          `Speech recognition: ${ev.error}. ${(ev.message && String(ev.message).trim()) || "Microphone unavailable or blocked for this site."}`,
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
      clearDictationSilenceTimer(dictationSilenceTimerRef);
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

  const handleReviewActionPlan = useCallback(() => {
    const el = actionPlanPanelRef.current;
    if (!el) {
      return;
    }
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.remove("rg-plan-panel--pulse");
    void el.offsetWidth;
    el.classList.add("rg-plan-panel--pulse");
    window.setTimeout(() => el.classList.remove("rg-plan-panel--pulse"), 1400);
  }, []);

  const handleAcceptActionPlan = useCallback(async () => {
    const t = actionPlan.trim();
    if (!t) {
      setPlanToolbarMsg("Nothing to copy yet — run research or wait for the plan to finish streaming.");
      window.setTimeout(() => setPlanToolbarMsg(null), 4000);
      return;
    }
    try {
      await navigator.clipboard.writeText(t);
      setPlanToolbarMsg("Copied action plan to clipboard.");
      window.setTimeout(() => setPlanToolbarMsg(null), 3500);
    } catch {
      toast.error("Could not copy — your browser blocked clipboard access.");
    }
  }, [actionPlan]);

  const handleDownloadPunchListPdf = useCallback(() => {
    const md = actionPlan.trim();
    if (!md) {
      setPlanToolbarMsg("Nothing to export — run research or wait for the plan to finish streaming.");
      window.setTimeout(() => setPlanToolbarMsg(null), 4000);
      return;
    }
    try {
      downloadActionPlanPdf({
        markdown: md,
        siteAddress: meta?.site ?? selection?.formattedAddress ?? null,
        zip: meta?.zip ?? selection?.zip ?? null,
        city: meta?.city ?? null,
        county: meta?.county ?? null,
      });
      setPlanToolbarMsg("Punch list PDF downloaded.");
      window.setTimeout(() => setPlanToolbarMsg(null), 3500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(`Could not generate PDF: ${msg}`);
    }
  }, [actionPlan, meta, selection]);

  const dismissBackendNotice = useCallback(() => {
    dismissedRevisionRef.current = lastPollRevisionRef.current;
    setBackendStale(false);
  }, []);

  const voiceMicProcessing = speechHint === "Processing…";

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
      clearDictationSilenceTimer(dictationSilenceTimerRef);
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
        scheduleDictationSilenceStop({
          timerRef: dictationSilenceTimerRef,
          silenceMs: DICTATION_SILENCE_MS,
          isListening: () => listeningRef.current,
          stopRecognition: () => {
            listeningRef.current = false;
            const r = recognitionRef.current;
            if (!r) {
              return;
            }
            try {
              r.stop();
            } catch {
              try {
                r.abort();
              } catch {
                /* noop */
              }
            }
          },
          onSilenceStop: () => {
            setDictationActive(false);
            setSpeechHint("Processing…");
          },
        });
      } catch {
        listeningRef.current = false;
        setSpeechHint("Could not start the microphone. Confirm permissions and try again.");
        setDictationActive(false);
      }
    })();
  }, [jobDescription, speechCtor]);

  return (
    <div className="app-shell">
      <header
        className="app-header"
        style={{ fontFamily: "'Inter', 'Roboto', system-ui, sans-serif" }}
      >
        <div>
          <h1 className="app-title">Reg Guard</h1>
          <p className="app-tagline">
            Compliance research for U.S. job sites — pick an address, describe the scope, optionally
            add a photo, then stream jurisdiction and a Contractor Action Plan (SSE) from the API on port
            8000 (proxied via <code>/api</code>).
          </p>
        </div>
        <div className="app-header-actions">
          <button
            type="button"
            className="rg-btn rg-btn--ghost"
            style={{
              fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
              fontWeight: 600,
            }}
            onClick={handleNewJob}
          >
            New Job
          </button>
          <button
            type="button"
            className="rg-btn rg-btn--ghost app-header-refresh"
            style={{
              fontFamily: "'Inter', 'Roboto', system-ui, sans-serif",
              fontWeight: 600,
            }}
            title="Reload the app from the server (clears all browser state)"
            onClick={handleRefreshApp}
          >
            Refresh
          </button>
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
                  onSelection={onAddressSelection}
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
              <button
                type="button"
                className="rg-btn rg-btn--ghost rg-recenter-btn"
                title="Recenter: fresh high-accuracy GPS and bypass cached geocode responses"
                aria-label="Recenter with high-accuracy GPS"
                disabled={busy || locatingMe || !mapsOk || !geoSupported}
                onClick={() => handleRecenter()}
              >
                Recenter
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
                className={`rg-btn rg-btn--ghost rg-mic-btn${dictationActive ? " rg-mic-btn--active" : ""}${voiceMicProcessing ? " rg-mic-btn--processing" : ""}`}
                title={
                  dictationActive ? "Listening (stops after 6s silence)" :
                    voiceMicProcessing ? "Processing…" :
                      "Dictate with microphone"
                }
                aria-label={
                  dictationActive ? "Stop voice dictation" :
                    voiceMicProcessing ? "Voice processing" :
                      "Start voice dictation"
                }
                aria-pressed={dictationActive}
                disabled={busy || !speechSupported}
                onClick={() => toggleDictation()}
              >
                {dictationActive ? (
                  <span className="rg-mic-pulse" aria-hidden />
                ) : voiceMicProcessing ? (
                  <span className="rg-mic-processing-label" aria-hidden>
                    ⋯
                  </span>
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
              key={fileInputKey}
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

        <section className="rg-panel rg-results-panel">
          <h2>Results</h2>

          {reasoningStep ? (
            <p className="rg-reasoning-step" aria-live="polite">
              <span className="rg-reasoning-step__label">Reasoning:</span> {reasoningStep}
            </p>
          ) : null}

          {!busy && agentStatusLine ? (
            <p className="rg-agent-status" aria-live="polite">
              {agentStatusLine}
            </p>
          ) : null}

          {busy ? (
            <div className="rg-phase" aria-live="polite">
              <span className="rg-dot-pulse" aria-hidden />
              <span className="rg-phase-primary">{agentStatusLine || phase}</span>
              {sseConnectionLive ? (
                <span className="rg-sse-live" title="Event stream connected">
                  <span className="rg-sse-live__dot" aria-hidden />
                  Connection active
                </span>
              ) : null}
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

          <div id="contractor-action-plan">
            <div className="rg-action-plan-header">
              <strong className="rg-subheading">Contractor action plan</strong>
              <span className="rg-plan-actions">
                <button
                  id="rg-expert-accept-plan"
                  type="button"
                  className="rg-btn rg-btn--primary rg-btn--compact rg-plan-action-btn rg-plan-action-btn--accept"
                  title="Copy the full Contractor Action Plan to your clipboard"
                  onClick={() => void handleAcceptActionPlan()}
                >
                  Accept
                </button>
                <button
                  type="button"
                  className="rg-btn rg-btn--ghost rg-btn--compact rg-plan-action-btn rg-plan-action-btn--pdf"
                  title="Download the punch list as a printable PDF"
                  onClick={handleDownloadPunchListPdf}
                >
                  Download Punch List as PDF
                </button>
                <button
                  type="button"
                  className="rg-btn rg-btn--ghost rg-btn--compact rg-plan-action-btn"
                  title="Scroll to the plan and highlight this panel"
                  onClick={handleReviewActionPlan}
                >
                  Review
                </button>
              </span>
            </div>
            {planToolbarMsg ? (
              <div className="rg-plan-toolbar-msg" role="status">
                {planToolbarMsg}
              </div>
            ) : null}
            <div ref={actionPlanPanelRef} className="rg-summary rg-summary--md">
              {actionPlan.trim() ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{actionPlan}</ReactMarkdown>
              ) : (
                <p className="rg-plan-placeholder">Results will stream here during research.</p>
              )}
            </div>
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
                Reload now
              </button>
              <button type="button" className="rg-btn rg-btn--ghost rg-btn--compact" onClick={dismissBackendNotice}>
                Dismiss
              </button>
            </span>
          </div>
        </div>
      ) : null}
      <ToastContainer
        position="top-right"
        theme="dark"
        autoClose={3200}
        closeOnClick={false}
        newestOnTop
        pauseOnHover
        limit={5}
      />
    </div>
  );
}
