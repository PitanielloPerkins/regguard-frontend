/**
 * Browser persistence for last successful research (instant paint on slow backends).
 */
export const REG_GUARD_RESEARCH_CACHE_KEY = "reg_guard_research_cache_v1";

/** One-shot per browser tab so React StrictMode dev double-mount does not duplicate background refresh. */
export const REG_GUARD_SESSION_CACHE_HYDRATE_KEY = "reg_guard_research_session_hydrate_v1";

const MAX_CACHE_CHARS = 4_800_000;

export type ScoutTradeIdCache =
  | "general_contractor"
  | "electrician"
  | "plumber"
  | "hvac"
  | "zoning_planning"
  | "owner_builder";

export type FutureRiskCache = {
  active: boolean;
  banner?: string;
  severity?: string;
  hits?: unknown[];
  notes?: string;
};

export type ResearchCacheV1 = {
  version: 1;
  cacheKey: string;
  savedAt: string;
  formattedAddress: string;
  zip: string;
  city?: string | null;
  county?: string | null;
  ahjLabel?: string | null;
  phase: string;
  actionPlan: string;
  steps: string[];
  visionText: string;
  sourceUrls: string[];
  visualAudit: unknown | null;
  projectValueMetrics: { researchValueUsd: number; estimatedLiabilityAvoidedUsd: number } | null;
  moratoriumStateAlert: { active: boolean; text: string } | null;
  futureRiskAlert: FutureRiskCache | null;
  communityInspectorFeedback: unknown | null;
  proactiveSummaryBuffer: string;
  jobDescription: string;
  dallasPermitsFixture: {
    permits: Record<string, unknown>[];
    source?: string;
    fetchError?: string;
  } | null;
  scoutTrade: ScoutTradeIdCache;
  scoutVertical: "building" | "infrastructure" | "data_center";
  missionCriticalDc: boolean;
  searchLimit: number;
};

export function normalizeResearchCacheKey(site: string, zip: string): string {
  return `${site.trim().toLowerCase()}|${zip.trim()}`;
}

export function loadResearchCache(): ResearchCacheV1 | null {
  try {
    const raw = localStorage.getItem(REG_GUARD_RESEARCH_CACHE_KEY);
    if (!raw) {
      return null;
    }
    const o = JSON.parse(raw) as Partial<ResearchCacheV1>;
    if (
      o.version !== 1 ||
      typeof o.formattedAddress !== "string" ||
      typeof o.zip !== "string" ||
      typeof o.actionPlan !== "string"
    ) {
      return null;
    }
    if (o.actionPlan.trim().length < 40) {
      return null;
    }
    return o as ResearchCacheV1;
  } catch {
    return null;
  }
}

export function saveResearchCache(entry: ResearchCacheV1): void {
  try {
    const raw = JSON.stringify(entry);
    if (raw.length > MAX_CACHE_CHARS) {
      console.warn("[RegGuard] research cache too large; skip persist", raw.length);
      return;
    }
    localStorage.setItem(REG_GUARD_RESEARCH_CACHE_KEY, raw);
  } catch (e) {
    console.warn("[RegGuard] could not save research cache", e);
  }
}
