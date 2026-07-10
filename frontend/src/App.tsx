import axios from 'axios';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  MapPin,
  Mic,
  Shield,
  Sparkles,
  Compass,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearDictationSilenceTimer,
  DICTATION_SILENCE_MS,
  scheduleDictationSilenceStop,
} from './speech-recognition';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';
import { backendUrl } from './env';
import { fetchWithTimeout } from './fetchWithTimeout';
import { downloadActionPlanPdf } from './downloadActionPlanPdf';

// ========== Web Speech API Type Declarations ==========
declare global {
  interface Window {
    SpeechRecognition?: new () => any;
    webkitSpeechRecognition?: new () => any;
  }

  class SpeechRecognition {
    continuous: boolean;
    interimResults: boolean;
    lang: string;
    onresult: ((event: SpeechRecognitionEvent) => void) | null;
    onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
    onend: (() => void) | null;
    start(): void;
    stop(): void;
    abort(): void;
  }

  class SpeechRecognitionEvent extends Event {
    results: any;
    resultIndex: number;
  }

  class SpeechRecognitionErrorEvent extends Event {
    error: string;
    message?: string;
  }
}

/** Initial SSE silence + static fallback switch (no 3s/12s ghost aborts). */
const RESEARCH_STREAM_FALLBACK_MS = 30_000;

/** Omit BIM textarea placeholders / invalid JSON so multipart decode never crashes the API. */
function bimBridgeJsonForFormData(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^\{\s*(\.{3}|…)+\s*\}$/u.test(t)) return null;
  const lowered = t.toLowerCase();
  if (lowered === '{ … }' || lowered === '{...}' || lowered === '{…}' || lowered === '{}') {
    return null;
  }
  if ((t.includes('...') || t.includes('…')) && !t.includes('"')) return null;
  try {
    const parsed = JSON.parse(t) as unknown;
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    return t;
  } catch {
    return null;
  }
}

/* ─── Google Places (loaded via index.html) ───────────────────────────────── */

declare global {
  interface Window {
    google?: typeof google;
  }
}

type ScoutVertical =
  | 'building'
  | 'infrastructure'
  | 'data_center'
  | 'ai_crypto_compute'
  | 'bess';

type TradeToken =
  | 'general_contractor'
  | 'electrician'
  | 'plumber'
  | 'hvac'
  | 'zoning_planning'
  | 'owner_builder';

const TRADE_OPTIONS: { id: TradeToken; label: string }[] = [
  { id: 'general_contractor', label: 'General contractor' },
  { id: 'electrician', label: 'Electrician' },
  { id: 'plumber', label: 'Plumber' },
  { id: 'hvac', label: 'HVAC / mechanical' },
  { id: 'zoning_planning', label: 'Zoning & planning' },
  { id: 'owner_builder', label: 'Owner-builder' },
];

type SseEnvelope = {
  code?: string;
  zip_used?: string;
  event?: string;
  message?: string;
  text?: string;
  step?: string;
  data?: unknown;
  phase?: string;
  site_address?: string;
  profile?: Record<string, unknown>;
  zip?: string;
  summary?: string;
  source_urls?: string[];
  enhanced_query?: string;
  job_description?: string;
  photo_analysis?: string | null;
  jurisdiction?: Record<string, unknown>;
  city?: string | null;
  county?: string | null;
  ahj_label?: string | null;
  payload?: unknown;
  notes?: unknown[];
  value_metrics?: { research_value_usd?: number; estimated_liability_avoided_usd?: number };
  moratorium_state_alert?: { active?: boolean; text?: string };
  visual_audit?: unknown;
};

type Hit = { url?: string; title?: string; description?: string };

type StepBlock = {
  query?: string;
  results?: Hit[];
  fallback_used?: boolean;
};

function parseSseJsonPayload(raw: string): unknown | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    /* try line-by-line SSE data: lines */
  }
  for (const line of trimmed.split('\n')) {
    const piece = line.replace(/^\s*data:\s*/i, '').trim();
    if (!piece || piece === '[DONE]') continue;
    try {
      return JSON.parse(piece) as unknown;
    } catch {
      /* continue */
    }
  }
  return null;
}

/** Last `{...}` object in a buffer — recovers metrics when a frame is not cleanly framed. */
function extractTrailingJsonObject(raw: string): Record<string, unknown> | null {
  const end = raw.lastIndexOf('}');
  if (end < 0) return null;
  let depth = 0;
  for (let i = end; i >= 0; i--) {
    const ch = raw[i];
    if (ch === '}') depth += 1;
    else if (ch === '{') {
      depth -= 1;
      if (depth === 0) {
        try {
          const obj = JSON.parse(raw.slice(i, end + 1)) as unknown;
          return obj && typeof obj === 'object' && !Array.isArray(obj)
            ? (obj as Record<string, unknown>)
            : null;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/** Strip optional SSE ``data:`` prefix; tolerate bare JSON or plain-text municipal tokens. */
function normalizeSsePayloadLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith(':')) return '';
  if (/^data:/i.test(trimmed)) {
    return trimmed.replace(/^data:\s*/i, '').trim();
  }
  if (/^event:/i.test(trimmed) || /^id:/i.test(trimmed) || /^retry:/i.test(trimmed)) {
    return '';
  }
  return trimmed;
}

function looksLikeCompleteResearchBlock(obj: Record<string, unknown>): boolean {
  if (obj.event === 'complete') return true;
  if (typeof obj.summary === 'string' && obj.summary.trim().length > 0) return true;
  if (typeof obj.contractor_action_plan === 'string' && obj.contractor_action_plan.trim().length > 0) {
    return true;
  }
  if (typeof obj.contractorActionPlan === 'string' && obj.contractorActionPlan.trim().length > 0) {
    return true;
  }
  const vm = obj.value_metrics;
  return Boolean(vm && typeof vm === 'object' && !Array.isArray(vm));
}

function coerceResearchMetric(...candidates: unknown[]): number {
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c)) return c;
    if (typeof c === 'string' && c.trim()) {
      const n = Number.parseFloat(c.replace(/[^0-9.-]+/g, ''));
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
}

function resolveActionPlanText(data: Record<string, unknown>): string {
  const plan =
    data.contractorActionPlan ??
    data.contractor_action_plan ??
    data.summary ??
    data.action_plan ??
    data.actionPlan ??
    '';
  return typeof plan === 'string' ? plan : '';
}

function resolveValueMetrics(data: Record<string, unknown>): Record<string, unknown> {
  const vm = data.value_metrics;
  if (vm && typeof vm === 'object' && !Array.isArray(vm)) {
    return vm as Record<string, unknown>;
  }
  return {};
}

const STEP_LABELS: Record<string, string> = {
  step_ahj_identification: 'AHJ identification',
  step_jurisdiction: 'Jurisdiction',
  step_building_permits: 'Building permits',
  step_building_codes: 'Adopted codes',
  step_residential_zoning: 'Residential zoning',
  step_federal_fast41: 'FAST-41',
  step_data_center_water: 'Cooling water / NPDES',
  step_refrigerant_aim_act: 'AIM Act / refrigerants',
  step_water_usage_effectiveness: 'Water usage (WUE)',
  step_dc_state_energy: 'State energy / grid',
  step_dc_local_moratorium: 'Local moratorium scout',
};

function pickZipFromPlace(place: google.maps.places.PlaceResult): string {
  const comps = place.address_components || [];
  for (const c of comps) {
    if (c.types.includes('postal_code')) return c.short_name || '';
  }
  return '';
}

/**
 * Strip redundant trailing blocks from the action-plan markdown before it is rendered
 * in the punch-list card or exported to PDF:
 *  - the duplicate "Bottom Line" section (already shown in Row 2)
 *  - the "Context snapshot:" raw-context metadata block
 *  - the legacy "[Job description (voice or typed)]" echo template
 */
function sanitizeActionPlanMarkdown(raw: string): string {
  if (!raw) return '';
  let text = raw.replace(
    /\n*\*{0,2}\s*context snapshot:?\s*\*{0,2}\s*\n+[^\n]*/gi,
    '',
  );
  const lines = text.split(/\r?\n/);
  const kept: string[] = [];
  let inBottomLine = false;
  for (const line of lines) {
    const t = line.trim();
    const isBottomHeading =
      /^#{1,6}\s+.*bottom line/i.test(t) || /^\*\*\s*bottom line\b/i.test(t);
    if (isBottomHeading) {
      inBottomLine = true;
      continue;
    }
    if (inBottomLine) {
      if (/^#{1,6}\s/.test(t)) {
        inBottomLine = false;
      } else if (/^-{3,}$/.test(t)) {
        inBottomLine = false;
        continue;
      } else {
        continue;
      }
    }
    kept.push(line);
  }
  return kept
    .join('\n')
    .replace(/\[job description \(voice or typed\)\]/gi, 'Job Description:')
    .replace(/\bvoiced or typed\b/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pickCityFromPlace(place: google.maps.places.PlaceResult): string {
  const cps = place.address_components || [];
  for (const c of cps) {
    if (c.types.includes('locality')) return c.long_name || '';
  }
  for (const c of cps) {
    if (c.types.includes('sublocality')) return c.long_name || '';
  }
  return '';
}

function speechRecognitionCtor(): (new () => any) | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window.SpeechRecognition ?? window.webkitSpeechRecognition) as any;
}

async function warmMicrophonePermission(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) return;
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  try {
    for (const track of stream.getTracks()) {
      try {
        track.stop();
      } catch {
        /* hardware may already be released */
      }
    }
  } finally {
    /* ensure warmup promise settles even if stop() throws */
  }
}

function stopRecognitionSafe(rec: any): void {
  if (!rec) return;
  try {
    rec.stop();
  } catch {
    try {
      rec.abort();
    } catch {
      /* noop */
    }
  }
}

function styles(): string {
  return `
    :root {
      color-scheme: dark;
      --bg0: #0a1429;
      --bg1: #0f1d38;
      --bg2: #1a2d52;
      --stroke: rgba(61, 79, 143, 0.4);
      --text: #ffffff;
      --muted: #b8c1d1;
      --accent: #3d4f8f;
      --accent2: #5a6bb8;
      --good: #4ade80;
      --warn: #fbbf24;
      --bad: #fb7185;
      --radius: 14px;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      --sans: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; overflow-x: hidden; max-width: 100%; }
    body { font-family: var(--sans); background: linear-gradient(135deg, #0a1429 0%, #0f1d38 100%);
      radial-gradient(900px 500px at 90% 0%, rgba(167,139,250,0.12), transparent 50%), var(--bg0); color: var(--text); }
    a { color: var(--accent); word-break: break-word; }
    .rg-text-flow, .rg-md, .rg-step-body, .rg-reason {
      word-break: normal;
      overflow-wrap: break-word;
      white-space: pre-wrap;
      display: block;
      max-width: 100%;
      width: 100%;
      min-width: 0;
      box-sizing: border-box;
    }
    .rg-shell {
      min-height: 100vh; display: flex; flex-direction: column;
      width: 100%; max-width: 100%; overflow-x: hidden; box-sizing: border-box;
    }
    .rg-header {
      padding: 18px 22px;
      border-bottom: 1px solid var(--stroke);
      background: linear-gradient(180deg, rgba(15, 29, 56, 0.95), rgba(10, 20, 41, 0.85));
      backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    }
    .rg-brand { display: flex; align-items: center; gap: 12px; }
    .rg-title { font-weight: 800; letter-spacing: -0.02em; font-size: 1.05rem; }
    .rg-sub { font-size: 0.85rem; color: var(--muted); }
    .rg-pill { font-size: 0.72rem; padding: 6px 12px; border-radius: 999px; border: 1px solid #10b981;
      color: var(--muted); display: inline-flex; align-items: center; gap: 6px; background: rgba(2,8,20,0.35); }
    .rg-main {
      flex: 1; display: grid; grid-template-columns: minmax(320px, 420px) minmax(0, 1fr);
      gap: 16px; padding: 16px; max-width: 1500px; margin: 0 auto; width: 100%; min-width: 0;
      box-sizing: border-box; overflow-x: hidden;
    }
    @media (max-width: 1040px) {
      .rg-main { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .rg-header { flex-direction: column; align-items: flex-start; padding: 12px; gap: 10px; }
      .rg-main { padding: 12px; gap: 12px; }
      .rg-panel-hd, .rg-panel-bd { padding-left: 12px; padding-right: 12px; }
      .rg-row2 { grid-template-columns: 1fr; }
      .finops-card { grid-template-columns: 1fr; }
      .rg-step-top { flex-wrap: wrap; align-items: flex-start; }
      .rg-pill { max-width: 100%; }
      .rg-split { min-height: 0; }
      .rg-actions { flex-direction: column; align-items: stretch; }
      .rg-actions .rg-btn { justify-content: center; width: 100%; }
    }
    .rg-panel {
      background: linear-gradient(180deg, rgba(15, 29, 56, 0.95), rgba(10, 20, 41, 0.85));
      border: 1px solid var(--stroke); border-radius: var(--radius); overflow: hidden;
      width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;
    }
    .rg-panel-bd, .rg-panel-hd { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; }
    .rg-panel-hd { padding: 14px 16px; border-bottom: 1px solid var(--stroke); display: flex; align-items: center; gap: 10px; font-weight: 700; }
    .rg-panel-bd { padding: 14px 16px; }
    /* Right-hand live results column: pull content edge-to-edge without touching the left form panel. */
    .rg-panel-bd.rg-live-bd { padding: 6px 8px !important; }
    /* Total space-crush on the right-hand results column. */
    .rg-live-bd * {
      margin-top: 0 !important; margin-bottom: 2px !important;
      padding-top: 0 !important; padding-bottom: 0 !important; line-height: 1.1 !important;
    }
    .rg-live-bd div, .rg-live-bd section, .rg-live-bd .card, .rg-live-bd .rg-punchlist-card {
      gap: 2px !important; row-gap: 2px !important;
    }
    label.rg-lbl { display: block; font-size: 0.78rem; color: var(--muted); margin: 10px 0 6px; }
    .rg-input, .rg-ta, .rg-select {
      width: 100%; border-radius: 12px; border: 1px solid var(--stroke); background: rgba(7,10,16,0.65);
      color: var(--text); padding: 10px 12px; outline: none; font: inherit;
    }
    .rg-ta { min-height: 110px; resize: vertical; }
    .rg-bim-dropzone { display: block; cursor: pointer; margin-top: 8px; padding: 18px 14px;
      border: 2px dashed #222e50; background-color: #111a36; text-align: center; border-radius: 12px;
      color: var(--muted); transition: border-color 0.15s ease, color 0.15s ease, background-color 0.15s ease; }
    .rg-bim-dropzone:hover { border-color: #3d4f8f; color: var(--text); background-color: #f0f4ff; }
    .rg-bim-dropzone-text { font-size: 0.82rem; line-height: 1.4; overflow-wrap: break-word; }
    .rg-addr-reminder { margin-top: 8px; padding: 10px 12px; border-radius: 10px; font-size: 0.8rem;
      line-height: 1.4; border: 1px solid rgba(245,158,11,0.45); background: rgba(245,158,11,0.12);
      color: #fcd34d; overflow-wrap: break-word; }
    .rg-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .rg-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .rg-chip { cursor: pointer; user-select: none; border-radius: 999px; padding: 8px 10px; font-size: 0.78rem;
      border: 1px solid var(--stroke); color: var(--muted); background: rgba(7,10,16,0.45); }
    .rg-chip.on { border-color: #5a6bb8; color: #ffffff; background: linear-gradient(135deg, #3d4f8f, #5a6bb8); }
    .rg-actions { display: flex; gap: 10px; align-items: center; margin-top: 14px; flex-wrap: wrap; }
    .rg-btn { border: 2px solid #3d4f8f; background: linear-gradient(180deg, #5a6bb8, #4555a5);
      color: var(--text); padding: 10px 14px; border-radius: 12px; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; }
    .rg-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    @keyframes rgspin { to { transform: rotate(360deg); } }
    .spin { animation: rgspin 0.9s linear infinite; }
    .rg-btn2 { border: 1px solid var(--stroke); background: rgba(7,10,16,0.55); }
    .rg-split {
      display: flex; flex-direction: column; gap: 12px; min-height: calc(100vh - 120px);
      width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;
    }
    .rg-reason {
      max-height: 120px; overflow: auto; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--stroke);
      background: rgba(7,10,16,0.55); color: var(--muted); font-family: var(--mono); font-size: 0.78rem;
    }
    .rg-md {
      padding: 6px 10px !important; overflow-x: hidden; overflow-y: auto; border-top: 1px solid var(--stroke);
      max-height: none;
      display: flex; flex-direction: column; gap: 0px !important;
    }
    /* Contractor Action Plan: absolute-minimum layout density (aggressive micro-spacing). */
    .rg-md > * { margin: 0 !important; padding: 0 !important; }
    /* Deep wildcard space-crush across every node in the action plan. */
    .rg-md * {
      margin-top: 0 !important; margin-bottom: 2px !important;
      padding-top: 0 !important; padding-bottom: 0 !important; line-height: 1.1 !important;
    }
    .rg-md ul, .rg-md ol, .rg-md li { margin: 0 !important; padding: 0 !important; }
    .rg-md p { margin: 0 0 2px 0 !important; padding: 0 !important; }
    .rg-md p, .rg-md div, .rg-md li, .rg-md span {
      margin: 0 0 2px 0 !important; padding: 0 !important; line-height: 1.1 !important;
      word-break: normal; overflow-wrap: break-word; white-space: pre-wrap; max-width: 100%;
    }
    .rg-md h1, .rg-md h2, .rg-md h3, .rg-md h4 {
      margin: 4px 0 2px 0 !important; padding: 0 !important; line-height: 1.2 !important;
      word-break: normal; overflow-wrap: break-word;
    }
    .rg-md h1:first-child, .rg-md h2:first-child, .rg-md h3:first-child, .rg-md h4:first-child {
      margin-top: 0 !important;
    }
    .rg-md td, .rg-md th, .rg-md a, .rg-md strong {
      word-break: normal; overflow-wrap: break-word; white-space: pre-wrap; max-width: 100%;
    }
    /* Checklist: no floating disc bullets, no default <li> indentation, zero vertical gaps. */
    .rg-md ul, .rg-md ol {
      list-style-type: none !important;
      margin-top: 0 !important; margin-bottom: 0 !important;
      padding-top: 0 !important; padding-bottom: 0 !important; padding-left: 0 !important;
    }
    .rg-md li {
      list-style-type: none !important;
      margin-top: 0 !important; margin-bottom: 1px !important;
      padding-top: 0 !important; padding-bottom: 0 !important; line-height: 1.1 !important;
    }
    .rg-md li::marker { content: '' !important; }
    .rg-md li > p, .rg-md li p { margin: 0 !important; padding: 0 !important; }
    /* Flatten task-list checkbox wrappers so the input + label sit flush with no vertical gap. */
    .rg-md li label, .rg-md li input {
      margin: 0 !important; padding-top: 0 !important; padding-bottom: 0 !important;
      display: inline-flex; align-items: center;
    }
    /* Keep the task-list <li> a block-level flex row (stacked vertically) with zero vertical padding. */
    .rg-md .task-list-item {
      margin: 0 0 1px 0 !important; padding-top: 0 !important; padding-bottom: 0 !important;
      display: flex; align-items: center; gap: 6px;
    }
    /* Collapse empty wrapper blocks — scoped to text containers so task-list checkboxes
       (empty <input>), images, and rules are never hidden. */
    .rg-md p:empty, .rg-md div:empty, .rg-md span:empty, .rg-md li:empty {
      display: none !important; height: 0 !important; margin: 0 !important; padding: 0 !important;
    }
    .rg-md br { display: none !important; }
    .rg-md pre, .rg-md code { max-width: 100%; overflow-x: auto; }
    .rg-md table { display: block; max-width: 100%; overflow-x: auto; }
    .rg-md img { max-width: 100%; height: auto; }
    .rg-steps { display: flex; flex-direction: column; gap: 8px; width: 100%; min-width: 0; }
    .rg-step {
      border: 1px solid var(--stroke); border-radius: 12px; overflow: hidden; background: rgba(7,10,16,0.35);
      width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;
    }
    .rg-step-top { width: 100%; text-align: left; border: 0; background: transparent; color: var(--text);
      padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; }
    .rg-step-body {
      padding: 10px 12px 12px; border-top: 1px solid var(--stroke); color: var(--muted); font-size: 0.85rem;
    }
    .rg-step-body a { color: var(--accent); text-decoration: none; }
    .rg-step-body a:hover { text-decoration: underline; }
    .rg-step-body ul { margin: 2px 0 !important; padding-left: 1.2rem !important; }
    .rg-step-body p, .rg-step-body div, .rg-step-body li > * {
      margin-top: 0px !important; margin-bottom: 0px !important;
      padding-top: 0px !important; padding-bottom: 0px !important;
      display: inline-block !important; line-height: 1.35 !important;
    }
    .rg-step-body li {
      margin-top: 0px !important; margin-bottom: 4px !important;
      padding-top: 0px !important; padding-bottom: 0px !important;
    }
    .rg-hit {
      padding: 8px 0; border-top: 1px dashed rgba(148,163,184,0.18);
      width: 100%; max-width: 100%; min-width: 0; word-break: break-word; overflow-wrap: break-word;
    }
    .rg-hit:first-child { border-top: 0; padding-top: 0; }
    .rg-small { font-size: 0.78rem; color: var(--muted); }
    .rg-danger { color: var(--bad); }
    .rg-warn { color: var(--warn); }
    .rg-ok { color: var(--good); }
    
    /* Dynamic upgrades layout */
    .rg-pulse-dot { width: 8px; height: 8px; background-color: var(--good); border-radius: 999px; display: inline-block; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
    .finops-card {
      display: flex; flex-direction: column; gap: 12px; margin-bottom: 12px;
      width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;
    }
    @media (min-width: 520px) {
      .finops-card { display: grid; grid-template-columns: 1fr 1fr; }
    }
    .finops-metric {
      background: rgba(7,10,16,0.4); border: 1px solid var(--stroke); border-radius: 12px; padding: 12px;
      width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;
    }
    .rg-job-desc-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; margin: 10px 0 6px; }
    .rg-job-desc-head .rg-lbl { margin: 0; }
    .rg-mic-btn {
      min-width: 2.5rem; padding: 8px 10px; border-radius: 10px;
      border: 1px solid var(--stroke); background: rgba(7,10,16,0.55);
      color: var(--muted); cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
      transition: border-color 0.15s, color 0.15s, background 0.15s;
    }
    .rg-mic-btn:not(:disabled):hover { border-color: #5a6bb8; color: #ffffff; background: linear-gradient(135deg, #3d4f8f, #5a6bb8); }
    .rg-mic-btn:disabled { opacity: 0.4; cursor: not-allowed; }
    .rg-mic-btn--active { border-color: #3d4f8f; color: var(--accent); background: #d4ddf8; }
    .rg-mic-btn--processing { border-color: var(--stroke); color: var(--accent); }
    .rg-mic-pulse {
      width: 10px; height: 10px; border-radius: 50%; background: var(--bad);
      animation: rg-mic-throb 0.85s ease-in-out infinite;
    }
    @keyframes rg-mic-throb {
      0%, 100% { opacity: 0.45; transform: scale(0.92); }
      50% { opacity: 1; transform: scale(1.08); }
    }
    .rg-ta--dictating {
      box-shadow: inset 0 0 0 1px #3d4f8f, 0 0 0 3px #dfe5fa;
    }
    .rg-speech-hint { font-size: 0.78rem; color: var(--bad); margin: 0 0 6px; }

    /* Redesigned results dashboard (native rg-* CSS — no Tailwind dependency) */
    .rg-metrics-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 8px !important; margin-top: 4px !important; margin-bottom: 4px !important;
      width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;
    }
    .rg-metric-card {
      background-color: #1c2541; border: 1px solid var(--stroke); border-radius: 12px;
      padding: 10px !important; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.3);
      width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;
    }
    .rg-metric-label {
      font-size: 0.72rem; color: var(--muted); display: inline-flex; align-items: center; justify-content: center;
      gap: 4px; margin-bottom: 6px;
    }
    .rg-metric-value { font-size: 1.25rem; font-weight: 700; display: block; }
    .rg-metric-value--green { color: #4ade80; }
    .rg-metric-value--cyan { color: #22d3ee; }

    .rg-bottom-line-card {
      background-color: #1c2541; border: 1px solid rgba(0,242,254,0.3); border-radius: 12px;
      padding: 6px 10px !important; margin-top: 4px !important; margin-bottom: 4px !important; box-shadow: 0 6px 18px rgba(0,0,0,0.35);
      width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;
    }
    .rg-bottom-line-card h2 {
      font-size: 1rem; font-weight: 700; color: #22d3ee; margin: 0 0 8px;
      display: flex; align-items: center; gap: 8px;
    }
    .rg-bottom-line-body {
      font-size: 0.9rem; line-height: 1.6; color: #e2e8f0; margin: 0;
    }
    .rg-triage-box {
      margin-top: 12px; border-radius: 10px;
      background-color: rgba(7,10,16,0.45); border: 1px solid var(--stroke);
      height: auto !important; max-height: none !important; display: block !important; padding: 12px !important;
    }
    .rg-triage-title { font-size: 0.8rem; font-weight: 700; color: #e2e8f0; margin-bottom: 6px; }
    .rg-triage-list {
      margin: 0; padding-left: 1.1rem; font-size: 0.82rem; color: var(--muted);
      white-space: normal !important; overflow: visible !important; display: block !important;
    }
    .rg-triage-list li {
      white-space: normal !important; word-wrap: break-word !important; overflow: visible !important;
      display: list-item !important; height: auto !important; line-height: 1.4 !important; margin-bottom: 6px !important;
      text-overflow: clip !important;
    }

    .rg-punchlist-card {
      background-color: #1c2541; border: 1px solid var(--stroke); border-radius: 12px;
      padding: 6px 10px !important; margin-top: 4px !important; margin-bottom: 4px !important;
      width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;
    }
    .rg-punchlist-head {
      display: flex; flex-wrap: wrap; gap: 10px; justify-content: space-between; align-items: center; margin-bottom: 6px;
    }
    /* Shrink the long wrapped Contractor Action Plan title so it renders tight, not as a massive block. */
    .rg-punchlist-card h2, .rg-punchlist-card .card-header-title {
      font-size: 15px !important; line-height: 1.1 !important; margin: 0 0 4px 0 !important;
      padding: 0 !important; font-weight: 700;
    }
    .rg-punchlist-head h3 { font-size: 0.9rem; font-weight: 600; color: var(--muted); margin: 0; }
    .rg-btn-punch {
      background-color: #0891b2; color: #fff; border: 0; font-size: 0.72rem; font-weight: 600;
      padding: 6px 12px; border-radius: 8px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;
      transition: background-color 0.15s, transform 0.1s;
    }
    .rg-btn-punch:hover { background-color: #06b6d4; }
    .rg-btn-punch:active { transform: scale(0.96); }

    .rg-btn-master {
      width: 100%; background-color: #10b981; color: #fff; font-weight: 600; font-size: 0.9rem;
      padding: 14px; border: 0; border-radius: 12px; cursor: pointer; margin-top: 4px; margin-bottom: 8px;
      box-shadow: 0 4px 12px rgba(16,185,129,0.25); transition: background-color 0.15s, transform 0.1s;
      display: flex; justify-content: center; align-items: center; gap: 8px;
    }
    .rg-btn-master:hover { background-color: #059669; }
    .rg-btn-master:active { transform: scale(0.98); }

    .rg-drilldown-drawer { width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box; }
    .rg-drilldown-summary {
      list-style: none; display: flex; justify-content: space-between; align-items: center; gap: 10px;
      background-color: #1c2541; padding: 14px 16px; border-radius: 12px; cursor: pointer; user-select: none;
      border: 1px solid var(--stroke); transition: background-color 0.15s;
    }
    .rg-drilldown-summary::-webkit-details-marker { display: none; }
    .rg-drilldown-summary:hover { background-color: #222e50; }
    .rg-drilldown-title { font-size: 0.78rem; font-weight: 500; color: var(--muted); }
    .rg-drilldown-chevron { color: #22d3ee; font-size: 0.72rem; transition: transform 0.2s; }
    .rg-drilldown-drawer[open] .rg-drilldown-summary { border-radius: 12px 12px 0 0; }
    .rg-drilldown-drawer[open] .rg-drilldown-chevron { transform: rotate(180deg); }
    .rg-drilldown-content {
      padding: 16px; background-color: #111a36; border-radius: 0 0 12px 12px;
      border: 1px solid var(--stroke); border-top: 0; display: flex; flex-direction: column; gap: 8px;
      width: 100%; max-width: 100%; min-width: 0; box-sizing: border-box;
    }

    /* === v2.0.1-red-alert — ABSOLUTE final-priority layout overrides (keep at bottom of styles()) === */
    .rg-triage-box { height: auto !important; max-height: none !important; display: block !important; padding: 12px !important; }
    .rg-triage-list { white-space: normal !important; overflow: visible !important; display: block !important; }
    .rg-triage-list li {
      white-space: normal !important; word-wrap: break-word !important; overflow: visible !important;
      display: list-item !important; height: auto !important; line-height: 1.4 !important;
      margin-bottom: 6px !important; text-overflow: clip !important;
    }
    .rg-step-body p, .rg-step-body div, .rg-step-body li > * {
      margin-top: 0px !important; margin-bottom: 0px !important;
      padding-top: 0px !important; padding-bottom: 0px !important;
      display: inline-block !important; line-height: 1.35 !important;
    }
    .rg-step-body li {
      margin-top: 0px !important; margin-bottom: 4px !important;
      padding-top: 0px !important; padding-bottom: 0px !important;
    }

    /* === Live Run flashing-green pulse — kept at the very bottom for final cascade priority === */
    @keyframes rgLivePulse {
      0% { background-color: rgba(30, 41, 59, 0.5); border-color: #334155; }
      50% { background-color: rgba(74, 222, 128, 0.15); border-color: #4ade80; box-shadow: 0 0 8px rgba(74, 222, 128, 0.4); }
      100% { background-color: rgba(30, 41, 59, 0.5); border-color: #334155; }
    }
    .rg-live-run-active { animation: rgLivePulse 1.5s infinite !important; }
    .rg-live-run-text { color: #4ade80 !important; font-weight: bold !important; }
  `;
}

export default function App() {
  const addressRef = useRef<HTMLInputElement | null>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [siteAddress, setSiteAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [dictationActive, setDictationActive] = useState(false);
  const [dictationBusy, setDictationBusy] = useState(false);
  const [micProcessing, setMicProcessing] = useState(false);
  const [speechHint, setSpeechHint] = useState<string | null>(null);

  const dictationAnchorRef = useRef('');
  const dictationFinalAccumRef = useRef('');
  const listeningRef = useRef(false);
  const dictationSilenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recognitionRef = useRef<any>(null);
  const setJobDescriptionRef = useRef(setJobDescription);
  setJobDescriptionRef.current = setJobDescription;

  const speechCtor = useMemo(() => speechRecognitionCtor(), []);
  const speechSupported = Boolean(speechCtor);
  const [vertical, setVertical] = useState<ScoutVertical>('building');
  const [trades, setTrades] = useState<Set<TradeToken>>(new Set());
  const [bimJson, setBimJson] = useState('');
  const [bimFile, setBimFile] = useState<File | null>(null);
  const [bimUploading, setBimUploading] = useState(false);
  const [bimAutoRunToken, setBimAutoRunToken] = useState(0);
  const [showAddressReminder, setShowAddressReminder] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  // Mission-critical data center cues are auto-detected from the description text (no manual toggle).
  const missionCriticalDc = useMemo(
    () =>
      /\b(tier\s*(?:iii|iv|3|4)|liquid[-\s]?cool|immersion[-\s]?cool|mission[-\s]?critical|hyperscale|colo(?:cation)?|n\s*\+\s*1|2n\b|redundan)/i.test(
        jobDescription,
      ),
    [jobDescription],
  );

  // Vertical classifier: scan the description for energy/compute cues and suggest a vertical.
  const detectedVertical = useMemo<ScoutVertical | null>(() => {
    const t = jobDescription.toLowerCase();
    if (/\b(crypto|bitcoin|mining|asic|compute\s*cluster)\b/.test(t)) {
      return 'ai_crypto_compute';
    }
    if (/\b(bess|battery\s*storage|lithium|nfpa\s*855|ess)\b/.test(t)) {
      return 'bess';
    }
    return null;
  }, [jobDescription]);

  // Auto-select the matched vertical when a new energy/compute cue is detected.
  useEffect(() => {
    if (detectedVertical) setVertical(detectedVertical);
  }, [detectedVertical]);

  const [running, setRunning] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [reasoning, setReasoning] = useState<string>('');
  const [visionText, setVisionText] = useState<string>('');
  const [steps, setSteps] = useState<Record<string, StepBlock | Record<string, unknown>>>({});
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  const [summaryMd, setSummaryMd] = useState('');
  const [contractorActionPlan, setContractorActionPlan] = useState('');
  const [researchValue, setResearchValue] = useState<number | null>(null);
  const [liabilityAvoided, setLiabilityAvoided] = useState<number | null>(null);
  const [jurisdictionLabel, setJurisdictionLabel] = useState<string>('');
  const [streamStatus, setStreamStatus] = useState<string>('');

  const [futureRisk, setFutureRisk] = useState<unknown | null>(null);
  const [, setCommunityNotes] = useState<unknown[] | null>(null);
  const [complete, setOpenComplete] = useState<SseEnvelope | null>(null);

  const placesReady = useMemo(() => typeof window !== 'undefined' && !!window.google?.maps?.places, []);

  useEffect(() => {
    if (!speechCtor) {
      recognitionRef.current = null;
      return;
    }

    const transcriptFor = (r: SpeechRecognitionResult): string => {
      try {
        const a = typeof r.item === 'function' ? r.item(0) : undefined;
        const alt = (a ?? r[0]) as SpeechRecognitionAlternative | undefined;
        return typeof alt?.transcript === 'string' ? alt.transcript : '';
      } catch {
        return '';
      }
    };

    let rec: any;
    try {
      rec = new speechCtor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = 'en-US';
    } catch (e) {
      recognitionRef.current = null;
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[RegGuard speech] engine init failed', msg);
      return;
    }

    rec.onresult = (ev: SpeechRecognitionEvent) => {
      try {
        let newFinalChunk = '';
        let interimChunk = '';
        for (let i = ev.resultIndex; i < ev.results.length; i++) {
          const r = ev.results[i];
          const txt = transcriptFor(r);
          if (r.isFinal) newFinalChunk += txt;
          else interimChunk += txt;
        }
        dictationFinalAccumRef.current += newFinalChunk;
        const nextText =
          dictationAnchorRef.current + dictationFinalAccumRef.current + interimChunk;
        setJobDescriptionRef.current(nextText);

        scheduleDictationSilenceStop({
          timerRef: dictationSilenceTimerRef,
          silenceMs: DICTATION_SILENCE_MS,
          isListening: () => listeningRef.current,
          stopRecognition: () => {
            listeningRef.current = false;
            stopRecognitionSafe(recognitionRef.current);
          },
          onSilenceStop: () => {
            setDictationActive(false);
            setMicProcessing(true);
            setSpeechHint('Processing…');
          },
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[RegGuard speech] onresult failed', msg);
      }
    };

    rec.onerror = (ev: SpeechRecognitionErrorEvent) => {
      try {
        clearDictationSilenceTimer(dictationSilenceTimerRef);
        if (ev.error === 'audio-capture' || ev.error === 'not-allowed') {
          toast.error(
            `Speech recognition: ${ev.error}. ${((ev as any).message && String((ev as any).message).trim()) || 'Microphone unavailable or blocked for this site.'}`,
          );
        }
        if (ev.error === 'aborted' || ev.error === 'no-speech') {
          return;
        }
        if (ev.error === 'not-allowed') {
          setSpeechHint(
            'Microphone permission denied. Allow microphone access for this site, then try again.',
          );
        } else if (ev.error === 'audio-capture') {
          setSpeechHint('No microphone found or it is busy in another app.');
        } else {
          setSpeechHint(`Voice input paused (${ev.error}). You can keep typing.`);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[RegGuard speech] onerror handler failed', msg);
      } finally {
        listeningRef.current = false;
        setDictationActive(false);
        setDictationBusy(false);
        setMicProcessing(false);
      }
    };

    rec.onend = () => {
      try {
        if (!listeningRef.current) {
          return;
        }
        try {
          recognitionRef.current?.start();
        } catch {
          listeningRef.current = false;
          setDictationActive(false);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[RegGuard speech] onend failed', msg);
      } finally {
        if (!listeningRef.current) {
          setDictationActive(false);
          setDictationBusy(false);
        }
      }
    };

    recognitionRef.current = rec;
    return () => {
      try {
        listeningRef.current = false;
        clearDictationSilenceTimer(dictationSilenceTimerRef);
        stopRecognitionSafe(rec);
      } catch {
        /* noop */
      } finally {
        recognitionRef.current = null;
        setDictationActive(false);
        setDictationBusy(false);
        setMicProcessing(false);
      }
    };
  }, [speechCtor]);

  const toggleDictation = useCallback(() => {
    if (dictationBusy) {
      return;
    }

    if (!speechCtor) {
      setSpeechHint('Voice dictation is not supported in this browser. Try Chrome or Edge.');
      setDictationActive(false);
      setMicProcessing(false);
      return;
    }
    const rec = recognitionRef.current;
    if (!rec) {
      setSpeechHint('Speech engine is not ready yet. Reload the page and try again.');
      setDictationActive(false);
      setMicProcessing(false);
      return;
    }

    if (listeningRef.current) {
      setDictationBusy(true);
      try {
        clearDictationSilenceTimer(dictationSilenceTimerRef);
        listeningRef.current = false;
        stopRecognitionSafe(rec);
        setSpeechHint(null);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        toast.error(msg || 'Could not stop voice dictation.');
      } finally {
        setDictationActive(false);
        setDictationBusy(false);
        setMicProcessing(false);
      }
      return;
    }

    setDictationBusy(true);
    setMicProcessing(false);
    setSpeechHint(null);
    void (async () => {
      try {
        try {
          await warmMicrophonePermission();
        } catch {
          setSpeechHint(
            'Microphone warmup was blocked—you may still get a browser prompt; choose Allow to dictate.',
          );
        }

        dictationAnchorRef.current = jobDescription;
        dictationFinalAccumRef.current = '';
        listeningRef.current = true;

        try {
          rec.continuous = true;
          rec.interimResults = true;
          rec.lang = 'en-US';
          rec.start();
          setDictationActive(true);
          scheduleDictationSilenceStop({
            timerRef: dictationSilenceTimerRef,
            silenceMs: DICTATION_SILENCE_MS,
            isListening: () => listeningRef.current,
            stopRecognition: () => {
              listeningRef.current = false;
              stopRecognitionSafe(recognitionRef.current);
            },
            onSilenceStop: () => {
              setDictationActive(false);
              setMicProcessing(true);
              setSpeechHint('Processing…');
            },
          });
        } catch (startErr) {
          listeningRef.current = false;
          const msg =
            startErr instanceof Error ? startErr.message : String(startErr);
          setSpeechHint(
            msg.trim()
              ? `Could not start the microphone: ${msg}`
              : 'Could not start the microphone. Confirm permissions and try again.',
          );
          setDictationActive(false);
        }
      } catch (e) {
        listeningRef.current = false;
        const msg = e instanceof Error ? e.message : String(e);
        setSpeechHint(msg || 'Voice dictation failed unexpectedly.');
        setDictationActive(false);
        setMicProcessing(false);
      } finally {
        setDictationBusy(false);
      }
    })();
  }, [dictationBusy, jobDescription, speechCtor]);

  const attachAutocomplete = useCallback(() => {
    const input = addressRef.current;
    const maps = window.google?.maps;
    if (!input || !maps?.places) return;

    if (acRef.current) {
      maps.event.clearInstanceListeners(acRef.current);
    }

    const ac = new maps.places.Autocomplete(input, {
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'address_components', 'geometry', 'name'],
    });

    ac.addListener('place_changed', () => {
      const place = ac.getPlace();
      const formatted = (place.formatted_address || '').trim();
      setSiteAddress(formatted);
      setZipCode(pickZipFromPlace(place));
      setClientCity(pickCityFromPlace(place));
    });

    acRef.current = ac;
  }, []);

  const autoDetectLocation = useCallback(() => {
    if (detecting) {
      return;
    }
    if (!navigator.geolocation?.getCurrentPosition) {
      toast.error('Geolocation is not supported by your browser.');
      setDetecting(false);
      return;
    }

    setDetecting(true);
    try {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const q = new URLSearchParams({
              latitude: String(latitude),
              longitude: String(longitude),
            });
            const res = await fetchWithTimeout(
              `${backendUrl('/reverse-geocode-address')}?${q}`,
              { cache: 'no-store', timeoutMs: 12_000 },
            );
            if (!res.ok) {
              // Reverse geocode unavailable — notify gracefully and leave the fields for manual entry.
              toast.info('Could not auto-detect your address — please enter the site address manually.');
              return;
            }
            const data = (await res.json()) as {
              formatted_address?: string;
              zip?: string;
              city?: string;
            };
            const formatted = (data.formatted_address ?? '').trim();
            const zip = (data.zip ?? '').trim();
            if (!formatted || zip.length !== 5) {
              toast.info('Could not decode your GPS fix — please enter the site address manually.');
              return;
            }
            setSiteAddress(formatted);
            setZipCode(zip);
            if (data.city?.trim()) setClientCity(data.city.trim());
            toast.success('Location detected from GPS');
          } catch {
            // Network/parse failure — do not autofill; let the user type the address.
            toast.info('Could not resolve your location — please enter the site address manually.');
          } finally {
            setDetecting(false);
          }
        },
        (err) => {
          const reason = err.message?.trim()
            ? `Location unavailable: ${err.message}.`
            : 'Location permission denied or timed out.';
          toast.warning(`${reason} Enter the site address manually, then try again.`);
          setDetecting(false);
        },
        {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 0,
        },
      );
    } catch {
      toast.error('Could not start geolocation — please enter the site address manually.');
      setDetecting(false);
    }
  }, [detecting]);

  const toggleTrade = (t: TradeToken) => {
    setTrades((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const applyFinalizedResearchPayload = useCallback((raw: unknown) => {
    console.log('RAW BACKEND PAYLOAD RECEIVED:', raw);
    if (!raw || typeof raw !== 'object') return false;
    const data = raw as Record<string, unknown>;
    const vm = resolveValueMetrics(data);

    const researchVal = coerceResearchMetric(
      data.researchValue,
      data.research_value,
      data.research_value_usd,
      vm.researchValue,
      vm.research_value,
      vm.research_value_usd,
    );
    const liabilityVal = coerceResearchMetric(
      data.liabilityAvoided,
      data.liability_avoided,
      data.liability_avoided_usd,
      data.estimated_liability_avoided,
      data.estimated_liability_avoided_usd,
      vm.liabilityAvoided,
      vm.liability_avoided,
      vm.liability_avoided_usd,
      vm.estimated_liability_avoided,
      vm.estimated_liability_avoided_usd,
    );
    const plan = resolveActionPlanText(data);

    setResearchValue(researchVal);
    setLiabilityAvoided(liabilityVal);
    if (plan.trim()) {
      setContractorActionPlan(plan);
      setSummaryMd(plan);
    }

    const applied =
      plan.trim().length > 0 ||
      researchVal > 0 ||
      liabilityVal > 0 ||
      Boolean(data.value_metrics) ||
      data.event === 'complete';

    const completeEnvelope: SseEnvelope = {
      ...(data as SseEnvelope),
      event: 'complete',
      summary: plan.trim() ? plan : (data.summary as string | undefined),
      value_metrics: {
        research_value_usd: researchVal,
        estimated_liability_avoided_usd: liabilityVal,
        ...(typeof data.value_metrics === 'object' && data.value_metrics
          ? (data.value_metrics as SseEnvelope['value_metrics'])
          : {}),
      },
    };
    setOpenComplete(completeEnvelope);

    return applied;
  }, []);

  const resetRunState = () => {
    setReasoning('');
    setVisionText('');
    setSteps({});
    setOpenSteps({});
    setSummaryMd('');
    setContractorActionPlan('');
    setResearchValue(null);
    setLiabilityAvoided(null);
    setJurisdictionLabel('');
    setStreamStatus('');
    setFutureRisk(null);
    setCommunityNotes(null);
    setOpenComplete(null);
  };

  const runResearch = async () => {
    const addr = siteAddress.trim();
    if (!addr) {
      toast.warning('Select a U.S. job site from address suggestions or use Auto-Detect.');
      return;
    }
    let z = zipCode.trim();
    if (!/^\d{5}(-\d{4})?$/.test(z.replace(/\s+/g, ''))) {
      toast.warning('Enter a valid 5-digit ZIP.');
      return;
    }
    z = z.replace(/\s+/g, '');
    if (z.includes('-')) z = z.slice(0, 5);

    resetRunState();
    setRunning(true);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    const fd = new FormData();
    fd.set('zip_code', z);
    fd.set('client_city', clientCity.trim());
    fd.set('site_address', addr);
    fd.set('job_description', jobDescription);
    fd.set('search_limit', '12'); 
    fd.set('scout_vertical', vertical);
    fd.set('mission_critical_dc', missionCriticalDc ? 'true' : 'false');
    const tradeCsv = Array.from(trades).join(',');
    fd.set('scout_trades', tradeCsv);
    const bimPayload = bimBridgeJsonForFormData(bimJson);
    if (bimPayload) fd.set('bim_bridge_json', bimPayload);
    // Omit `image` when empty — zero-byte or name-only parts can stall multipart parsing / photo-audit branch.
    if (imageFile && imageFile.size > 0 && imageFile.name.trim()) {
      fd.set('image', imageFile, imageFile.name);
    }

    const onData = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const msg = raw as SseEnvelope;
      const ev = msg.event || '';

      if (ev === 'error') {
        toast.error(msg.message || 'Research error');
        return;
      }
      if (ev === 'warning') {
        markStreamProgress();
        const warnMsg =
          typeof msg.message === 'string' && msg.message.trim()
            ? msg.message.trim()
            : 'Research warning';
        toast.info(warnMsg);
        if (msg.code === 'zip_corrected' && typeof msg.zip_used === 'string') {
          const zu = msg.zip_used.trim();
          if (/^\d{5}$/.test(zu)) setZipCode(zu);
        }
        return;
      }
      if (
        ev === 'open' ||
        ev === 'heartbeat' ||
        ev === 'reasoning' ||
        ev === 'context' ||
        ev === 'jurisdiction'
      ) {
        markStreamProgress();
      }
      if (ev === 'reasoning') {
        const line =
          msg.phase && msg.text
            ? `[${msg.phase}] ${msg.text}`
            : msg.text || JSON.stringify(msg);
        setReasoning((prev) => (prev ? `${prev}\n${line}` : line));
        return;
      }
      if (ev === 'jurisdiction') {
        const prof = msg.profile as Record<string, unknown> | undefined;
        const lab = prof && typeof prof.label === 'string' ? prof.label : '';
        if (lab) setJurisdictionLabel(lab);
        // Extract company_name from profile if available
        const company = prof && typeof prof.company_name === 'string' ? prof.company_name : null;
        if (company) setCompanyName(company);
        return;
      }
      if (ev === 'step') {
        const key = String(msg.step || '');
        const data = msg.data;
        if (key && data && typeof data === 'object') {
          markStreamProgress();
          setSteps((prev) => ({ ...prev, [key]: data as StepBlock }));
          setOpenSteps((prev) => ({ ...prev, [key]: true }));
        }
        return;
      }
      if (ev === 'future_risk_alert') {
        setFutureRisk(msg.payload ?? null);
        return;
      }
      if (ev === 'community_inspector_feedback') {
        if (Array.isArray(msg.notes)) setCommunityNotes(msg.notes);
        return;
      }
      if (ev === 'summary_delta' && msg.text) {
        markStreamProgress();
        setSummaryMd((prev) => {
          const next = prev + msg.text;
          setContractorActionPlan(next);
          return next;
        });
        return;
      }
      if (ev === 'vision_delta' && msg.text) {
        setVisionText((prev) => prev + msg.text);
        return;
      }
      if (ev === 'visual_audit') {
        return;
      }
      if (ev === 'complete') {
        markStreamProgress();
        applyFinalizedResearchPayload(msg);
      }
    };

    const streamProgressRef = { current: false };
    let staticFallbackStarted = false;

    const markStreamProgress = () => {
      streamProgressRef.current = true;
    };

    const applyStaticResearchPayload = (data: Record<string, unknown>) => {
      const stepsMap = data.scout_steps;
      if (stepsMap && typeof stepsMap === 'object' && !Array.isArray(stepsMap)) {
        setSteps(stepsMap as Record<string, StepBlock>);
        setOpenSteps(
          Object.fromEntries(Object.keys(stepsMap as Record<string, unknown>).map((k) => [k, true])),
        );
      }
      if (typeof data.ahj_label === 'string' && data.ahj_label.trim()) {
        setJurisdictionLabel(data.ahj_label);
      }
      if (data.future_risk_alert != null) {
        setFutureRisk(data.future_risk_alert);
      }
      const notes = data.community_inspector_feedback;
      if (Array.isArray(notes)) {
        setCommunityNotes(notes);
      }
      applyFinalizedResearchPayload(data);
      onData(data);
    };

    const fetchStaticResearchFallback = async () => {
      if (staticFallbackStarted || streamProgressRef.current) return;
      staticFallbackStarted = true;
      // End the SSE connection only; static POST must not reuse the stream's aborted signal.
      abortRef.current?.abort();
      const staticCtrl = new AbortController();
      const staticWatchdog = window.setTimeout(() => {
        staticCtrl.abort(new DOMException('Static research timed out', 'TimeoutError'));
      }, RESEARCH_STREAM_FALLBACK_MS);
      try {
        const res = await fetch(backendUrl('/research/static'), {
          method: 'POST',
          body: fd,
          signal: staticCtrl.signal,
          credentials: 'include',
        });
        if (!res.ok) {
          const t = await res.text().catch(() => '');
          throw new Error(t || `Static research HTTP ${res.status}`);
        }
        const data = (await res.json()) as Record<string, unknown>;
        console.log('RAW BACKEND PAYLOAD RECEIVED:', data);
        applyStaticResearchPayload(data);
        streamProgressRef.current = true;
        toast.info('Research loaded via static fallback');
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast.error((err as Error).message || 'Static research fallback failed');
        }
      } finally {
        window.clearTimeout(staticWatchdog);
      }
    };

    const fallbackTimer = window.setTimeout(() => {
      void fetchStaticResearchFallback();
    }, RESEARCH_STREAM_FALLBACK_MS);

    const appendActionPlanText = (fragment: string) => {
      const piece = fragment || '';
      if (!piece.trim()) return;
      markStreamProgress();
      setSummaryMd((prev) => {
        const next = prev + piece;
        setContractorActionPlan(next);
        return next;
      });
    };

    let sseLineBuffer = '';

    const processSseLine = (line: string) => {
      const payload = normalizeSsePayloadLine(line);
      if (!payload || payload === '[DONE]') return;

      try {
        let parsed: unknown = null;
        if (payload.startsWith('{') || payload.startsWith('[')) {
          parsed = parseSseJsonPayload(payload);
          if (parsed == null) {
            try {
              parsed = JSON.parse(payload) as unknown;
            } catch {
              parsed = null;
            }
          }
        }

        if (parsed != null && typeof parsed === 'object') {
          onData(parsed);
          if (
            !Array.isArray(parsed) &&
            looksLikeCompleteResearchBlock(parsed as Record<string, unknown>)
          ) {
            applyFinalizedResearchPayload(parsed);
          }
          return;
        }
      } catch (err) {
        console.warn('[RegGuard SSE] line parse failed, appending raw fragment', err);
      }

      try {
        const fallback = extractTrailingJsonObject(payload);
        if (fallback && looksLikeCompleteResearchBlock(fallback)) {
          onData(fallback);
          applyFinalizedResearchPayload(fallback);
          return;
        }
      } catch {
        /* ignore */
      }

      if (/[A-Za-z0-9]/.test(payload)) {
        appendActionPlanText(payload.endsWith('\n') ? payload : `${payload}\n`);
      }
    };

    const ingestSseChunk = (chunk: string) => {
      if (!chunk) return;
      try {
        sseLineBuffer += chunk;
        const lines = sseLineBuffer.split(/\r?\n/);
        sseLineBuffer = lines.pop() ?? '';
        for (const line of lines) {
          try {
            processSseLine(line);
          } catch (err) {
            console.warn('[RegGuard SSE] processSseLine error, raw append', err);
            appendActionPlanText(`${line}\n`);
          }
        }
      } catch (err) {
        console.warn('[RegGuard SSE] chunk ingest failed, raw append', err);
        appendActionPlanText(chunk);
      }
    };

    const flushSseBuffer = () => {
      if (sseLineBuffer.trim()) {
        try {
          processSseLine(sseLineBuffer);
        } catch {
          appendActionPlanText(sseLineBuffer);
        }
        sseLineBuffer = '';
      }
    };

    const consumeResearchPostStream = async (res: Response) => {
      const cityHint =
        clientCity.trim() ||
        siteAddress.split(',')[0]?.trim() ||
        zipCode.trim() ||
        'Plano';
      setStreamStatus(`Streaming active data from ${cityHint}…`);
      markStreamProgress();

      const reader = res.body?.getReader();
      if (!reader) {
        throw new Error('Research stream returned no response body.');
      }

      const decoder = new TextDecoder();
      while (true) {
        let done = false;
        let value: Uint8Array | undefined;
        try {
          ({ done, value } = await reader.read());
        } catch (readErr) {
          console.warn('[RegGuard SSE] reader.read failed', readErr);
          break;
        }
        if (done) break;
        if (!value?.length) continue;

        let text = '';
        try {
          text = decoder.decode(value, { stream: true });
        } catch (decodeErr) {
          console.warn('[RegGuard SSE] TextDecoder failed, skipping chunk', decodeErr);
          continue;
        }

        try {
          ingestSseChunk(text);
        } catch (chunkErr) {
          console.warn('[RegGuard SSE] ingest failed, appending raw chunk', chunkErr);
          appendActionPlanText(text);
        }
      }

      try {
        const tail = decoder.decode();
        if (tail) ingestSseChunk(tail);
      } catch {
        /* ignore */
      }
      flushSseBuffer();
    };

    try {
      const res = await fetch(backendUrl('/research'), {
        method: 'POST',
        body: fd,
        signal,
        credentials: 'include',
      });

      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `Research stream HTTP ${res.status}`);
      }

      await consumeResearchPostStream(res);
      setStreamStatus('');
      if (!streamProgressRef.current && !staticFallbackStarted) {
        await fetchStaticResearchFallback();
      } else {
        toast.success('Research stream finished');
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        if (!staticFallbackStarted) {
          await fetchStaticResearchFallback();
        }
      } else {
        toast.error((e as Error).message || 'Research failed');
        if (!streamProgressRef.current) {
          await fetchStaticResearchFallback();
        }
      }
    } finally {
      window.clearTimeout(fallbackTimer);
      setStreamStatus('');
      setRunning(false);
      abortRef.current = null;
    }
  };

  const cancelRun = () => abortRef.current?.abort();

  // Keep a live handle so the post-upload auto-run effect calls runResearch with fresh form state.
  const runResearchRef = useRef(runResearch);
  runResearchRef.current = runResearch;

  const uploadBimFile = useCallback(async (file: File) => {
    if (!file || file.size <= 0) {
      setBimFile(null);
      return;
    }
    setBimFile(file);
    setBimUploading(true);
    try {
      const formData = new FormData();
      formData.append('upload_file', file);
      const res = await fetch(backendUrl('/v1/bim/extract-metadata'), {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(t || `BIM metadata HTTP ${res.status}`);
      }
      const data = (await res.json()) as {
        jobDescription?: string;
        vertical?: string;
        suggestedTrade?: string;
      };
      if (typeof data.jobDescription === 'string' && data.jobDescription.trim()) {
        setJobDescription(data.jobDescription.trim());
      }
      const v = (data.vertical || '').trim();
      if (
        v === 'building' ||
        v === 'infrastructure' ||
        v === 'data_center' ||
        v === 'ai_crypto_compute' ||
        v === 'bess'
      ) {
        setVertical(v);
      }
      const trade = (data.suggestedTrade || '').trim() as TradeToken;
      if (TRADE_OPTIONS.some((opt) => opt.id === trade)) {
        setTrades(new Set<TradeToken>([trade]));
      }
      toast.success(`BIM metadata extracted from ${file.name}`);
      // Defer the agent sweep to the effect below so it sees the just-applied form state.
      setBimAutoRunToken((n) => n + 1);
    } catch (err) {
      toast.error((err as Error).message || 'BIM metadata extraction failed');
    } finally {
      setBimUploading(false);
    }
  }, []);

  useEffect(() => {
    if (bimAutoRunToken === 0) return;
    // Only auto-run the agent once a valid site address is present; otherwise prompt for it.
    if (!siteAddress.trim()) {
      setShowAddressReminder(true);
      return;
    }
    setShowAddressReminder(false);
    void runResearchRef.current();
    // runResearchRef is a stable ref; trigger strictly on the upload token bump.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bimAutoRunToken]);

  const downloadPermitPackage = async () => {
    const c = complete;
    if (!c) {
      toast.warning('Run research first — nothing to export yet.');
      return;
    }
    const addr = siteAddress.trim();
    const city = clientCity.trim();
    const zip = zipCode.trim();
    const ahj = jurisdictionLabel.trim();
    if (!addr) {
      toast.warning('Enter or select a job site address before downloading the permit PDF.');
      return;
    }
    const feeSummary =
      summaryMd.split('### Permit Costs')[1]?.split('###')[0]?.trim().slice(0, 4000) ||
      'See Contractor Action Plan — permit fees section.';
    try {
      const res = await axios.post<Blob>(
        backendUrl('/permit-package'),
        {
          site_address: addr,
          scope: (jobDescription || 'Electrical / panel scope — see memo.').slice(0, 4000),
          fee_summary: feeSummary,
          trade: 'Electrical',
          zip: zip || String(c.zip ?? ''),
          city: city || String(c.city ?? ''),
          county: String(c.county ?? ''),
          ahj_label: ahj || String(c.ahj_label ?? ''),
          company_name: companyName || 'Bondale Contractors Inc',
        },
        { responseType: 'blob' },
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'RegGuard-permit-application-package.pdf';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Permit package downloaded');
    } catch {
      toast.error('Permit package download failed');
    }
  };

  const stepKeys = useMemo(() => Object.keys(steps).sort(), [steps]);

  const bottomLine = useMemo(() => {
    const md = (contractorActionPlan || summaryMd || '').trim();
    if (!md) return '';
    const lines = md.split(/\r?\n/);
    const headingIdx = lines.findIndex(
      (l) => /^#{1,6}\s+.*bottom line/i.test(l.trim()) || /^\*\*\s*bottom line/i.test(l.trim()),
    );
    const cleanEcho = (s: string) =>
      s
        .replace(/\[job description \(voice or typed\)\]/gi, 'Job Description:')
        .replace(/\bvoiced or typed\b/gi, '')
        .replace(/\bvoice or typed\b/gi, '')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
    const stripMd = (s: string) =>
      cleanEcho(s.replace(/^#{1,6}\s*/, '').replace(/[*_`>]/g, '')).trim();
    if (headingIdx === -1) {
      const firstPara = lines.find((l) => l.trim() && !l.trim().startsWith('#'));
      return firstPara ? stripMd(firstPara) : '';
    }
    const collected: string[] = [];
    for (let i = headingIdx + 1; i < lines.length; i++) {
      const t = lines[i].trim();
      if (/^#{1,6}\s/.test(t)) break;
      collected.push(lines[i]);
    }
    const body = collected.join('\n').trim();
    return (body ? stripMd(body) : stripMd(lines[headingIdx])).replace(/\n{2,}/g, '\n').trim();
  }, [contractorActionPlan, summaryMd]);

  const cleanPlanMd = useMemo(
    () => sanitizeActionPlanMarkdown(contractorActionPlan || summaryMd),
    [contractorActionPlan, summaryMd],
  );

  // Auto-extract up to 3 critical triage items from the live action-plan stream.
  const triageItems = useMemo(() => {
    const md = contractorActionPlan || summaryMd || '';
    if (!md.trim()) return [] as string[];
    const kw = /\b(mandatory|ordinance|fee)\b/i;
    const seen = new Set<string>();
    const items: string[] = [];
    for (const rawLine of md.split(/\r?\n/)) {
      const line = rawLine
        .trim()
        .replace(/^[-*+]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .replace(/^#{1,6}\s+/, '')
        .replace(/[*_`>]/g, '')
        .trim();
      if (!line || !kw.test(line)) continue;
      const key = line.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(line);
      if (items.length >= 3) break;
    }
    return items;
  }, [contractorActionPlan, summaryMd]);

  const downloadPunchList = useCallback(() => {
    const md = cleanPlanMd.trim();
    if (!md) {
      toast.warning('Run research first — the punch list is empty.');
      return;
    }
    try {
      downloadActionPlanPdf({
        markdown: md,
        siteAddress: siteAddress.trim() || (complete?.site_address as string) || null,
        zip: zipCode.trim() || complete?.zip || null,
        city: clientCity.trim() || complete?.city || null,
        county: complete?.county || null,
        jobDescription: jobDescription.trim() || null,
        companyName: companyName || null,
      });
      toast.success('Punch list PDF generated');
    } catch {
      toast.error('Punch list PDF generation failed');
    }
  }, [cleanPlanMd, siteAddress, zipCode, clientCity, complete, jobDescription, companyName]);

  return (
    <>
      <style>{styles()}</style>
      <div className="rg-shell" data-version="2.0.1-red-alert">
        <header className="rg-header">
          <div className="rg-brand">
            <Shield size={18} color="#3d4f8f" />
            <div>
              <div className="rg-title">Reg Guard Agent</div>
              <div className="rg-sub">
                Autonomous domain orchestration framework
                <span
                  style={{ marginLeft: 6, opacity: 0.45, fontSize: '0.72rem', fontWeight: 500 }}
                >
                  • Build v2.0.1-PlanoSafe
                </span>
              </div>
            </div>
          </div>
          <div className="rg-pill" style={{ borderColor: 'rgba(74, 222, 128, 0.4)', background: 'rgba(74, 222, 128, 0.05)' }}>
            <div className="rg-pulse-dot" style={{ marginRight: 4 }}></div>
            <span style={{ color: '#4ade80', fontWeight: 600 }}>
              {running
                ? 'RegGuard is gathering data from all relevant regulatory entities'
                : 'RegGuard gathers data from all relevant regulatory entities'}
            </span>
          </div>
        </header>

        <div className="rg-main">
          <section className="rg-panel">
            <div className="rg-panel-hd" style={{ justifyContent: 'space-between' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <MapPin size={16} />
                Job context
              </span>
              <button 
                type="button" 
                className="rg-btn rg-btn2" 
                style={{ fontSize: '0.72rem', padding: '4px 8px', borderRadius: '8px' }}
                onClick={autoDetectLocation}
                disabled={detecting}
              >
                {detecting ? <Loader2 className="spin" size={12} /> : <Compass size={12} style={{ marginRight: 4 }} />}
                Auto-Detect
              </button>
            </div>
            <div className="rg-panel-bd">
              <label className="rg-lbl" htmlFor="addr">
                U.S. site address (Google Places)
              </label>
              <input
                id="addr"
                ref={(el) => {
                  addressRef.current = el;
                  if (el && placesReady && !acRef.current) attachAutocomplete();
                }}
                className="rg-input"
                placeholder="Start typing or click Auto-Detect"
                value={siteAddress}
                onChange={(e) => {
                  setSiteAddress(e.target.value);
                  if (e.target.value.trim()) setShowAddressReminder(false);
                }}
                onFocus={() => {
                  if (placesReady) attachAutocomplete();
                }}
                autoComplete="off"
              />
              {showAddressReminder && (
                <div className="rg-addr-reminder" role="status">
                  ✨ Technical parameters extracted from file! Enter site address to complete compliance run.
                </div>
              )}

              <div className="rg-row2">
                <div>
                  <label className="rg-lbl" htmlFor="zip">
                    ZIP (5 digits)
                  </label>
                  <input
                    id="zip"
                    className="rg-input"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    inputMode="numeric"
                    placeholder="e.g., 75074"
                  />
                </div>
                <div>
                  <label className="rg-lbl" htmlFor="city">
                    Client city (optional)
                  </label>
                  <input
                    id="city"
                    className="rg-input"
                    value={clientCity}
                    onChange={(e) => setClientCity(e.target.value)}
                    placeholder="City boundary"
                  />
                </div>
              </div>

              <div className="rg-job-desc-head">
                <label className="rg-lbl" htmlFor="jd">
                  Job description / voice capture
                </label>
                <button
                  type="button"
                  className={`rg-mic-btn${dictationActive ? ' rg-mic-btn--active' : ''}${micProcessing || dictationBusy ? ' rg-mic-btn--processing' : ''}`}
                  title={
                    dictationActive
                      ? 'Listening (stops after 6s silence)'
                      : micProcessing || dictationBusy
                        ? 'Processing…'
                        : 'Dictate with microphone'
                  }
                  aria-label={
                    dictationActive
                      ? 'Stop voice dictation'
                      : micProcessing || dictationBusy
                        ? 'Voice processing'
                        : 'Start voice dictation'
                  }
                  aria-pressed={dictationActive}
                  disabled={running || !speechSupported || dictationBusy}
                  onClick={() => toggleDictation()}
                >
                  {dictationActive ? (
                    <span className="rg-mic-pulse" aria-hidden />
                  ) : micProcessing || dictationBusy ? (
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em' }} aria-hidden>
                      ⋯
                    </span>
                  ) : (
                    <Mic size={18} strokeWidth={2} aria-hidden />
                  )}
                </button>
              </div>
              {!speechSupported ? (
                <p className="rg-small" style={{ margin: '0 0 6px' }}>
                  Voice dictation requires Chrome or Edge (Web Speech API).
                </p>
              ) : null}
              {speechHint ? (
                <p id="jd-speech-hint" className="rg-speech-hint" role="status">
                  {speechHint}
                </p>
              ) : null}
              <textarea
                id="jd"
                className={`rg-ta${dictationActive ? ' rg-ta--dictating' : ''}`}
                value={jobDescription}
                disabled={running}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Type or tap the mic: trades, scope, timelines, AHJ questions…"
                aria-describedby={speechHint ? 'jd-speech-hint' : undefined}
              />

              <label className="rg-lbl" htmlFor="vert">
                Scout vertical
              </label>
              <select
                id="vert"
                className="rg-select"
                value={vertical}
                onChange={(e) => setVertical(e.target.value as ScoutVertical)}
              >
                <option value="building">Building (default)</option>
                <option value="infrastructure">Infrastructure / critical</option>
                <option value="data_center">Data Center</option>
                <option value="ai_crypto_compute">AI Crypto Mining / Compute Clusters</option>
                <option value="bess">BESS (Battery Energy Storage Systems)</option>
              </select>

              <label className="rg-lbl">Scout trades augment</label>
              <div className="rg-chips">
                {TRADE_OPTIONS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`rg-chip ${trades.has(t.id) ? 'on' : ''}`}
                    onClick={() => toggleTrade(t.id)}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <label className="rg-lbl" htmlFor="bim">
                Optional BIM bridge JSON (POST /bim/import payload)
              </label>
              <textarea
                id="bim"
                className="rg-ta"
                style={{ minHeight: 60 }}
                value={bimJson}
                onChange={(e) => setBimJson(e.target.value)}
                placeholder="Paste BIM import JSON (optional)"
              />

              <label className="rg-bim-dropzone" htmlFor="bim-file">
                <input
                  id="bim-file"
                  type="file"
                  accept=".rvt,.ifc"
                  disabled={bimUploading || running}
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const picked = e.target.files?.[0] ?? null;
                    if (picked && picked.size > 0) {
                      void uploadBimFile(picked);
                    } else {
                      setBimFile(null);
                    }
                    e.target.value = '';
                  }}
                />
                <span className="rg-bim-dropzone-text">
                  {bimUploading
                    ? `Extracting metadata from ${bimFile?.name ?? 'model'}…`
                    : bimFile
                      ? `Selected: ${bimFile.name}`
                      : 'Upload your Revit .rvt or Industry Foundation Classes .ifc files here'}
                </span>
              </label>

              <label className="rg-lbl" htmlFor="img">
                Site photo (Reality Capture & Proximity Boundary Audit)
              </label>
              <input
                id="img"
                type="file"
                accept="image/*"
                className="rg-input"
                onChange={(e) => {
                  const picked = e.target.files?.[0];
                  setImageFile(picked && picked.size > 0 ? picked : null);
                }}
              />

              <div className="rg-actions">
                <button type="button" className="rg-btn" disabled={running} onClick={runResearch}>
                  {running ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
                  {running ? 'Running…' : 'Run Reg Guard Agent'}
                </button>
                <button type="button" className="rg-btn rg-btn2" disabled={!running} onClick={cancelRun}>
                  Cancel
                </button>
              </div>
            </div>
          </section>

          <section className="rg-panel rg-split">
            <div>
              <div className={`rg-panel-hd${running ? ' rg-live-run-active' : ''}`}>
                <CheckCircle2 size={16} />
                Live run
                {jurisdictionLabel ? <span className="rg-pill">{jurisdictionLabel}</span> : null}
                {running ? (
                  <span
                    className="rg-live-run-text"
                    style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '0.78rem' }}
                  >
                    RegGuard is gathering data from all relevant regulatory agencies
                  </span>
                ) : null}
              </div>
              
              <div className="rg-panel-bd rg-live-bd">
                {/* Row 1 — Premium metrics */}
                <div className="rg-metrics-grid">
                  <div className="rg-metric-card">
                    <span className="rg-metric-label" style={{ color: '#3d4f8f' }}>
                      <DollarSign size={12} /> Research Value
                    </span>
                    <span className="rg-metric-value rg-metric-value--green">
                      ${(researchValue ?? complete?.value_metrics?.research_value_usd ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <div className="rg-metric-card">
                    <span className="rg-metric-label" style={{ color: '#a78bfa' }}>
                      <TrendingUp size={12} /> Liability Avoided
                    </span>
                    <span className="rg-metric-value rg-metric-value--cyan">
                      ${(liabilityAvoided ?? complete?.value_metrics?.estimated_liability_avoided_usd ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Row 2 — The Bottom Line (executive triage) */}
                <div className="rg-bottom-line-card">
                  <h2>
                    <AlertTriangle size={16} /> The Bottom Line
                  </h2>
                  {complete?.moratorium_state_alert?.active ? (
                    <div className="rg-danger rg-small" style={{ marginBottom: 8 }}>
                      {complete.moratorium_state_alert.text || 'Moratorium / high-alert signal — review the action plan.'}
                    </div>
                  ) : null}
                  <p className="rg-bottom-line-body rg-text-flow">
                    {bottomLine || 'Awaiting target site stream evaluation…'}
                  </p>
                  {jobDescription.trim() ? (
                    <p className="rg-bottom-line-body rg-text-flow" style={{ marginTop: 8 }}>
                      <strong>Job Description</strong>: {jobDescription.trim()}
                    </p>
                  ) : null}

                  <div className="rg-triage-box">
                    <div className="rg-triage-title">📋 Quick Punch List Triage</div>
                    {triageItems.length ? (
                      <ul className="rg-triage-list">
                        {triageItems.map((item, i) => (
                          <li key={i}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="rg-small">
                        Critical items (mandatory / ordinance / fee) surface here as the action plan streams.
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 3 — Contractor punch list */}
                <div className="rg-punchlist-card">
                  <div className="rg-punchlist-head">
                    <h3>Contractor Punch List</h3>
                    <button
                      type="button"
                      className="rg-btn-punch"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        downloadPunchList();
                      }}
                    >
                      <Download size={12} /> Download Punch List PDF
                    </button>
                  </div>
                  {streamStatus ? (
                    <div
                      className="rg-small"
                      style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#3d4f8f', marginBottom: 10 }}
                    >
                      <Loader2 className="spin" size={14} />
                      {streamStatus}
                    </div>
                  ) : null}
                  <div className="rg-md rg-text-flow">
                    {cleanPlanMd.trim() ? (
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{cleanPlanMd}</ReactMarkdown>
                    ) : (
                      <div className="rg-small">Streaming markdown will appear here (summary_delta events).</div>
                    )}
                  </div>
                </div>

                {/* Row 4 — Master permit package */}
                <button type="button" className="rg-btn-master" onClick={downloadPermitPackage}>
                  <Download size={16} /> Download Master Permit Package PDF
                </button>

                {/* Row 5 — Drill-down diagnostics (reasoning, scout steps, .gov refs) */}
                <details className="rg-drilldown-drawer">
                  <summary className="rg-drilldown-summary">
                    <span className="rg-drilldown-title">Drill down for more detail</span>
                    <span className="rg-drilldown-chevron">▼</span>
                  </summary>
                  <div className="rg-drilldown-content">
                    {futureRisk && typeof futureRisk === 'object' && (futureRisk as { active?: boolean }).active ? (
                      <div className="rg-warn" style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <AlertTriangle size={16} />
                        <div>
                          <strong>Future risk alert</strong>
                          <div className="rg-small">Code-cycle signals detected in scout snippets — verify AHJ adoption dates.</div>
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="rg-lbl" style={{ marginTop: 0 }}>
                        Reasoning trace
                      </div>
                      <div className="rg-reason rg-text-flow">{reasoning || '— waiting for scout / audit phases —'}</div>
                    </div>

                    {visionText ? (
                      <div>
                        <div className="rg-lbl" style={{ marginTop: 0 }}>
                          Reality Capture Image Audit
                        </div>
                        <div className="rg-reason rg-text-flow" style={{ maxHeight: 90, borderColor: 'rgba(167,139,250,0.3)' }}>
                          {visionText}
                        </div>
                      </div>
                    ) : null}

                    <div>
                      <div className="rg-lbl" style={{ marginTop: 0 }}>
                        Scout steps &amp; .gov references
                      </div>
                      <div className="rg-steps" style={{ padding: 12 }}>
                  {stepKeys.length === 0 ? (
                    <div className="rg-small">Step payloads appear as each Firecrawl pass returns.</div>
                  ) : (
                    stepKeys.map((k) => {
                      const block = steps[k] as StepBlock;
                      const hits = Array.isArray(block?.results) ? block.results : [];
                      const open = !!openSteps[k];
                      const label = STEP_LABELS[k] || k;
                      return (
                        <div key={k} className="rg-step">
                          <button type="button" className="rg-step-top" onClick={() => setOpenSteps((p) => ({ ...p, [k]: !open }))}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                              {label}{' '}
                              <span className="rg-small">
                                ({hits.length} hit{hits.length === 1 ? '' : 's'})
                              </span>
                            </span>
                            {block?.fallback_used ? <span className="rg-warn rg-small">fallback</span> : null}
                          </button>
                          {open ? (
                            <div className="rg-step-body rg-text-flow">
                              {block?.query ? (
                                <div className="rg-small" style={{ marginBottom: 8 }}>
                                  <strong>Query</strong>
                                  <div style={{ opacity: 0.9 }}>{block.query}</div>
                                </div>
                              ) : null}
                              {hits.length === 0 ? (
                                <div className="rg-small">No trusted URLs in this pass.</div>
                              ) : (
                                hits.map((h, i) => (
                                  <div key={`${k}-${i}`} className="rg-hit rg-text-flow">
                                    <div>
                                      <strong>{h.title || h.url || '(untitled)'}</strong>
                                    </div>
                                    {h.url ? (
                                      <div className="rg-small">
                                        <a href={h.url} target="_blank" rel="noreferrer">
                                          {h.url}
                                        </a>
                                      </div>
                                    ) : null}
                                    {h.description ? <div className="rg-small">{h.description}</div> : null}
                                  </div>
                                ))
                              )}
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                      )}
                      </div>
                    </div>
                  </div>
                </details>
              </div>
            </div>
          </section>
        </div>
      </div>
      <ToastContainer position="bottom-right" theme="dark" closeOnClick pauseOnHover />
    </>
  );
}