/**
 * Reg Guard — Expert Brain UI: SSE research → Contractor Action Plan, Accept (copy), PDF punch list export.
 * **Hard-sync:** Universal Scout **data fence** (City, ST on every query) + WA-state SERP drop live in `backend/scraper.py`;
 * digest + system prompt enforce **Plano Ord. 250.50** (two 8 ft grounding rods, 20 ft apart, 2/0 AWG between rods — not 6 ft NEC narrative).
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
import { downloadActionPlanPdf, downloadPermitPackagePdf } from "./downloadActionPlanPdf";
import {
  deriveProactiveFollowUps,
  FollowUpActions,
  type FollowUpChip,
} from "./FollowUpActions";

/** Gemini Reality Capture Audit payload (SSE ``visual_audit`` / ``complete``). */
export type VisualDetection = {
  label: string;
  box_2d: [number, number, number, number];
  status?: "ok" | "violation" | "unknown";
};

export type VisualAuditPayload = {
  image_width: number;
  image_height: number;
  detections: VisualDetection[];
  model_id?: string;
  austin_clearance?: {
    applies?: boolean;
    edge_distance_px?: number | null;
    estimated_clearance_inches?: number | null;
    violates_36_in_rule?: boolean | null;
    notes?: string;
    trigger_zip?: string | null;
    gas_meter_detected_for_trigger?: boolean;
  };
};

function parseVisualAuditPayload(v: unknown): VisualAuditPayload | null {
  if (v == null || typeof v !== "object") {
    return null;
  }
  const o = v as Record<string, unknown>;
  const w = o.image_width;
  const h = o.image_height;
  const dets = o.detections;
  if (typeof w !== "number" || typeof h !== "number" || !Array.isArray(dets)) {
    return null;
  }
  return v as VisualAuditPayload;
}

type FutureRiskHit = {
  step?: string;
  title?: string;
  url?: string;
  snippet?: string;
};

type FutureRiskAlertPayload = {
  active: boolean;
  banner?: string;
  severity?: string;
  hits?: FutureRiskHit[];
  notes?: string;
};

function parseFutureRiskPayload(v: unknown): FutureRiskAlertPayload | null {
  if (v == null || typeof v !== "object") {
    return null;
  }
  const o = v as Record<string, unknown>;
  if (o.active === false) {
    return { active: false, hits: [] };
  }
  if (o.active !== true) {
    return null;
  }
  const hitsRaw = o.hits;
  const hits: FutureRiskHit[] = [];
  if (Array.isArray(hitsRaw)) {
    for (const h of hitsRaw) {
      if (h != null && typeof h === "object") {
        const hr = h as Record<string, unknown>;
        hits.push({
          step: typeof hr.step === "string" ? hr.step : undefined,
          title: typeof hr.title === "string" ? hr.title : undefined,
          url: typeof hr.url === "string" ? hr.url : undefined,
          snippet: typeof hr.snippet === "string" ? hr.snippet : undefined,
        });
      }
    }
  }
  return {
    active: true,
    banner: typeof o.banner === "string" ? o.banner : "FUTURE RISK ALERT",
    severity: typeof o.severity === "string" ? o.severity : undefined,
    hits,
    notes: typeof o.notes === "string" ? o.notes : undefined,
  };
}

type CommunityInspectorNote = { text: string; created_at?: string };

type CommunityInspectorFeedbackPayload = { zip: string; notes: CommunityInspectorNote[] };

function parseCommunityInspectorNotesPayload(
  zip: string,
  notesUnknown: unknown,
): CommunityInspectorFeedbackPayload | null {
  const z = zip.trim();
  if (!z || !Array.isArray(notesUnknown)) {
    return null;
  }
  const notes: CommunityInspectorNote[] = [];
  for (const n of notesUnknown) {
    if (n == null || typeof n !== "object") {
      continue;
    }
    const rec = n as Record<string, unknown>;
    const text = typeof rec.text === "string" ? rec.text.trim() : "";
    if (!text) {
      continue;
    }
    notes.push({
      text,
      created_at: typeof rec.created_at === "string" ? rec.created_at : undefined,
    });
  }
  if (!notes.length) {
    return null;
  }
  return { zip: z, notes };
}

type MaintenanceSubscription = {
  id: string;
  project_name: string;
  zip: string;
  site_address?: string;
  sensor_profile?: string;
  alert_threshold_note?: string;
  maintenance_mode_enabled?: boolean;
  created_at?: string;
  ai_evaluation_note?: string;
};

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
          : stepKey === "step_federal_fast41"
            ? "### Federal FAST-41 permitting (live scout)"
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
  const [tradeElectrician, setTradeElectrician] = useState(true);
  const [tradePlumber, setTradePlumber] = useState(false);
  const [tradeHvac, setTradeHvac] = useState(false);
  const [missionCriticalDc, setMissionCriticalDc] = useState(true);
  const [scoutVertical, setScoutVertical] = useState<"building" | "infrastructure" | "data_center">(
    "building",
  );
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
    ahjLabel?: string | null;
  } | null>(null);
  const [planToolbarMsg, setPlanToolbarMsg] = useState<string | null>(null);
  /** Live line from backend Scout/Audit status frames (SSE ``reasoning``). */
  const [reasoningStep, setReasoningStep] = useState<string | null>(null);
  const actionPlanPanelRef = useRef<HTMLDivElement | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [visualAudit, setVisualAudit] = useState<VisualAuditPayload | null>(null);
  const [futureRiskAlert, setFutureRiskAlert] = useState<FutureRiskAlertPayload | null>(null);
  const [communityInspectorFeedback, setCommunityInspectorFeedback] =
    useState<CommunityInspectorFeedbackPayload | null>(null);
  const [inspectorNoteModalOpen, setInspectorNoteModalOpen] = useState(false);
  const [inspectorNoteDraft, setInspectorNoteDraft] = useState("");
  const [inspectorNoteSaving, setInspectorNoteSaving] = useState(false);
  const [resultsTab, setResultsTab] = useState<"plan" | "visual">("plan");
  const [photoObjectUrl, setPhotoObjectUrl] = useState<string | null>(null);
  const [maintenanceSubs, setMaintenanceSubs] = useState<MaintenanceSubscription[]>([]);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [maintProjectName, setMaintProjectName] = useState("");
  const [maintAlertNote, setMaintAlertNote] = useState("");
  const [maintSensorProfile, setMaintSensorProfile] = useState("thermal_vibration");
  const [maintSaving, setMaintSaving] = useState(false);
  const [bimBridgeReport, setBimBridgeReport] = useState<Record<string, unknown> | null>(null);
  const [bimImportBusy, setBimImportBusy] = useState(false);
  const [bimJsonDraft, setBimJsonDraft] = useState("");
  /** Aggregate of ``summary_delta`` chunks for Proactive Guide (avoids scout-step noise in heuristics). */
  const [proactiveSummaryBuffer, setProactiveSummaryBuffer] = useState("");

  const refreshMaintenanceSubs = useCallback(async () => {
    setMaintenanceLoading(true);
    try {
      const r = await fetch("/api/maintenance/subscriptions");
      if (!r.ok) {
        return;
      }
      const j = (await r.json()) as { subscriptions?: unknown };
      const raw = j.subscriptions;
      setMaintenanceSubs(Array.isArray(raw) ? (raw as MaintenanceSubscription[]) : []);
    } finally {
      setMaintenanceLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMaintenanceSubs();
  }, [refreshMaintenanceSubs]);

  useEffect(() => {
    fetch("/api/finops-cache", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (j && typeof j === "object") {
          console.info("[RegGuard FinOps — caches]", j);
        }
      })
      .catch(() => {
        /* ignore offline / CORS during static preview */
      });
  }, []);

  const setJobDescriptionRef = useRef(setJobDescription);
  setJobDescriptionRef.current = setJobDescription;
  const setSpeechHintRef = useRef(setSpeechHint);
  setSpeechHintRef.current = setSpeechHint;
  const setDictationActiveRef = useRef(setDictationActive);
  setDictationActiveRef.current = setDictationActive;

  const canSubmit = useMemo(() => {
    return Boolean(selection?.formattedAddress && selection.zip && !busy);
  }, [selection, busy]);

  const followUpSourceText = useMemo(() => {
    const stream = proactiveSummaryBuffer.trim();
    if (stream.length >= 40) {
      return stream;
    }
    if (phase === "Complete" && actionPlan.trim().length > 120) {
      return actionPlan;
    }
    return "";
  }, [proactiveSummaryBuffer, phase, actionPlan]);

  const followUpSuggestions = useMemo(
    () => (followUpSourceText ? deriveProactiveFollowUps(followUpSourceText, jobDescription) : []),
    [followUpSourceText, jobDescription],
  );

  useEffect(() => {
    if (!imageFile) {
      setPhotoObjectUrl((prev) => {
        if (prev) {
          URL.revokeObjectURL(prev);
        }
        return null;
      });
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setPhotoObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

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
      if (phase.startsWith("Research: step_federal_fast41")) {
        return "Status — Scanning FAST-41 / federal permitting status cues (Infrastructure or Data Center vertical)…";
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
    setVisualAudit(null);
    setFutureRiskAlert(null);
    setCommunityInspectorFeedback(null);
    setInspectorNoteModalOpen(false);
    setInspectorNoteDraft("");
    setInspectorNoteSaving(false);
    setResultsTab("plan");
    setProactiveSummaryBuffer("");
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
    setTradeElectrician(true);
    setTradePlumber(false);
    setTradeHvac(false);
    setMissionCriticalDc(true);
    setScoutVertical("building");
    setLocateMessage(null);
    setBusy(false);
    resetOutput();
    addressRef.current?.clearForNewJob();
    setFileInputKey((k) => k + 1);
    setBimBridgeReport(null);
    setBimJsonDraft("");

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

  const handleSubmitInspectorNote = useCallback(async () => {
    if (!selection?.zip) {
      toast.error("Select a job site with a ZIP first.");
      return;
    }
    const t = inspectorNoteDraft.trim();
    if (!t) {
      toast.error("Enter a short inspector note.");
      return;
    }
    setInspectorNoteSaving(true);
    try {
      const form = new FormData();
      form.append("zip_code", selection.zip);
      form.append("text", t);
      const res = await fetch("/api/community-gotchas", { method: "POST", body: form });
      if (!res.ok) {
        const detail = await detailFromBadResponse(res);
        toast.error(detail.length > 220 ? `${detail.slice(0, 220)}…` : detail);
        return;
      }
      toast.success("Inspector note saved for this ZIP. It will appear on the next research run.", {
        autoClose: 3800,
        hideProgressBar: true,
      });
      setInspectorNoteModalOpen(false);
      setInspectorNoteDraft("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save note.");
    } finally {
      setInspectorNoteSaving(false);
    }
  }, [inspectorNoteDraft, selection?.zip]);

  const handleCreateMaintenanceSubscription = useCallback(async () => {
    if (!maintProjectName.trim()) {
      toast.error("Enter a project name.");
      return;
    }
    const zip = selection?.zip?.trim();
    if (!zip) {
      toast.error("Select a job site with a ZIP first.");
      return;
    }
    setMaintSaving(true);
    try {
      const form = new FormData();
      form.append("project_name", maintProjectName.trim());
      form.append("zip_code", zip);
      form.append("site_address", selection?.formattedAddress ?? "");
      form.append("sensor_profile", maintSensorProfile);
      form.append("alert_threshold_note", maintAlertNote.trim());
      form.append("maintenance_mode_enabled", "true");
      const res = await fetch("/api/maintenance/subscriptions", { method: "POST", body: form });
      if (!res.ok) {
        const detail = await detailFromBadResponse(res);
        toast.error(detail.length > 200 ? `${detail.slice(0, 200)}…` : detail);
        return;
      }
      toast.success("Maintenance Mode subscription saved.");
      setMaintProjectName("");
      setMaintAlertNote("");
      await refreshMaintenanceSubs();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save subscription.");
    } finally {
      setMaintSaving(false);
    }
  }, [
    maintProjectName,
    maintAlertNote,
    maintSensorProfile,
    selection?.zip,
    selection?.formattedAddress,
    refreshMaintenanceSubs,
  ]);

  const handleToggleMaintenanceMode = useCallback(
    async (id: string, enabled: boolean) => {
      try {
        const res = await fetch(`/api/maintenance/subscriptions/${encodeURIComponent(id)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maintenance_mode_enabled: enabled }),
        });
        if (!res.ok) {
          const detail = await detailFromBadResponse(res);
          toast.error(detail.length > 220 ? `${detail.slice(0, 220)}…` : detail);
          return;
        }
        toast.success(enabled ? "Maintenance Mode on" : "Maintenance Mode paused", {
          autoClose: 2200,
          hideProgressBar: true,
        });
        await refreshMaintenanceSubs();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Update failed.");
      }
    },
    [refreshMaintenanceSubs],
  );

  const handleBimImport = useCallback(async () => {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(bimJsonDraft) as Record<string, unknown>;
    } catch {
      toast.error("BIM JSON is not valid.");
      return;
    }
    setBimImportBusy(true);
    try {
      const res = await fetch("/api/bim/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });
      if (!res.ok) {
        const detail = await detailFromBadResponse(res);
        toast.error(detail.length > 240 ? `${detail.slice(0, 240)}…` : detail);
        return;
      }
      const report = (await res.json()) as Record<string, unknown>;
      setBimBridgeReport(report);
      const clashes = report.clash_zones;
      const n = Array.isArray(clashes) ? clashes.length : 0;
      toast.success(
        n > 0
          ? `BIM import: ${n} Austin gas/conduit clash zone(s) — will merge into the next research for this ZIP.`
          : "BIM import complete — cross-referenced to Universal Scout archive.",
        { autoClose: 4200, hideProgressBar: true },
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "BIM import failed.");
    } finally {
      setBimImportBusy(false);
    }
  }, [bimJsonDraft]);

  const loadSampleBimJson = useCallback(() => {
    setBimJsonDraft(
      JSON.stringify(
        {
          zip: "78704",
          project: {
            name: "RegGuard BIM sample",
            city: "Austin",
            state: "TX",
            zip: "78704",
            units: "ft",
          },
          elements: [
            {
              id: "c-demo-1",
              category: "Conduits",
              family: "EMT",
              curve: { start: [0, 0, 0], end: [2.5, 0, 0] },
            },
            {
              id: "g-demo-1",
              category: "Mechanical Equipment",
              family: "Gas Meter",
              location: [2.4, 0, 0],
            },
          ],
        },
        null,
        2,
      ),
    );
  }, []);

  const runResearch = useCallback(async (launchOpts?: {
    followUpAppend?: string;
    tradeBoost?: FollowUpChip["tradeBoost"];
    vertical?: FollowUpChip["vertical"];
    missionCritical?: FollowUpChip["missionCritical"];
  }) => {
    if (!selection) {
      return;
    }
    resetOutput();
    setStreamBroken(false);
    researchSawChunkRef.current = false;
    researchCompleteRef.current = false;
    const epochAtStart = researchEpochRef.current;
    sseErrorToastedRef.current = false;
    setProactiveSummaryBuffer("");
    setBusy(true);
    setPhase("Connecting…");

    const form = new FormData();
    form.append("zip_code", selection.zip);
    form.append("site_address", selection.formattedAddress);
    const clientCity = selection.city?.trim();
    if (clientCity) {
      form.append("client_city", clientCity);
    }
    const jd0 = jobDescription.trim();
    const jd =
      launchOpts?.followUpAppend != null && launchOpts.followUpAppend.trim()
        ? `${jd0}\n\n${launchOpts.followUpAppend.trim()}`.trim()
        : jd0;
    form.append("job_description", jd);
    form.append("search_limit", String(searchLimit));
    const te = tradeElectrician || !!launchOpts?.tradeBoost?.electrician;
    const tp = tradePlumber || !!launchOpts?.tradeBoost?.plumber;
    const th = tradeHvac || !!launchOpts?.tradeBoost?.hvac;
    const trades: string[] = [];
    if (te) {
      trades.push("electrician");
    }
    if (tp) {
      trades.push("plumber");
    }
    if (th) {
      trades.push("hvac");
    }
    form.append("scout_trades", trades.join(","));
    const mc = launchOpts?.missionCritical ?? missionCriticalDc;
    form.append("mission_critical_dc", mc ? "true" : "false");
    const vert = launchOpts?.vertical ?? scoutVertical;
    form.append("scout_vertical", vert);
    if (imageFile) {
      form.append("image", imageFile);
    }
    if (
      bimBridgeReport &&
      typeof bimBridgeReport.zip === "string" &&
      bimBridgeReport.zip === selection.zip
    ) {
      form.append("bim_bridge_json", JSON.stringify(bimBridgeReport));
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
                const label =
                  prof != null &&
                  typeof prof === "object" &&
                  "label" in prof &&
                  typeof (prof as { label?: unknown }).label === "string"
                    ? ((prof as { label: string }).label || "").trim() || undefined
                    : undefined;
                setMeta((m) => ({
                  ...m,
                  site: typeof site === "string" ? site : m?.site,
                  ...(label ? { ahjLabel: label } : {}),
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
            case "future_risk_alert": {
              const parsed = parseFutureRiskPayload((payload as { payload?: unknown }).payload);
              setFutureRiskAlert(parsed?.active ? parsed : null);
              break;
            }
            case "community_inspector_feedback": {
              const zip = typeof payload.zip === "string" ? payload.zip : "";
              const parsed = parseCommunityInspectorNotesPayload(zip, payload.notes);
              if (parsed) {
                setCommunityInspectorFeedback(parsed);
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
                name === "step_jurisdiction" ||
                name === "step_federal_fast41"
              ) {
                appendToActionPlan(scoutStepDataToMarkdown(name, payload.data));
              }
              break;
            }
            case "visual_audit": {
              const rawPay = (payload as { payload?: unknown }).payload;
              const parsed = parseVisualAuditPayload(rawPay);
              if (parsed) {
                setVisualAudit(parsed);
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
              setProactiveSummaryBuffer((b) => b + piece);
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
                setProactiveSummaryBuffer(fin.trim());
              }
              const urls = payload.source_urls;
              if (Array.isArray(urls)) {
                setSourceUrls(urls.filter((u): u is string => typeof u === "string"));
              }
              setMeta((m) => ({
                site: typeof payload.site_address === "string" ? payload.site_address : m?.site,
                zip: typeof payload.zip === "string" ? payload.zip : m?.zip,
                city: typeof payload.city === "string" ? payload.city : m?.city,
                county: typeof payload.county === "string" ? payload.county : m?.county,
                ahjLabel:
                  typeof payload.ahj_label === "string" && payload.ahj_label.trim()
                    ? payload.ahj_label.trim()
                    : m?.ahjLabel,
              }));
              if ("visual_audit" in payload && payload.visual_audit != null) {
                const parsed = parseVisualAuditPayload(payload.visual_audit);
                if (parsed) {
                  setVisualAudit(parsed);
                }
              }
              if ("future_risk_alert" in payload && payload.future_risk_alert != null) {
                const fr = parseFutureRiskPayload(payload.future_risk_alert);
                if (fr?.active) {
                  setFutureRiskAlert(fr);
                }
              }
              {
                const zipFin = typeof payload.zip === "string" ? payload.zip : "";
                const cfb =
                  "community_inspector_feedback" in payload
                    ? payload.community_inspector_feedback
                    : undefined;
                const parsed =
                  cfb != null ? parseCommunityInspectorNotesPayload(zipFin, cfb) : null;
                setCommunityInspectorFeedback(parsed);
              }
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
          const stack = err instanceof Error ? (err.stack ?? "") : "";
          const message = err instanceof Error ? err.message : String(err);
          sseErrorToastedRef.current = true;
          toast.error("Connection interrupted. Retrying...");
          console.error(
            "[RegGuard research] SSE transport error (not retrying)",
            message,
            err,
            stack.slice(0, 800),
          );
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
  }, [
    selection,
    jobDescription,
    searchLimit,
    tradeElectrician,
    tradePlumber,
    tradeHvac,
    missionCriticalDc,
    scoutVertical,
    imageFile,
    resetOutput,
    bimBridgeReport,
  ]);

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
            const data = (await res.json()) as {
              formatted_address?: string;
              zip?: string;
              city?: string;
            };
            const formattedAddress =
              typeof data.formatted_address === "string" ? data.formatted_address.trim() : "";
            const zip = typeof data.zip === "string" ? data.zip.trim() : "";
            const city =
              typeof data.city === "string" && data.city.trim() ? data.city.trim() : undefined;
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
            const sel = { formattedAddress, zip, ...(city ? { city } : {}) };
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

  const handleGeneratePermitPackage = useCallback(() => {
    const md = actionPlan.trim();
    if (!md) {
      setPlanToolbarMsg("Nothing to export — run research first so the Contractor Action Plan is available.");
      window.setTimeout(() => setPlanToolbarMsg(null), 4000);
      return;
    }
    void (async () => {
      try {
        await downloadPermitPackagePdf({
          markdown: md,
          siteAddress: meta?.site ?? selection?.formattedAddress ?? null,
          zip: meta?.zip ?? selection?.zip ?? null,
          city: meta?.city ?? null,
          county: meta?.county ?? null,
          jobDescription: jobDescription.trim() || "200A upgrade",
          visualAudit,
          photoObjectUrl,
          ahjLabel: meta?.ahjLabel ?? null,
        });
        setPlanToolbarMsg("Permit package PDF downloaded.");
        window.setTimeout(() => setPlanToolbarMsg(null), 3500);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(`Could not generate permit package: ${msg}`);
      }
    })();
  }, [actionPlan, meta, selection, jobDescription, visualAudit, photoObjectUrl]);

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
            <div className="rg-field-label-text" id="universal-scout-profile-label">
              Universal Scout — trades &amp; vertical
            </div>
            <div className="rg-trade-toggles" role="group" aria-labelledby="universal-scout-profile-label">
              <button
                type="button"
                className={`rg-btn rg-btn--compact${tradeElectrician ? " rg-btn--primary" : " rg-btn--ghost"}`}
                aria-pressed={tradeElectrician}
                disabled={busy}
                onClick={() => setTradeElectrician((v) => !v)}
              >
                Electrician
              </button>
              <button
                type="button"
                className={`rg-btn rg-btn--compact${tradePlumber ? " rg-btn--primary" : " rg-btn--ghost"}`}
                aria-pressed={tradePlumber}
                disabled={busy}
                onClick={() => setTradePlumber((v) => !v)}
              >
                Plumber
              </button>
              <button
                type="button"
                className={`rg-btn rg-btn--compact${tradeHvac ? " rg-btn--primary" : " rg-btn--ghost"}`}
                aria-pressed={tradeHvac}
                disabled={busy}
                onClick={() => setTradeHvac((v) => !v)}
              >
                HVAC
              </button>
            </div>
            <div className="rg-scout-vertical-row">
              <label htmlFor="scout-vertical" className="rg-scout-vertical-label">
                Project vertical
              </label>
              <select
                id="scout-vertical"
                className="rg-input rg-input--select"
                disabled={busy}
                value={scoutVertical}
                onChange={(e) =>
                  setScoutVertical(e.target.value as "building" | "infrastructure" | "data_center")
                }
              >
                <option value="building">Building / general</option>
                <option value="infrastructure">Infrastructure</option>
                <option value="data_center">Data center</option>
              </select>
            </div>
            <label className="rg-mission-critical">
              <input
                type="checkbox"
                checked={missionCriticalDc}
                disabled={busy}
                onChange={(e) => setMissionCriticalDc(e.target.checked)}
              />{" "}
              Mission critical (data center) — Tier III/IV redundancy + liquid cooling / containment code scout
            </label>
            <p className="field-hint">
              <strong>Infrastructure</strong> or <strong>Data center</strong> adds a FAST-41 federal permitting pass.
              Selected trades append IPC/UPC, Manual J/IMC, and multi-trade coordination phrases to scout queries.
            </p>
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

          <div className="rg-field rg-service-bridge">
            <h3 className="rg-service-bridge__title">Service Bridge — BIM &amp; maintenance</h3>
            <p className="field-hint">
              <strong>BIM:</strong> paste a Revit-style JSON export. The backend cross-references your archived{" "}
              <strong>Universal Scout</strong> snapshot for that ZIP and flags <strong>clash zones</strong> where conduit
              encroaches on Austin&apos;s ~36-inch gas-relief / meter clearance pattern (787 / Austin). Seed the archive
              by running compliance research once per ZIP before BIM import. Matching ZIP merges into the next research
              automatically.
            </p>
            <div className="rg-service-bridge__row">
              <button
                type="button"
                className="rg-btn rg-btn--ghost rg-btn--compact"
                disabled={busy || bimImportBusy}
                onClick={loadSampleBimJson}
              >
                Load Austin sample JSON
              </button>
              {bimBridgeReport && typeof bimBridgeReport.zip === "string" ? (
                <span className="field-hint rg-service-bridge__badge">
                  Last BIM bridge: ZIP <strong>{String(bimBridgeReport.zip)}</strong>
                  {Array.isArray(bimBridgeReport.clash_zones) ? (
                    <> — {bimBridgeReport.clash_zones.length} clash zone(s)</>
                  ) : null}
                </span>
              ) : null}
            </div>
            <textarea
              className="rg-input rg-service-bridge__textarea"
              rows={5}
              placeholder={'{"zip":"78704","project":{...},"elements":[...]}'}
              value={bimJsonDraft}
              disabled={busy || bimImportBusy}
              onChange={(e) => setBimJsonDraft(e.target.value)}
            />
            <button
              type="button"
              className="rg-btn rg-btn--primary rg-btn--compact rg-service-bridge__bim-btn"
              disabled={busy || bimImportBusy || !bimJsonDraft.trim()}
              onClick={() => void handleBimImport()}
            >
              {bimImportBusy ? "Importing…" : "Run BIM import"}
            </button>

            <hr className="rg-service-bridge__hr" />

            <p className="field-hint">
              <strong>Maintenance Mode:</strong> configure AI-driven sensor alert targets for a{" "}
              <strong>completed</strong> project—describe wear signals to catch before an outage.
            </p>
            <div className="rg-maintenance-form">
              <input
                className="rg-input"
                placeholder="Project name"
                value={maintProjectName}
                disabled={busy || maintSaving}
                onChange={(e) => setMaintProjectName(e.target.value)}
              />
              <input
                className="rg-input"
                placeholder="Sensor profile (e.g. thermal_vibration)"
                value={maintSensorProfile}
                disabled={busy || maintSaving}
                onChange={(e) => setMaintSensorProfile(e.target.value)}
              />
              <textarea
                className="rg-input rg-maintenance-form__note"
                rows={2}
                placeholder="Alert thresholds / failure precursors to monitor…"
                value={maintAlertNote}
                disabled={busy || maintSaving}
                onChange={(e) => setMaintAlertNote(e.target.value)}
              />
              <button
                type="button"
                className="rg-btn rg-btn--primary rg-btn--compact"
                disabled={busy || maintSaving || !selection?.zip}
                onClick={() => void handleCreateMaintenanceSubscription()}
              >
                {maintSaving ? "Saving…" : "Add maintenance subscription"}
              </button>
            </div>
            {maintenanceLoading ? (
              <p className="field-hint">Loading subscriptions…</p>
            ) : maintenanceSubs.length === 0 ? (
              <p className="field-hint">No maintenance subscriptions yet.</p>
            ) : (
              <ul className="rg-maintenance-list">
                {maintenanceSubs.map((s) => (
                  <li key={s.id} className="rg-maintenance-list__item">
                    <div className="rg-maintenance-list__head">
                      <strong>{s.project_name}</strong>
                      <span className="field-hint">
                        {" "}
                        ZIP {s.zip}
                        {s.maintenance_mode_enabled !== false ? (
                          <span className="rg-maintenance-on"> — Maintenance Mode on</span>
                        ) : (
                          <span className="rg-maintenance-off"> — paused</span>
                        )}
                      </span>
                    </div>
                    {s.alert_threshold_note ? (
                      <p className="rg-maintenance-list__note">{s.alert_threshold_note}</p>
                    ) : null}
                    <label className="rg-maintenance-toggle">
                      <input
                        type="checkbox"
                        checked={s.maintenance_mode_enabled !== false}
                        onChange={(e) => void handleToggleMaintenanceMode(s.id, e.target.checked)}
                      />{" "}
                      Sensor alerts active
                    </label>
                  </li>
                ))}
              </ul>
            )}
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
            <p className="rg-reasoning-step rg-reasoning-step--in-results" aria-live="polite">
              <span className="rg-reasoning-step__label">Reasoning:</span> {reasoningStep}
            </p>
          ) : null}

          {!busy && agentStatusLine ? (
            <p className="rg-agent-status" aria-live="polite">
              {agentStatusLine}
            </p>
          ) : null}

          {busy ? (
            <div className="rg-phase rg-phase--with-reasoning" aria-live="polite">
              <span className="rg-dot-pulse" aria-hidden />
              <div className="rg-phase-text">
                <span className="rg-phase-primary">{agentStatusLine || phase}</span>
              </div>
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

          {futureRiskAlert?.active ? (
            <div className="rg-future-risk-alert" role="alert" aria-live="polite">
              <div className="rg-future-risk-alert__title">{futureRiskAlert.banner ?? "FUTURE RISK ALERT"}</div>
              <p className="rg-future-risk-alert__lead">
                Scout flagged a <strong>future code edition or adoption-cycle signal</strong> for this jurisdiction (for
                example <strong>2026 NEC</strong> or a pending ordinance). Confirm effective dates and amendments with
                the AHJ before locking scope.
              </p>
              {futureRiskAlert.notes ? (
                <p className="rg-future-risk-alert__notes">{futureRiskAlert.notes}</p>
              ) : null}
              {(futureRiskAlert.hits ?? []).length > 0 ? (
                <ul className="rg-future-risk-alert__hits">
                  {(futureRiskAlert.hits ?? []).map((h, i) => (
                    <li key={`${h.url ?? h.title ?? "hit"}-${i}`}>
                      {h.url ? (
                        <a href={h.url} target="_blank" rel="noreferrer noopener">
                          {h.title?.trim() || h.url}
                        </a>
                      ) : (
                        <span>{h.title ?? "Source"}</span>
                      )}
                      {h.snippet?.trim() ? (
                        <span className="rg-future-risk-alert__snippet"> — {h.snippet.trim()}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {communityInspectorFeedback?.notes?.length ? (
            <div className="rg-community-scout-alert" role="status" aria-live="polite">
              <div className="rg-community-scout-alert__title">COMMUNITY ALERT: Recent Inspector Feedback</div>
              <p className="rg-community-scout-alert__meta">
                ZIP <strong>{communityInspectorFeedback.zip}</strong> — crowdsourced field notes (verify with your AHJ).
              </p>
              <ul className="rg-community-scout-alert__list">
                {communityInspectorFeedback.notes.map((n, i) => (
                  <li key={`${n.created_at ?? "note"}-${i}`}>{n.text}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rg-results-tabs" role="tablist" aria-label="Results views">
            <button
              type="button"
              role="tab"
              className={`rg-results-tab${resultsTab === "plan" ? " rg-results-tab--active" : ""}`}
              aria-selected={resultsTab === "plan"}
              id="rg-tab-plan"
              aria-controls="rg-tab-panel-plan"
              onClick={() => setResultsTab("plan")}
            >
              Contractor action plan
            </button>
            <button
              type="button"
              role="tab"
              className={`rg-results-tab${resultsTab === "visual" ? " rg-results-tab--active" : ""}`}
              aria-selected={resultsTab === "visual"}
              id="rg-tab-visual"
              aria-controls="rg-tab-panel-visual"
              disabled={!photoObjectUrl}
              title={
                photoObjectUrl
                  ? "Photo overlay from Reality Capture Audit"
                  : "Attach a job-site photo to enable Visual Audit"
              }
              onClick={() => setResultsTab("visual")}
            >
              Visual Audit
            </button>
          </div>

          <div
            id="rg-tab-panel-plan"
            role="tabpanel"
            aria-labelledby="rg-tab-plan"
            hidden={resultsTab !== "plan"}
            className="rg-results-tab-panel"
          >
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
                  className="rg-btn rg-btn--primary rg-btn--compact rg-plan-action-btn rg-plan-action-btn--package"
                  title="Download punch list plus NEC load/conductor memo, Vision photo overlay, and AHJ worksheet"
                  onClick={handleGeneratePermitPackage}
                >
                  Generate Permit Package
                </button>
                <button
                  type="button"
                  className="rg-btn rg-btn--ghost rg-btn--compact rg-plan-action-btn"
                  title="Share a quick inspector gotcha for this job-site ZIP (visible to other contractors on the next scout)"
                  disabled={!selection?.zip || busy}
                  onClick={() => setInspectorNoteModalOpen(true)}
                >
                  Add Inspector Note
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
          </div>

          <div
            id="rg-tab-panel-visual"
            role="tabpanel"
            aria-labelledby="rg-tab-visual"
            hidden={resultsTab !== "visual"}
            className="rg-results-tab-panel"
          >
            {!photoObjectUrl ? (
              <p className="field-hint">Attach a photo on the left to use Visual Audit.</p>
            ) : (
              <>
                <p className="field-hint rg-visual-audit-intro">
                  Bounding boxes from Reality Capture (Gemini). ZIP 78704: automated Austin gas-meter vs electrical 36-inch
                  clearance geometry runs only when the site ZIP is 78704 and a gas meter appears in labels.
                  Red / green reflect heuristic clearance on gas + electrical pairs; amber when ambiguous.
                </p>
                <div className="rg-visual-audit-frame">
                  <img src={photoObjectUrl} alt="Job-site photo for visual audit" className="rg-visual-audit-img" />
                  {visualAudit?.detections?.length ? (
                    <svg
                      className="rg-visual-audit-svg"
                      viewBox="0 0 1000 1000"
                      preserveAspectRatio="none"
                      aria-hidden
                    >
                      {visualAudit.detections.map((det, i) => {
                        const [ymin, xmin, ymax, xmax] = det.box_2d;
                        const bw = Math.max(0, xmax - xmin);
                        const bh = Math.max(0, ymax - ymin);
                        const strokeClass =
                          det.status === "violation"
                            ? "rg-vbox--bad"
                            : det.status === "ok"
                              ? "rg-vbox--ok"
                              : "rg-vbox--unknown";
                        return (
                          <g key={`${det.label}-${i}`}>
                            <rect
                              x={xmin}
                              y={ymin}
                              width={bw}
                              height={bh}
                              className={`rg-vbox ${strokeClass}`}
                            />
                            <text x={xmin + 6} y={ymin + 22} className="rg-vbox-label">
                              {det.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>
                  ) : null}
                </div>
                {visualAudit?.austin_clearance?.applies ? (
                  <div className="rg-visual-audit-clearance" role="status">
                    <strong>Austin 78704 gas clearance</strong>
                    {visualAudit.austin_clearance.edge_distance_px != null ? (
                      <span>
                        {" "}
                        — edge distance ≈ {String(visualAudit.austin_clearance.edge_distance_px)} px
                      </span>
                    ) : null}
                    {visualAudit.austin_clearance.estimated_clearance_inches != null ? (
                      <span>
                        {" "}
                        (~{String(visualAudit.austin_clearance.estimated_clearance_inches)} in heuristic vs 36 in
                        rule)
                      </span>
                    ) : null}
                    {visualAudit.austin_clearance.violates_36_in_rule === true ? (
                      <span className="rg-visual-flag"> — Flagged: likely under 36 in.</span>
                    ) : null}
                    {visualAudit.austin_clearance.violates_36_in_rule === false ? (
                      <span className="rg-visual-ok"> — Heuristic spacing OK.</span>
                    ) : null}
                    {visualAudit.austin_clearance.notes ? (
                      <p className="rg-visual-audit-notes">{visualAudit.austin_clearance.notes}</p>
                    ) : null}
                  </div>
                ) : visualAudit ? (
                  <p className="field-hint">
                    No Austin 78704 gas-meter clearance block for this run (different ZIP, no gas meter label, or
                    incomplete geometry).
                  </p>
                ) : (
                  <p className="field-hint">
                    No structured overlay yet — finish research with <code>GEMINI_API_KEY</code> on the server (photos use Gemini only).
                  </p>
                )}
                {visualAudit?.model_id ? (
                  <p className="field-hint rg-visual-model-id">Model: {visualAudit.model_id}</p>
                ) : null}
              </>
            )}
          </div>
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
      {inspectorNoteModalOpen ? (
        <div
          className="rg-inspector-note-modal-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget && !inspectorNoteSaving) {
              setInspectorNoteModalOpen(false);
            }
          }}
        >
          <div
            className="rg-inspector-note-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="rg-inspector-note-title"
          >
            <h3 id="rg-inspector-note-title" className="rg-inspector-note-modal__title">
              Add inspector note
            </h3>
            <p className="rg-inspector-note-modal__hint">
              Short field tip for ZIP <strong>{selection?.zip ?? "—"}</strong> (e.g. inspector preferences). Saved to the
              community pool and shown on future research for this ZIP.
            </p>
            <textarea
              className="rg-inspector-note-modal__textarea"
              rows={4}
              maxLength={2000}
              value={inspectorNoteDraft}
              placeholder='e.g. "Inspector Smith in Austin is strict on torque marks"'
              onChange={(e) => setInspectorNoteDraft(e.target.value)}
              disabled={inspectorNoteSaving}
            />
            <div className="rg-inspector-note-modal__actions">
              <button
                type="button"
                className="rg-btn rg-btn--ghost rg-btn--compact"
                disabled={inspectorNoteSaving}
                onClick={() => {
                  if (!inspectorNoteSaving) {
                    setInspectorNoteModalOpen(false);
                  }
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rg-btn rg-btn--primary rg-btn--compact"
                disabled={inspectorNoteSaving || !selection?.zip}
                onClick={() => void handleSubmitInspectorNote()}
              >
                {inspectorNoteSaving ? "Saving…" : "Save note"}
              </button>
            </div>
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
