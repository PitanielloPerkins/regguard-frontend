"""
Reg Guard — Universal Scout: Firecrawl **/v2/search** (web index) for URL discovery.

We use the **search** endpoint with ``sources=["web"]`` and **no** ``scrapeOptions`` so
Firecrawl returns SERP URLs and snippets only—no full-page crawl, no ``crawl_url``, and no
per-result markdown download. That keeps latency and credits low versus bundled
search+scrape or site mapping.

Depth / page limits in the user brief (``maxDepth``, ``exclude_external_links``) apply to
Firecrawl **crawl** jobs; this codebase does not call ``crawl()`` for Universal Scout.
"""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional
from urllib.parse import urlparse

from dotenv import load_dotenv
from firecrawl import Firecrawl
from firecrawl.v2.types import ScrapeOptions, SearchData
from semantic_scout_cache import cache_get as _semantic_scout_cache_get
from semantic_scout_cache import cache_set as _semantic_scout_cache_set
from semantic_scout_cache import semantic_scout_cache_enabled

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")

# -----------------------------------------------------------------------------
# Universal Scout — trusted domains (query operators + post-filter)
# -----------------------------------------------------------------------------

# Firecrawl / web search: restrict SERP to U.S. government and Municode (reduces unrelated-state noise).
SEARCH_DOMAIN_SCOPE = "(site:gov OR site:municode.com)"

# City of Plano — product-targeted scout supplements (documented in ``main`` module docstring).
PLANO_SCOUT_AMENDMENTS_NEC = "Plano TX electrical amendments 2023 NEC"
PLANO_SCOUT_FEE_SCHEDULE = "Plano building fee schedule 2026"


def _is_plano_texas(city: str, state: str) -> bool:
    c = (city or "").strip().lower()
    s = (state or "").strip().upper()
    return c == "plano" and s in ("TX",)


def _is_austin_texas(city: str, state: str) -> bool:
    c = (city or "").strip().lower()
    s = (state or "").strip().upper()
    return c == "austin" and s in ("TX",)


AUSTIN_SCOUT_DEVELOPMENT_FEES_SURCHARGE = (
    "site:austintexas.gov development services fees safety surcharge electrical permit"
)
AUSTIN_SCOUT_DESIGN_CRITERIA_ELECTRICAL = (
    "Austin Texas design criteria electrical service 36 inch gas relief solar ready 225A 200A bus"
)


# Code-Change Monitoring Agent — SERP cues merged into the building-codes pass (trusted domains only).
CODE_CHANGE_SCOUT_UPCOMING_ADOPTION = (
    "upcoming building code adoption NEC NFPA 70 effective date transition council workshop"
)
CODE_CHANGE_SCOUT_ORDINANCE_MINUTES = (
    "city council agenda minutes ordinance building code amendment hearing first reading"
)


def _append_code_change_monitor_queries(
    codes_line: str,
    *,
    zip_tag: str,
    city: str,
    county: str,
    st: str,
    mode: str,
) -> str:
    """Augment Universal Scout 3 (codes) with localized adoption-cycle / minutes discovery."""
    city = (city or "").strip()
    county = (county or "").strip()
    st = (st or "").strip()
    m = (mode or "").strip().lower()
    if m == "county" or (not city and county):
        county_disp = f"{county} County" if county and not county.lower().endswith("county") else county
        loc = f"{county_disp}, {st}".strip().strip(",") if st else county_disp
        extra = (
            f"{loc} {CODE_CHANGE_SCOUT_UPCOMING_ADOPTION} — {zip_tag} | "
            f"{loc} {CODE_CHANGE_SCOUT_ORDINANCE_MINUTES} — {zip_tag}"
        )
        return f"{codes_line} | {extra}"
    city_disp = city or "municipality"
    loc_cs = f"{city_disp}, {st}".strip().strip(",") if st else city_disp
    extra = (
        f"{loc_cs} {CODE_CHANGE_SCOUT_UPCOMING_ADOPTION} — {zip_tag} | "
        f"{loc_cs} {CODE_CHANGE_SCOUT_ORDINANCE_MINUTES} — {zip_tag}"
    )
    return f"{codes_line} | {extra}"


def _locality_data_fence(city: str, county: str, st: str, mode: str) -> str:
    """
    Append a **looser** locality cue on every scout line (still names City, ST or County, ST) so queries read like
    official permit/code discovery—not a harsh ``ONLY …`` filter that can zero-out SERP. Documented from ``main``.
    """
    stx = (st or "").strip()
    if not stx:
        return ""
    c = (city or "").strip()
    co = (county or "").strip()
    if co:
        county_disp = f"{co} County" if not co.lower().endswith("county") else co
    else:
        county_disp = ""
    m = (mode or "").strip().lower()
    if county_disp and (m == "county" or not c):
        return f" | LOCALITY_LOCK {county_disp}, {stx} official county building permits and adopted code"
    if c:
        return f" | LOCALITY_LOCK {c}, {stx} official city code and building permits"
    return ""


def _normalize_scout_vertical(v: Optional[str]) -> str:
    x = (v or "").strip().lower().replace(" ", "_").replace("-", "_")
    if x in ("infrastructure", "infra", "critical_infrastructure"):
        return "infrastructure"
    if x in ("data_center", "datacenter", "dc", "colocation"):
        return "data_center"
    return "building"


def _normalize_trade_tokens(raw: Any) -> List[str]:
    if raw is None:
        return []
    if isinstance(raw, str):
        parts = [p.strip().lower() for p in re.split(r"[,;\s]+", raw) if p.strip()]
    elif isinstance(raw, (list, tuple, set)):
        parts = [str(p).strip().lower() for p in raw if str(p).strip()]
    else:
        return []
    aliases = {
        "electrical": "electrician",
        "electric": "electrician",
        "mechanical": "hvac",
        "plumbing": "plumber",
    }
    out: List[str] = []
    for p in parts:
        p = aliases.get(p, p)
        if p in ("electrician", "plumber", "hvac") and p not in out:
            out.append(p)
    return out


def _append_mep_trade_segments(
    juris: str,
    permits: str,
    codes: str,
    *,
    zip_tag: str,
    city: str,
    county: str,
    st: str,
    mode: str,
    trades: List[str],
    mission_critical_dc: bool,
    vertical: str,
) -> tuple[str, str, str]:
    """Augment scout lines for selected MEP trades, data-center mission-critical mode, and vertical."""
    if not trades and not mission_critical_dc and vertical not in ("infrastructure", "data_center"):
        return juris, permits, codes

    city = (city or "").strip()
    county = (county or "").strip()
    st = (st or "").strip()
    mode_l = (mode or "").strip().lower()
    if not (city or county or st):
        loc = f"US {zip_tag}"
    elif mode_l == "county" or (not city and county):
        county_disp = f"{county} County" if county and not county.lower().endswith("county") else county
        loc = f"{county_disp}, {st}".strip().strip(",") if st else county_disp
    else:
        city_disp = city or "municipality"
        loc = f"{city_disp}, {st}".strip().strip(",") if st else city_disp

    chunks: List[str] = []
    if "electrician" in trades:
        chunks.append(
            f"{loc} electrical subcontractor permit NEC NFPA 70 amendments utility coordination — {zip_tag}"
        )
    if "plumber" in trades:
        chunks.append(
            f"{loc} plumbing permit IPC UPC adopted amendments drainage water pipe sizing inspections — {zip_tag}"
        )
    if "hvac" in trades:
        chunks.append(
            f"{loc} mechanical HVAC permit IMC energy code load calculation ACCA Manual J adoption — {zip_tag}"
        )
    if len(trades) >= 3:
        chunks.append(
            f"{loc} combined MEP multi-trade permitting mechanical electrical plumbing coordination — {zip_tag}"
        )

    if mission_critical_dc:
        chunks.append(
            f"{loc} data center Tier III Tier IV redundancy 2N N+1 concurrent maintainability "
            f"mission critical facility code adopted amendments — {zip_tag}"
        )
        chunks.append(
            f"{loc} liquid cooling containment CDU rear door heat exchanger data hall "
            f"fire code mechanical electrical safety adopted requirements — {zip_tag}"
        )

    if vertical == "data_center" and not mission_critical_dc:
        chunks.append(
            f"{loc} data center colocation facility mechanical electrical uptime staging "
            f"AHJ adopted codes — {zip_tag}"
        )
    if vertical == "infrastructure":
        chunks.append(
            f"{loc} infrastructure utility mission critical building mechanical electrical "
            f"permitting adopted code — {zip_tag}"
        )

    if not chunks:
        return juris, permits, codes

    segment = " | ".join(chunks)
    permits = f"{permits} | {segment}"
    codes = f"{codes} | {segment}"
    return juris, permits, codes


def _fast41_query_line(
    *,
    zip_tag: str,
    city: str,
    county: str,
    st: str,
    mode: str,
    site_address: Optional[str],
    vertical: str,
) -> str:
    site = (site_address or "").strip()
    loc_bits: List[str] = []
    if site:
        loc_bits.append(site)
    city = (city or "").strip()
    county = (county or "").strip()
    st = (st or "").strip()
    mode_l = (mode or "").strip().lower()
    if mode_l == "county" or (not city and county):
        county_disp = f"{county} County" if county and not county.lower().endswith("county") else county
        if county_disp and st:
            loc_bits.append(f"{county_disp}, {st}")
    elif city and st:
        loc_bits.append(f"{city}, {st}")
    loc = " ".join(loc_bits).strip()
    vlabel = "infrastructure" if vertical == "infrastructure" else "data center"
    return (
        f"FAST-41 federal permitting Title 41 Permitting Council covered project status "
        f"{vlabel} environmental review milestone dashboard {loc} — {zip_tag}"
    )


def _coerce_scout_profile(raw: Optional[Mapping[str, Any]]) -> Dict[str, Any]:
    r = dict(raw or {})
    trades = _normalize_trade_tokens(r.get("trades"))
    vert = _normalize_scout_vertical(str(r.get("vertical") or "building"))
    mc = r.get("mission_critical_dc")
    mc_bool = mc is True or (isinstance(mc, str) and mc.strip().lower() in ("1", "true", "yes", "on"))
    return {"trades": trades, "vertical": vert, "mission_critical_dc": mc_bool}


def _reject_serp_for_project_state(blob: str, project_state: Optional[str]) -> bool:
    """Drop hits that clearly reference Washington State when the project is elsewhere (e.g. Texas)."""
    st = (project_state or "").strip().upper()
    if len(st) != 2:
        return False
    if st == "WA":
        return False
    b = (blob or "").lower()
    if re.search(r"\bwashington\s+state\b", b) or re.search(r"\bstate\s+of\s+washington\b", b):
        return True
    if ".wa.gov" in b:
        return True
    if st == "TX" and re.search(r"\bseattle\b", b):
        if not re.search(r"\b(texas|dallas|plano|fort\s+worth|houston|austin)\b", b) and not re.search(
            r"\btx\b", b
        ):
            return True
    return False


def _scout_queries_for_location(
    z: str,
    site_address: Optional[str],
    jurisdiction: Optional[Mapping[str, Any]],
    scout_profile: Optional[Mapping[str, Any]] = None,
) -> tuple[str, str, str]:
    """
    Build (jurisdiction, permits, codes) search lines for Universal Scout.

    Every line includes **explicit locality** (``City, ST`` or ``County, ST``) when geocoding
    provides it, plus ZIP where helpful. Queries are combined in ``_append_scope`` with
    ``(site:gov OR site:municode.com)``.

    ``scout_profile`` carries **Full MEP** trade selections, **mission-critical data-center** cues,
    and project **vertical** (building / infrastructure / data_center) for query augmentation.
    """
    prof = _coerce_scout_profile(scout_profile)
    addr = (site_address or "").strip()
    ju = jurisdiction
    if ju:
        addr = addr or str(ju.get("formatted_address") or "").strip() or f"ZIP {z}"

    zip_tag = f"ZIP {z}"

    if not ju or not addr:
        juris = f"US {zip_tag} municipality county jurisdiction AHJ building permits — {zip_tag}"
        permits = (
            f"US {zip_tag} building department permit applications electrical official — {zip_tag} | "
            f"US {zip_tag} official building permit fees 2026"
        )
        codes = (
            f"US {zip_tag} adopted building code amendments codified law official — {zip_tag} | "
            f"US {zip_tag} NEC 2023 amendments | "
            f"US {zip_tag} upcoming NEC code adoption ordinance council agenda minutes — {zip_tag}"
        )
        juris, permits, codes = _append_mep_trade_segments(
            juris,
            permits,
            codes,
            zip_tag=zip_tag,
            city="",
            county="",
            st="",
            mode="",
            trades=prof["trades"],
            mission_critical_dc=prof["mission_critical_dc"],
            vertical=prof["vertical"],
        )
        return (juris, permits, codes)

    mode = str(ju.get("mode") or "").strip().lower()
    city = str(ju.get("city") or "").strip()
    county = str(ju.get("county") or "").strip()
    st = str(ju.get("state") or "").strip()

    city_st = f"{city}, {st}".strip().strip(",") if city and st else ""
    if mode == "county" or (not city and county):
        county_disp = f"{county} County" if county and not county.lower().endswith("county") else county
        loc = f"{county_disp}, {st}".strip().strip(",") if st else county_disp
        prefix = f"{loc}: " if loc else ""
        juris = (
            f"{prefix}Job site {addr} — unincorporated or county-administered {county_disp}, {st} ({zip_tag}). "
            f"Confirm **county** is the AHJ for building permits (not a city department)."
        )
        permits = (
            f"{prefix}{county_disp} {st} building permits inspections development services "
            f"unincorporated official — {zip_tag}"
        )
        codes = (
            f"{prefix}Building codes adopted for {county_disp} {st}: county code amendments "
            f"IBC IRC — {zip_tag}"
        )
        fence = _locality_data_fence(city, county, st, mode)
        juris, permits, codes = juris + fence, permits + fence, codes + fence
        fee_nec = (
            f"{county_disp}, {st} official building permit fees 2026",
            f"{county_disp}, {st} NEC 2023 amendments",
        )
        permits = f"{permits} | {fee_nec[0]}"
        codes = f"{codes} | {fee_nec[1]}"
        codes = _append_code_change_monitor_queries(
            codes,
            zip_tag=zip_tag,
            city=city,
            county=county,
            st=st,
            mode=mode,
        )
        juris, permits, codes = _append_mep_trade_segments(
            juris,
            permits,
            codes,
            zip_tag=zip_tag,
            city=city,
            county=county,
            st=st,
            mode=mode,
            trades=prof["trades"],
            mission_critical_dc=prof["mission_critical_dc"],
            vertical=prof["vertical"],
        )
        return (juris, permits, codes)

    city_disp = city or "the municipality"
    loc = city_st or (f"{city_disp}, {st}" if st else city_disp)
    prefix = f"{loc}: " if loc else ""
    juris = (
        f"{prefix}Job site {addr} — incorporated {city_disp}, {st} ({zip_tag}). "
        f"The **city** is typically the AHJ for building permits at this address."
    )
    permits = (
        f"{prefix}{city_disp} {st} building department permits plan check electrical official — {zip_tag}"
    )
    codes = (
        f"{prefix}Building codes adopted for {city_disp} {st}: municipal amendments IBC IRC — {zip_tag}"
    )
    fence = _locality_data_fence(city, county, st, mode)
    juris, permits, codes = juris + fence, permits + fence, codes + fence
    fee_nec = (
        f"{city_disp}, {st} official building permit fees 2026",
        f"{city_disp}, {st} NEC 2023 amendments",
    )
    permits = f"{permits} | {fee_nec[0]}"
    codes = f"{codes} | {fee_nec[1]}"
    if _is_plano_texas(city, st):
        permits = f"{permits} | {PLANO_SCOUT_FEE_SCHEDULE}"
        codes = f"{codes} | {PLANO_SCOUT_AMENDMENTS_NEC}"
    if _is_austin_texas(city, st):
        permits = f"{permits} | {AUSTIN_SCOUT_DEVELOPMENT_FEES_SURCHARGE}"
        codes = f"{codes} | {AUSTIN_SCOUT_DESIGN_CRITERIA_ELECTRICAL}"
    codes = _append_code_change_monitor_queries(
        codes,
        zip_tag=zip_tag,
        city=city,
        county=county,
        st=st,
        mode=mode,
    )
    juris, permits, codes = _append_mep_trade_segments(
        juris,
        permits,
        codes,
        zip_tag=zip_tag,
        city=city,
        county=county,
        st=st,
        mode=mode,
        trades=prof["trades"],
        mission_critical_dc=prof["mission_critical_dc"],
        vertical=prof["vertical"],
    )
    return (juris, permits, codes)

# Reuse cached scrapes where possible (24h) when single-page scrape is enabled elsewhere.
FIRECRAWL_MAX_AGE_MS = 86400000

# Optional: single-page /search bundled scrape (not used — kept for reference / future use).
# Firecrawl ``ScrapeOptions`` does not expose ``maxDepth`` or ``exclude_external_links``; those
# are **crawl** parameters. For bundled search+scrape, we minimize cost by markdown-only,
# ``fast_mode``, no ``links`` format (avoids expanding every on-page href), and stripping
# media/CSS tags from the DOM before extraction.
SEARCH_BUNDLED_SCRAPE_OPTIONS = ScrapeOptions(
    formats=["markdown"],
    only_main_content=True,
    max_age=FIRECRAWL_MAX_AGE_MS,
    fast_mode=True,
    remove_base64_images=True,
    block_ads=True,
    exclude_tags=[
        "img",
        "picture",
        "source",
        "video",
        "audio",
        "svg",
        "canvas",
        "iframe",
        "object",
        "embed",
        "style",
        "link",
        "noscript",
    ],
)

# Total SERP rows per scout query (permit checks: first few hits are enough).
_SEARCH_PAGE_LIMIT_MIN = 3
_SEARCH_PAGE_LIMIT_MAX = 5


def _effective_search_limit(user_limit: int) -> int:
    """Clamp Firecrawl /search ``limit`` to 3–5 pages per request."""
    u = max(1, int(user_limit))
    return min(_SEARCH_PAGE_LIMIT_MAX, max(_SEARCH_PAGE_LIMIT_MIN, min(u, _SEARCH_PAGE_LIMIT_MAX)))
def _require_firecrawl_key() -> str:
    key = (os.environ.get("FIRECRAWL_API_KEY") or "").strip()
    if not key:
        raise ValueError("FIRECRAWL_API_KEY is missing. Set it in the project .env file.")
    return key


def _get_client() -> Firecrawl:
    return Firecrawl(api_key=_require_firecrawl_key())


def normalize_us_zip(zip_code: str) -> str:
    """Return 5-digit US ZIP; accepts optional +4 (stored only 5 for queries)."""
    raw = (zip_code or "").strip()
    m = re.match(r"^(\d{5})(?:-(\d{4}))?$", re.sub(r"\s+", "", raw))
    if not m:
        raise ValueError("Invalid ZIP. Use 5 digits or ZIP+4 (e.g. 75001 or 75001-1234).")
    return m.group(1)


def clear_scout_run_caches() -> None:
    """
    Best-effort memory cleanup after a Universal Scout run.

    Universal Scout holds large Firecrawl payloads; nudging the cyclic GC helps release
    those graphs promptly on long-running uvicorn workers.
    """
    import gc

    try:
        from semantic_scout_cache import clear_semantic_scout_cache

        clear_semantic_scout_cache()
    except ImportError:
        pass
    try:
        from markdown_scraper import clear_markdown_scrape_cache

        clear_markdown_scrape_cache()
    except ImportError:
        pass
    gc.collect()


def _hostname(url: str) -> str:
    try:
        p = urlparse(url)
        host = (p.hostname or "").lower().rstrip(".")
        return host
    except (ValueError, TypeError):
        return ""


_STATE_SL_GOV_RE = re.compile(r"\.([a-z]{2})\.gov$", re.I)


def _host_conflicts_project_state(host: str, state_short: Optional[str]) -> bool:
    """True when host is a ``*.st.gov`` agency site and ``state_short`` is a different U.S. state."""
    st = (state_short or "").strip().lower()
    if len(st) != 2:
        return False
    m = _STATE_SL_GOV_RE.search(host)
    if not m:
        return False
    return m.group(1).lower() != st


def hostname_matches_trust_policy(host: str) -> bool:
    """
    Restrict to **.gov** (official government) and **municode.com** per product policy.

    Post-filter is defense-in-depth alongside ``SEARCH_DOMAIN_SCOPE`` in the query string.
    """
    if not host:
        return False
    host = host.lower().rstrip(".")
    if "municode" in host:
        return True
    if host.endswith(".gov"):
        return True
    return False


def url_matches_trust_policy(url: Optional[str]) -> bool:
    if not url:
        return False
    return hostname_matches_trust_policy(_hostname(str(url)))


def _append_scope(base: str) -> str:
    b = (base or "").strip()
    if not b:
        return SEARCH_DOMAIN_SCOPE
    return f"{b} {SEARCH_DOMAIN_SCOPE}"


def _entry_to_dict(item: Any) -> Dict[str, Optional[str]]:
    url: Optional[str] = getattr(item, "url", None)
    title = getattr(item, "title", None)
    desc = getattr(item, "description", None)
    if desc is None:
        desc = getattr(item, "snippet", None)

    if url is None and isinstance(item, dict):
        url = item.get("url")
        title = item.get("title")
        desc = item.get("description") or item.get("snippet")

    # Search + scrape returns Document rows; URL lives on metadata.
    if url is None:
        md = getattr(item, "metadata", None)
        if md is not None:
            if isinstance(md, dict):
                url = md.get("url") or md.get("sourceURL") or md.get("source_url")
                if title is None:
                    title = md.get("title")
                if desc is None:
                    desc = md.get("description")
            else:
                url = getattr(md, "url", None) or getattr(md, "source_url", None)
                if title is None:
                    title = getattr(md, "title", None)
                if desc is None:
                    desc = getattr(md, "description", None)

    if url is None:
        return {}
    return {"url": str(url), "title": title, "description": desc}


def _web_hits_raw(data: Optional[SearchData]) -> List[Dict[str, Optional[str]]]:
    if not data or not data.web:
        return []
    out: List[Dict[str, Optional[str]]] = []
    for item in data.web:
        d = _entry_to_dict(item)
        if d:
            out.append(d)
    return out


def _filter_trusted(
    hits: List[Dict[str, Optional[str]]],
    limit: int,
    *,
    project_state: Optional[str] = None,
) -> List[Dict[str, Optional[str]]]:
    seen: set[str] = set()
    out: List[Dict[str, Optional[str]]] = []
    for h in hits:
        u = h.get("url")
        if not u or u in seen:
            continue
        host = _hostname(str(u))
        if not url_matches_trust_policy(u):
            continue
        if _host_conflicts_project_state(host, project_state):
            continue
        blob = f"{h.get('title') or ''} {h.get('description') or ''} {u}"
        if _reject_serp_for_project_state(blob, project_state):
            continue
        seen.add(u)
        out.append(h)
        if len(out) >= limit:
            break
    return out


def _with_context(base: str, ctx: Optional[str], max_len: int = 500) -> str:
    """Append contractor/site context to a search line without exceeding common API limits."""
    b = (base or "").strip()
    if not ctx or not str(ctx).strip():
        return b[:max_len]
    c = " ".join(str(ctx).split())
    sep = " | Site/job context: "
    room = max_len - len(b) - len(sep)
    if room < 24:
        return b[:max_len]
    if len(c) > room:
        c = c[: max(0, room - 1)] + "…"
    out = f"{b}{sep}{c}"
    return out[:max_len]


def _jurisdiction_spelling_hint(hits: List[Dict[str, Optional[str]]]) -> str:
    """Pull a few words from top hit titles to steer the follow-up local query."""
    for h in hits[:2]:
        t = h.get("title") or ""
        t = t.strip()
        if len(t) > 8:
            return t[:100]
    return ""


def _fallback_official_query(base: str) -> str:
    """
    Unscoped follow-up (no `site:`): bias toward the municipality's own official entry point.

    Ensures the keyword *official* and phrases that steer SERP to the city's government
    landing page (.gov or official portal), not blogs or listicles.
    """
    b = (base or "").strip()
    if not re.search(r"\bofficial\b", b, re.IGNORECASE):
        b = f"{b} official".strip()
    if not re.search(r"\blanding\s+page\b", b, re.IGNORECASE):
        b = f"{b} city government landing page".strip()
    return b


def _dedupe_take(
    hits: List[Dict[str, Optional[str]]],
    limit: int,
) -> List[Dict[str, Optional[str]]]:
    seen: set[str] = set()
    out: List[Dict[str, Optional[str]]] = []
    for h in hits:
        u = h.get("url")
        if not u or u in seen:
            continue
        seen.add(u)
        out.append(h)
        if len(out) >= limit:
            break
    return out


def _scout_search(
    fc: Firecrawl,
    query: str,
    *,
    user_limit: int,
    project_state: Optional[str] = None,
) -> tuple[List[Dict[str, Optional[str]]], Dict[str, Any]]:
    """
    Universal Scout: **/v2/search** with ``sources=['web']`` and **no** bundled scrape.

    Optionally could pass ``SEARCH_BUNDLED_SCRAPE_OPTIONS`` as ``scrape_options`` so each SERP URL
    is scraped as a single page (still not a multi-page crawl — no ``maxDepth`` path here).

    Duplicate scoped queries reuse **semantic cache** rows (see ``semantic_scout_cache``) to cut
    repeat Firecrawl search cost within TTL.
    """
    api_limit = _effective_search_limit(user_limit)
    primary_q = _append_scope(query)
    meta: Dict[str, Any] = {
        "primary_query": primary_q,
        "fallback_used": False,
        "fallback_query": None,
        "firecrawl_mode": "search_web_serp_only",
        "firecrawl_limit": api_limit,
        "semantic_cache_hit": False,
    }

    if semantic_scout_cache_enabled():
        cached = _semantic_scout_cache_get(primary_q, user_limit, project_state)
        if cached is not None:
            hits_c, meta_c = cached
            out_m = dict(meta_c)
            out_m["semantic_cache_hit"] = True
            out_m.setdefault("primary_query", primary_q)
            return hits_c, out_m

    r = fc.search(
        primary_q,
        limit=api_limit,
        sources=["web"],
        location="US",
        scrape_options=None,
    )
    trusted = _filter_trusted(_web_hits_raw(r), user_limit, project_state=project_state)
    if trusted:
        if semantic_scout_cache_enabled():
            _semantic_scout_cache_set(primary_q, user_limit, project_state, trusted, dict(meta))
        return trusted, meta
    # Do not cache empty primary results — the fallback query may still yield trusted URLs.
    fb_core = _fallback_official_query(query)
    fb = _append_scope(fb_core)
    meta["fallback_used"] = True
    meta["fallback_query"] = fb

    if semantic_scout_cache_enabled():
        cached_fb = _semantic_scout_cache_get(fb, user_limit, project_state)
        if cached_fb is not None:
            hits_f, meta_f = cached_fb
            out_m = dict(meta_f)
            out_m["semantic_cache_hit"] = True
            out_m["fallback_used"] = True
            out_m["fallback_query"] = fb
            return hits_f, out_m

    r2 = fc.search(
        fb,
        limit=api_limit,
        sources=["web"],
        location="US",
        scrape_options=None,
    )
    trusted_fb = _filter_trusted(_web_hits_raw(r2), user_limit, project_state=project_state)
    if semantic_scout_cache_enabled():
        meta_fb = dict(meta)
        _semantic_scout_cache_set(fb, user_limit, project_state, trusted_fb, meta_fb)
    return trusted_fb, meta


def _step_result_dict(
    hits: List[Dict[str, Optional[str]]],
    scout_meta: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "query": scout_meta["primary_query"],
        "results": hits,
        "fallback_used": scout_meta.get("fallback_used", False),
        "fallback_query": scout_meta.get("fallback_query"),
        "firecrawl_mode": scout_meta.get("firecrawl_mode"),
        "firecrawl_limit": scout_meta.get("firecrawl_limit"),
    }


def _final_scout_response(
    z: str,
    ctx: Optional[str],
    hits1: List[Dict[str, Optional[str]]],
    meta1: Dict[str, Any],
    hits2: List[Dict[str, Optional[str]]],
    meta2: Dict[str, Any],
    hits3: List[Dict[str, Optional[str]]],
    meta3: Dict[str, Any],
    *,
    site_address: Optional[str] = None,
    jurisdiction: Optional[Mapping[str, Any]] = None,
    ahj_identification: Optional[Mapping[str, Any]] = None,
    scout_profile: Optional[Mapping[str, Any]] = None,
    fast41_hits: Optional[List[Dict[str, Optional[str]]]] = None,
    fast41_meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    addr = (site_address or "").strip()
    ju = dict(jurisdiction) if jurisdiction else None
    ahj = dict(ahj_identification) if ahj_identification else None
    wf: List[str] = []
    if ahj:
        city = (ahj.get("city") or "").strip() or "—"
        county = (ahj.get("county") or "").strip() or "—"
        mode = (ahj.get("mode") or "").strip()
        steer = "municipal/city" if mode == "city" else "county/unincorporated"
        wf.append(
            f"AHJ identification — **City**: {city}; **County**: {county} ({steer} building-code steering, ZIP {z})."
        )
    elif ju and ju.get("label"):
        wf.append(
            f"Location — {ju['label']}. "
            "Universal Scout search lines target the city vs county building department accordingly."
        )
    wf.extend(
        [
            "Fallback — If a scoped step returns no trusted URLs: follow-up search **retains** "
            "(site:gov OR site:municode.com) and adds *official* / *city government landing page*.",
            "Universal Scout 1 — Jurisdiction: city/county AHJ hints (trusted hosts).",
            "Universal Scout 2 — Permits: **city** or **county** building department (steered from address).",
            "Universal Scout 3 — Building codes: **city-specific** (incorporated) or **county-specific** "
            "(unincorporated) adopted codes and amendments, plus **Code-Change Monitoring** cues "
            "(upcoming adoptions / council minutes keywords).",
        ]
    )
    prof_snap = _coerce_scout_profile(scout_profile)
    trades_nice = ", ".join(prof_snap["trades"]) if prof_snap["trades"] else "none selected"
    wf.append(
        f"Scout profile — **Trades**: {trades_nice}; **vertical**: {prof_snap['vertical']}; "
        f"**mission-critical DC scout**: {'on' if prof_snap['mission_critical_dc'] else 'off'}."
    )
    if meta4 is not None:
        wf.append(
            "Universal Scout 4 — **FAST-41** federal permitting / Title 41 Permitting Council status cues "
            "(Infrastructure or Data Center vertical)."
        )
    out: Dict[str, Any] = {
        "zip": z,
        "site_address": addr or None,
        "jurisdiction": ju,
        "scout_profile": prof_snap,
        "scout": {
            "mode": "search_web",
            "search_domain_scope": SEARCH_DOMAIN_SCOPE,
            "trust_policy": "hostname ends with .gov or hostname contains municode (SERP scoped with site:gov OR site:municode.com)",
            "sources": ["web"],
            "scrape_options": None,
            "max_depth_note": (
                "N/A — Universal Scout does not call Firecrawl crawl/map; depth 1 crawl would "
                "use max_discovery_depth on /v2/crawl, not used here."
            ),
            "exclude_external_links_note": (
                "N/A for SERP-only search. For crawl, omit following off-domain links via "
                "allow_external_links=False."
            ),
            "page_limit_per_search": {"min": _SEARCH_PAGE_LIMIT_MIN, "max": _SEARCH_PAGE_LIMIT_MAX},
            "bundled_single_page_scrape_options": (
                "disabled — SERP snippets only; see SEARCH_BUNDLED_SCRAPE_OPTIONS if re-enabled "
                "(markdown only, fast_mode, no links format, exclude_tags strips media/CSS)."
            ),
            "fallback": (
                "If a scoped step returns zero trusted URLs, Universal Scout runs a follow-up search that still "
                "appends (site:gov OR site:municode.com) and biases keywords toward *official* / *city government* "
                "(no fully unscoped web search)."
            ),
        },
        "enhanced_context_used": bool(ctx),
        "agentic_workflow": wf,
        "step_jurisdiction": _step_result_dict(hits1, meta1),
        "step_building_permits": _step_result_dict(hits2, meta2),
        "step_building_codes": _step_result_dict(hits3, meta3),
    }
    if fast41_meta is not None:
        out["step_federal_fast41"] = _step_result_dict(fast41_hits or [], fast41_meta)
    if ahj:
        out["step_ahj_identification"] = ahj
    return out


_FUTURE_YEAR_RE = re.compile(r"\b20(2[6-9]|3[0-9])\b")


def _blob_future_code_signal(blob: str) -> bool:
    """Heuristic: upcoming cycle language + future-looking edition years on NEC / building codes."""
    if not _FUTURE_YEAR_RE.search(blob or ""):
        return False
    b = (blob or "").lower()
    code_ok = any(
        x in b
        for x in (
            "nec",
            "national electrical code",
            "nfpa 70",
            "nfpa-70",
            "electrical code",
            "building code",
            "ibc",
            "irc",
            "energy code",
            "ordinance",
        )
    )
    if not code_ok:
        return False
    proc_ok = any(
        x in b
        for x in (
            "adopt",
            "adoption",
            "effective",
            "implement",
            "transition",
            "propose",
            "proposed",
            "ordinance",
            "council",
            "commission",
            "hearing",
            "reading",
            "agenda",
            "minutes",
            "workshop",
            "upcoming",
            "schedule",
            "scheduled",
            "future",
            "amendment",
            "code change",
            "cycle",
        )
    )
    span_ok = bool(
        re.search(r"\b20(2[6-9]|3[0-9])\b\s*.{0,72}\b(nec|nfpa\s*70|electrical\s+code)\b", b, re.I)
        or re.search(r"\b(nec|nfpa\s*70)\b\s*.{0,72}\b20(2[6-9]|3[0-9])\b", b, re.I)
    )
    return proc_ok or span_ok


def future_risk_alerts_from_raw(raw: Dict[str, Any]) -> Dict[str, Any]:
    """Scan trusted scout rows for newer NEC / adoption-cycle signals (Code-Change Monitoring Agent)."""
    seen: set[str] = set()
    hits_out: List[Dict[str, Any]] = []
    for step_key in ("step_jurisdiction", "step_building_permits", "step_building_codes"):
        if len(hits_out) >= 10:
            break
        block = raw.get(step_key)
        if not isinstance(block, dict):
            continue
        for item in block.get("results") or []:
            if len(hits_out) >= 10:
                break
            if not isinstance(item, dict):
                continue
            url = str(item.get("url") or "").strip()
            title = str(item.get("title") or "")
            desc = str(item.get("description") or "")
            blob = f"{title} {desc}"
            if not _blob_future_code_signal(blob):
                continue
            dedupe = url or f"{title}|{desc[:80]}"
            if dedupe in seen:
                continue
            seen.add(dedupe)
            hits_out.append(
                {
                    "step": step_key,
                    "title": title or url or "(untitled)",
                    "url": url,
                    "snippet": (desc or "")[:360],
                }
            )
    active = bool(hits_out)
    return {
        "active": active,
        "banner": "FUTURE RISK ALERT",
        "severity": "future_code_cycle_signal" if active else "none",
        "hits": hits_out,
        "notes": (
            "Automated scan of Universal Scout titles/snippets on trusted domains only. "
            "Confirm council actions and effective dates with the AHJ."
        ),
    }


def format_future_risk_markdown(fr: Dict[str, Any]) -> str:
    """Markdown block prepended to the Contractor Action Plan so PDF exports retain watchdog output."""
    if not fr.get("active"):
        return ""
    lines = [
        "### FUTURE RISK ALERT",
        "",
        "**Watchdog — Code-change monitoring:** Scout hits reference a **future code edition or adoption-cycle signal** "
        "(for example **2026 NEC** or a later cycle). Verify the **effective NEC edition** and **local amendments** with "
        "the AHJ before locking specifications or inspection expectations.",
        "",
        "**Automated source flags (review live pages):**",
        "",
    ]
    for h in fr.get("hits") or []:
        title = str(h.get("title") or "Source").strip()
        url = str(h.get("url") or "").strip()
        lines.append(f"- **{title}** — {url}" if url else f"- **{title}**")
    lines.extend(
        [
            "",
            "- [ ] **Mandatory:** Confirm jurisdiction **code adoption schedule** (readings, ordinance numbers, effective date) "
            "and whether **2026 NEC** (or newer) is pending vs currently enforced.",
            "",
        ]
    )
    return "\n".join(lines)


def iter_universal_scout(
    zip_code: str,
    *,
    search_limit: int,
    enhanced_context: str = "",
    site_address: Optional[str] = None,
    jurisdiction: Optional[Mapping[str, Any]] = None,
    ahj_identification: Optional[Mapping[str, Any]] = None,
    scout_profile: Optional[Mapping[str, Any]] = None,
):
    """
    Yield one event dict per Universal Scout step, then a terminal ``complete`` event.

    Events:
      - ``{"event": "step", "step": "<key>", "data": {...}}``
      - ``{"event": "complete", "raw": <full scout dict>}``

    When ``jurisdiction`` is present (from geocoding), Universal Scout search lines name the
    resolved **city** or **county** for permits and **building codes**. Optional
    ``ahj_identification`` is echoed into the final payload for the memo.

    ``scout_profile`` enables **Full MEP** trade scoping, **mission-critical data-center** code
    discovery, project **vertical**, and (for **infrastructure** / **data_center**) a **FAST-41**
    federal-permitting pass.
    """
    z = normalize_us_zip(zip_code)
    ctx = (enhanced_context or "").strip() or None
    fc = _get_client()
    addr = (site_address or "").strip() or None
    ju: Optional[Mapping[str, Any]] = jurisdiction if jurisdiction else None
    ahj_snap: Optional[Mapping[str, Any]] = ahj_identification if ahj_identification else None
    prof = _coerce_scout_profile(scout_profile)

    st_for_filter: Optional[str] = None
    if ju:
        st_for_filter = str(ju.get("state") or ju.get("state_short") or "").strip() or None

    q1_core, q2_core, q3_core = _scout_queries_for_location(z, addr, ju, scout_profile=prof)
    q1 = _with_context(q1_core, ctx)
    hits1, meta1 = _scout_search(fc, q1, user_limit=search_limit, project_state=st_for_filter)
    yield {"event": "step", "step": "step_jurisdiction", "data": _step_result_dict(hits1, meta1)}
    hint = _jurisdiction_spelling_hint(hits1)

    if hint:
        q2 = _with_context(f"{q2_core} Context from web: {hint}", ctx)
    else:
        q2 = _with_context(q2_core, ctx)
    hits2, meta2 = _scout_search(fc, q2, user_limit=search_limit, project_state=st_for_filter)
    yield {"event": "step", "step": "step_building_permits", "data": _step_result_dict(hits2, meta2)}

    q3 = _with_context(q3_core, ctx)
    hits3, meta3 = _scout_search(fc, q3, user_limit=search_limit, project_state=st_for_filter)
    yield {"event": "step", "step": "step_building_codes", "data": _step_result_dict(hits3, meta3)}

    fast41_hits: Optional[List[Dict[str, Optional[str]]]] = None
    fast41_meta: Optional[Dict[str, Any]] = None
    if prof["vertical"] in ("infrastructure", "data_center"):
        zip_tag = f"ZIP {z}"
        city = str(ju.get("city") or "") if ju else ""
        county = str(ju.get("county") or "") if ju else ""
        st_j = str(ju.get("state") or ju.get("state_short") or "") if ju else ""
        mode_j = str(ju.get("mode") or "") if ju else ""
        q4_core = _fast41_query_line(
            zip_tag=zip_tag,
            city=city,
            county=county,
            st=st_j,
            mode=mode_j,
            site_address=addr,
            vertical=prof["vertical"],
        )
        q4 = _with_context(q4_core, ctx)
        fast41_hits, fast41_meta = _scout_search(
            fc, q4, user_limit=search_limit, project_state=st_for_filter
        )
        yield {"event": "step", "step": "step_federal_fast41", "data": _step_result_dict(fast41_hits, fast41_meta)}

    full = _final_scout_response(
        z,
        ctx,
        hits1,
        meta1,
        hits2,
        meta2,
        hits3,
        meta3,
        site_address=addr,
        jurisdiction=ju,
        ahj_identification=ahj_snap,
        scout_profile=prof,
        fast41_hits=fast41_hits,
        fast41_meta=fast41_meta,
    )
    yield {"event": "complete", "raw": full}


def search_local_building_codes_by_zip(
    zip_code: str,
    *,
    search_limit: int = 5,
    enhanced_context: str = "",
    scout_profile: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Universal Scout workflow (ZIP-centric — three core passes plus optional FAST-41):

    1. Jurisdiction hints for the ZIP (trusted domains only).
    2. Building department / permits for that area.
    3. Adopted codes and amendments.
    4. (Optional) FAST-41 federal permitting when ``scout_profile`` vertical is infrastructure/data center.

    Each step uses Firecrawl **/v2/search** (``web`` source only): URL + snippet discovery
    without bundled full-page scrape; capped at a few SERP rows per query.
    """
    for ev in iter_universal_scout(
        zip_code,
        search_limit=search_limit,
        enhanced_context=enhanced_context,
        scout_profile=scout_profile,
    ):
        if ev.get("event") == "complete":
            return ev["raw"]
    raise RuntimeError("Universal Scout completed without a terminal event")
