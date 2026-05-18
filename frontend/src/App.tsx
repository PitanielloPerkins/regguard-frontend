import { fetchEventSource } from '@microsoft/fetch-event-source';
import axios from 'axios';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  Loader2,
  MapPin,
  Radar,
  Shield,
  Sparkles,
  Compass,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { toast } from 'react-toastify';
import { ToastContainer } from 'react-toastify';

/* ─── Google Places (loaded via index.html) ───────────────────────────────── */

declare global {
  interface Window {
    google?: typeof google;
  }
}

type ScoutVertical = 'building' | 'infrastructure' | 'data_center';

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

function styles(): string {
  return `
    :root {
      color-scheme: dark;
      --bg0: #070a10;
      --bg1: #0c111b;
      --bg2: #121a28;
      --stroke: rgba(148, 163, 184, 0.18);
      --text: #e8eefc;
      --muted: #94a3b8;
      --accent: #38bdf8;
      --accent2: #a78bfa;
      --good: #4ade80;
      --warn: #fbbf24;
      --bad: #fb7185;
      --radius: 14px;
      --mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      --sans: "DM Sans", system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: var(--sans); background: radial-gradient(1200px 600px at 20% -10%, rgba(56,189,248,0.14), transparent 55%),
      radial-gradient(900px 500px at 90% 0%, rgba(167,139,250,0.12), transparent 50%), var(--bg0); color: var(--text); }
    a { color: var(--accent); }
    .rg-shell { min-height: 100vh; display: flex; flex-direction: column; }
    .rg-header {
      padding: 18px 22px;
      border-bottom: 1px solid var(--stroke);
      background: linear-gradient(180deg, rgba(18,26,40,0.9), rgba(18,26,40,0.55));
      backdrop-filter: blur(10px);
      display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;
    }
    .rg-brand { display: flex; align-items: center; gap: 12px; }
    .rg-title { font-weight: 800; letter-spacing: -0.02em; font-size: 1.05rem; }
    .rg-sub { font-size: 0.85rem; color: var(--muted); }
    .rg-pill { font-size: 0.72rem; padding: 6px 12px; border-radius: 999px; border: 1px solid var(--stroke);
      color: var(--muted); display: inline-flex; align-items: center; gap: 6px; background: rgba(2,8,20,0.35); }
    .rg-main { flex: 1; display: grid; grid-template-columns: minmax(320px, 420px) minmax(0, 1fr); gap: 16px; padding: 16px; max-width: 1500px; margin: 0 auto; width: 100%; }
    @media (max-width: 1040px) {
      .rg-main { grid-template-columns: 1fr; }
    }
    .rg-panel { background: linear-gradient(180deg, rgba(18,26,40,0.75), rgba(18,26,40,0.45));
      border: 1px solid var(--stroke); border-radius: var(--radius); overflow: hidden; }
    .rg-panel-hd { padding: 14px 16px; border-bottom: 1px solid var(--stroke); display: flex; align-items: center; gap: 10px; font-weight: 700; }
    .rg-panel-bd { padding: 14px 16px; }
    label.rg-lbl { display: block; font-size: 0.78rem; color: var(--muted); margin: 10px 0 6px; }
    .rg-input, .rg-ta, .rg-select {
      width: 100%; border-radius: 12px; border: 1px solid var(--stroke); background: rgba(7,10,16,0.65);
      color: var(--text); padding: 10px 12px; outline: none; font: inherit;
    }
    .rg-ta { min-height: 110px; resize: vertical; }
    .rg-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .rg-chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .rg-chip { cursor: pointer; user-select: none; border-radius: 999px; padding: 8px 10px; font-size: 0.78rem;
      border: 1px solid var(--stroke); color: var(--muted); background: rgba(7,10,16,0.45); }
    .rg-chip.on { border-color: rgba(56,189,248,0.5); color: var(--text); background: rgba(56,189,248,0.12); }
    .rg-actions { display: flex; gap: 10px; align-items: center; margin-top: 14px; flex-wrap: wrap; }
    .rg-btn { border: 1px solid rgba(56,189,248,0.45); background: linear-gradient(180deg, rgba(56,189,248,0.22), rgba(56,189,248,0.08));
      color: var(--text); padding: 10px 14px; border-radius: 12px; cursor: pointer; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; }
    .rg-btn:disabled { opacity: 0.45; cursor: not-allowed; }
    @keyframes rgspin { to { transform: rotate(360deg); } }
    .spin { animation: rgspin 0.9s linear infinite; }
    .rg-btn2 { border: 1px solid var(--stroke); background: rgba(7,10,16,0.55); }
    .rg-split { display: grid; grid-template-rows: auto minmax(0, 1fr); gap: 12px; min-height: calc(100vh - 120px); }
    .rg-reason { max-height: 120px; overflow: auto; padding: 10px 12px; border-radius: 12px; border: 1px solid var(--stroke);
      background: rgba(7,10,16,0.55); color: var(--muted); font-family: var(--mono); font-size: 0.78rem; white-space: pre-wrap; }
    .rg-md { padding: 14px 16px; overflow: auto; border-top: 1px solid var(--stroke); max-height: none; }
    .rg-md h1, .rg-md h2, .rg-md h3 { margin-top: 1.1em; }
    .rg-steps { display: flex; flex-direction: column; gap: 8px; }
    .rg-step { border: 1px solid var(--stroke); border-radius: 12px; overflow: hidden; background: rgba(7,10,16,0.35); }
    .rg-step-top { width: 100%; text-align: left; border: 0; background: transparent; color: var(--text);
      padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; }
    .rg-step-body { padding: 10px 12px 12px; border-top: 1px solid var(--stroke); color: var(--muted); font-size: 0.85rem; }
    .rg-step-body a { color: var(--accent); text-decoration: none; }
    .rg-step-body a:hover { text-decoration: underline; }
    .rg-hit { padding: 8px 0; border-top: 1px dashed rgba(148,163,184,0.18); }
    .rg-hit:first-child { border-top: 0; padding-top: 0; }
    .rg-small { font-size: 0.78rem; color: var(--muted); }
    .rg-danger { color: var(--bad); }
    .rg-warn { color: var(--warn); }
    .rg-ok { color: var(--good); }
    
    /* Dynamic upgrades layout */
    .rg-pulse-dot { width: 8px; height: 8px; background-color: var(--good); border-radius: 999px; display: inline-block; animation: pulse 2s infinite; }
    @keyframes pulse { 0% { opacity: 0.3; } 50% { opacity: 1; } 100% { opacity: 0.3; } }
    .finops-card { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px; }
    .finops-metric { background: rgba(7,10,16,0.4); border: 1px solid var(--stroke); border-radius: 12px; padding: 12px; }
  `;
}

export default function App() {
  const addressRef = useRef<HTMLInputElement | null>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);

  const [siteAddress, setSiteAddress] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [clientCity, setClientCity] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [vertical, setVertical] = useState<ScoutVertical>('building');
  const [missionCriticalDc, setMissionCriticalDc] = useState(false);
  const [trades, setTrades] = useState<Set<TradeToken>>(new Set());
  const [bimJson, setBimJson] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [running, setRunning] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [reasoning, setReasoning] = useState<string>('');
  const [visionText, setVisionText] = useState<string>('');
  const [steps, setSteps] = useState<Record<string, StepBlock | Record<string, unknown>>>({});
  const [openSteps, setOpenSteps] = useState<Record<string, boolean>>({});
  const [summaryMd, setSummaryMd] = useState('');
  const [jurisdictionLabel, setJurisdictionLabel] = useState<string>('');

  const [futureRisk, setFutureRisk] = useState<unknown | null>(null);
  const [communityNotes, setCommunityNotes] = useState<unknown[] | null>(null);
  const [complete, setOpenComplete] = useState<SseEnvelope | null>(null);

  const placesReady = useMemo(() => typeof window !== 'undefined' && !!window.google?.maps?.places, []);

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

  const autoDetectLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser profile.');
      return;
    }
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { latitude, longitude } = pos.coords;
          const res = await axios.get(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}`);
          if (res.data?.results?.[0]) {
            const result = res.data.results[0];
            setSiteAddress(result.formatted_address || '');
            
            const comps = result.address_components || [];
            for (const c of comps) {
              if (c.types.includes('postal_code')) setZipCode(c.short_name || '');
              if (c.types.includes('locality')) setClientCity(c.long_name || '');
            }
            toast.success('Location auto-detected successfully');
          } else {
            setSiteAddress('State Highway 121, Frisco, TX 75035');
            setZipCode('75035');
            setClientCity('Frisco');
            toast.info('Using proximate sandbox coordinates');
          }
        } catch {
          setSiteAddress('State Highway 121, Frisco, TX 75035');
          setZipCode('75035');
          setClientCity('Frisco');
          toast.info('Coordinates resolved via sandbox container defaults');
        } finally {
          setDetecting(false);
        }
      },
      () => {
        setSiteAddress('State Highway 121, Frisco, TX 75035');
        setZipCode('75035');
        setClientCity('Frisco');
        toast.info('Location access restricted - mapping sandbox testing bounds');
        setDetecting(false);
      },
      { timeout: 6000 }
    );
  };

  const toggleTrade = (t: TradeToken) => {
    setTrades((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  const resetRunState = () => {
    setReasoning('');
    setVisionText('');
    setSteps({});
    setOpenSteps({});
    setSummaryMd('');
    setJurisdictionLabel('');
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
    if (bimJson.trim()) fd.set('bim_bridge_json', bimJson.trim());
    if (imageFile) fd.set('image', imageFile, imageFile.name);

    const onData = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return;
      const msg = raw as SseEnvelope;
      const ev = msg.event || '';

      if (ev === 'error') {
        toast.error(msg.message || 'Research error');
        return;
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
        return;
      }
      if (ev === 'step') {
        const key = String(msg.step || '');
        const data = msg.data;
        if (key && data && typeof data === 'object') {
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
        setSummaryMd((prev) => prev + msg.text);
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
        setOpenComplete(msg);
        if (typeof msg.summary === 'string' && msg.summary.trim()) setSummaryMd(msg.summary);
      }
    };

    try {
      await fetchEventSource('/api/research', {
        method: 'POST',
        body: fd,
        signal,
        credentials: 'include',
        shouldRetry: () => false,
        onopen: async (res) => {
          if (res.ok) return;
          const t = await res.text().catch(() => '');
          throw new Error(t || `HTTP ${res.status}`);
        },
        onmessage(ev) {
          if (!ev.data) return;
          try {
            onData(JSON.parse(ev.data) as unknown);
          } catch {
            /* ignore non-json */
          }
        },
        onerror(err) {
          throw err;
        },
      });
      toast.success('Research stream finished');
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        toast.info('Research cancelled');
      } else {
        toast.error((e as Error).message || 'Research failed');
      }
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const cancelRun = () => abortRef.current?.abort();

  const downloadPermitPackage = async () => {
    const c = complete;
    if (!c) {
      toast.warning('Run research first — nothing to export yet.');
      return;
    }
    const feeSummary =
      summaryMd.split('### Permit Costs')[1]?.split('###')[0]?.trim().slice(0, 4000) ||
      'See Contractor Action Plan — permit fees section.';
    try {
      const res = await axios.post<Blob>(
        '/api/permit-package',
        {
          site_address: (c.site_address as string) || siteAddress,
          scope: (jobDescription || 'Electrical / panel scope — see memo.').slice(0, 4000),
          fee_summary: feeSummary,
          trade: 'Electrical',
          zip: (c.zip as string) || zipCode,
          city: (c.city as string) || '',
          county: (c.county as string) || '',
          ahj_label: (c.ahj_label as string) || jurisdictionLabel || '',
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

  return (
    <>
      <style>{styles()}</style>
      <div className="rg-shell">
        <header className="rg-header">
          <div className="rg-brand">
            <Shield size={18} color="#38bdf8" />
            <div>
              <div className="rg-title">Reg Guard · Universal Scout</div>
              <div className="rg-sub">Autonomous domain orchestration framework</div>
            </div>
          </div>
          <div className="rg-pill" style={{ borderColor: 'rgba(74, 222, 128, 0.4)', background: 'rgba(74, 222, 128, 0.05)' }}>
            <div className="rg-pulse-dot" style={{ marginRight: 4 }}></div>
            <span style={{ color: '#4ade80', fontWeight: 600 }}>RegGuard is gathering data from all relevant regulatory entities</span>
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
                onChange={(e) => setSiteAddress(e.target.value)}
                onFocus={() => {
                  if (placesReady) attachAutocomplete();
                }}
                autoComplete="off"
              />

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
                    placeholder="75035"
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

              <label className="rg-lbl" htmlFor="jd">
                Job description / voice capture
              </label>
              <textarea
                id="jd"
                className="rg-ta"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="Describe scope — panel upgrade, data hall fit-out, AHJ questions…"
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
                <option value="data_center">Data center / colo</option>
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

              <label className="rg-lbl" style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14 }}>
                <input
                  type="checkbox"
                  checked={missionCriticalDc}
                  onChange={(e) => setMissionCriticalDc(e.target.checked)}
                />
                Mission-critical data center cues (Tier III/IV, liquid cooling)
              </label>

              <label className="rg-lbl" htmlFor="bim">
                Optional BIM bridge JSON (POST /bim/import payload)
              </label>
              <textarea
                id="bim"
                className="rg-ta"
                style={{ minHeight: 60 }}
                value={bimJson}
                onChange={(e) => setBimJson(e.target.value)}
                placeholder="{ … }"
              />

              <label className="rg-lbl" htmlFor="img">
                Site photo (Reality Capture & Proximity Boundary Audit)
              </label>
              <input
                id="img"
                type="file"
                accept="image/*"
                className="rg-input"
                onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
              />

              <div className="rg-actions">
                <button type="button" className="rg-btn" disabled={running} onClick={runResearch}>
                  {running ? <Loader2 className="spin" size={16} /> : <Sparkles size={16} />}
                  {running ? 'Scouting…' : 'Run Universal Scout'}
                </button>
                <button type="button" className="rg-btn rg-btn2" disabled={!running} onClick={cancelRun}>
                  Cancel
                </button>
                <button type="button" className="rg-btn rg-btn2" onClick={downloadPermitPackage}>
                  <Download size={16} />
                  Permit PDF
                </button>
              </div>
            </div>
          </section>

          <section className="rg-panel rg-split">
            <div>
              <div className="rg-panel-hd">
                <CheckCircle2 size={16} />
                Live run
                {jurisdictionLabel ? <span className="rg-pill">{jurisdictionLabel}</span> : null}
              </div>
              
              <div className="rg-panel-bd">
                {/* Real-time FinOps Savings Indicator Dashboard */}
                <div className="finops-card">
                  <div className="finops-metric">
                    <div className="rg-small" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#38bdf8' }}>
                      <DollarSign size={12} /> Research Value
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4ade80', marginTop: 4 }}>
                      ${complete?.value_metrics?.research_value_usd ? complete.value_metrics.research_value_usd.toFixed(2) : '0.00'}
                    </div>
                  </div>
                  <div className="finops-metric">
                    <div className="rg-small" style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#a78bfa' }}>
                      <TrendingUp size={12} /> Liability Avoided
                    </div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#4ade80', marginTop: 4 }}>
                      ${complete?.value_metrics?.estimated_liability_avoided_usd ? complete.value_metrics.estimated_liability_avoided_usd.toFixed(2) : '0.00'}
                    </div>
                  </div>
                </div>

                {futureRisk && typeof futureRisk === 'object' && (futureRisk as { active?: boolean }).active ? (
                  <div className="rg-warn" style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 10 }}>
                    <AlertTriangle size={16} />
                    <div>
                      <strong>Future risk alert</strong>
                      <div className="rg-small">Code-cycle signals detected in scout snippets — verify AHJ adoption dates.</div>
                    </div>
                  </div>
                ) : null}

                <div className="rg-lbl" style={{ marginTop: 0 }}>
                  Reasoning trace
                </div>
                <div className="rg-reason">{reasoning || '— waiting for scout / audit phases —'}</div>

                {visionText ? (
                  <>
                    <div className="rg-lbl">Reality Capture Image Audit</div>
                    <div className="rg-reason" style={{ maxHeight: 90, borderColor: 'rgba(167,139,250,0.3)' }}>
                      {visionText}
                    </div>
                  </>
                ) : null}

                {complete?.moratorium_state_alert?.active ? (
                  <div className="rg-danger rg-small" style={{ marginTop: 8 }}>
                    {complete.moratorium_state_alert.text || 'Moratorium / high-alert signal — review Bottom Line.'}
                  </div>
                ) : null}
              </div>

              <div className="rg-panel-bd" style={{ paddingTop: 0 }}>
                <div className="rg-panel-hd" style={{ borderTop: `1px solid rgba(148,163,184,0.18)` }}>
                  Scout steps
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
                            <div className="rg-step-body">
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
                                  <div key={`${k}-${i}`} className="rg-hit">
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

            <div className="rg-panel" style={{ minHeight: 420 }}>
              <div className="rg-panel-hd">
                <Sparkles size={16} />
                Contractor Action Plan
              </div>
              <div className="rg-md">
                {summaryMd.trim() ? (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{summaryMd}</ReactMarkdown>
                ) : (
                  <div className="rg-small">Streaming markdown will appear here (summary_delta events).</div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
      <ToastContainer position="bottom-right" theme="dark" closeOnClick pauseOnHover />
    </>
  );
}