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

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")

# -----------------------------------------------------------------------------
# Universal Scout — trusted domains (query operators + post-filter)
# -----------------------------------------------------------------------------

# Firecrawl / web search: restrict SERP to U.S. government and Municode (reduces unrelated-state noise).
SEARCH_DOMAIN_SCOPE = "(site:gov OR site:municode.com)"

# City of Plano — product-targeted scout supplements (also referenced from ``main`` module comment).
PLANO_SCOUT_AMENDMENTS_NEC = "Plano TX electrical amendments 2023 NEC"
PLANO_SCOUT_FEE_SCHEDULE = "Plano building fee schedule 2026"


def _is_plano_texas(city: str, state: str) -> bool:
    c = (city or "").strip().lower()
    s = (state or "").strip().upper()
    return c == "plano" and s in ("TX",)


def _scout_queries_for_location(
    z: str,
    site_address: Optional[str],
    jurisdiction: Optional[Mapping[str, Any]],
) -> tuple[str, str, str]:
    """
    Build (jurisdiction, permits, codes) search lines for Universal Scout.

    Every line includes **explicit locality** (``City, ST`` or ``County, ST``) when geocoding
    provides it, plus ZIP where helpful. Queries are combined in ``_append_scope`` with
    ``(site:gov OR site:municode.com)``.
    """
    addr = (site_address or "").strip()
    ju = jurisdiction
    if ju:
        addr = addr or str(ju.get("formatted_address") or "").strip() or f"ZIP {z}"

    zip_tag = f"ZIP {z}"

    if not ju or not addr:
        return (
            f"US {zip_tag} municipality county jurisdiction AHJ building permits — {zip_tag}",
            f"US {zip_tag} building department permit applications electrical official — {zip_tag}",
            f"US {zip_tag} adopted building code amendments codified law official — {zip_tag}",
        )

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
    if _is_plano_texas(city, st):
        permits = f"{permits} | {PLANO_SCOUT_FEE_SCHEDULE}"
        codes = f"{codes} | {PLANO_SCOUT_AMENDMENTS_NEC}"
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
    """
    api_limit = _effective_search_limit(user_limit)
    primary_q = _append_scope(query)
    meta: Dict[str, Any] = {
        "primary_query": primary_q,
        "fallback_used": False,
        "fallback_query": None,
        "firecrawl_mode": "search_web_serp_only",
        "firecrawl_limit": api_limit,
    }

    r = fc.search(
        primary_q,
        limit=api_limit,
        sources=["web"],
        location="US",
        scrape_options=None,
    )
    trusted = _filter_trusted(_web_hits_raw(r), user_limit, project_state=project_state)
    if trusted:
        return trusted, meta

    fb_core = _fallback_official_query(query)
    fb = _append_scope(fb_core)
    meta["fallback_used"] = True
    meta["fallback_query"] = fb
    r2 = fc.search(
        fb,
        limit=api_limit,
        sources=["web"],
        location="US",
        scrape_options=None,
    )
    return _filter_trusted(_web_hits_raw(r2), user_limit, project_state=project_state), meta


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
            "(unincorporated) adopted codes and amendments.",
        ]
    )
    out: Dict[str, Any] = {
        "zip": z,
        "site_address": addr or None,
        "jurisdiction": ju,
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
    if ahj:
        out["step_ahj_identification"] = ahj
    return out


def iter_universal_scout(
    zip_code: str,
    *,
    search_limit: int,
    enhanced_context: str = "",
    site_address: Optional[str] = None,
    jurisdiction: Optional[Mapping[str, Any]] = None,
    ahj_identification: Optional[Mapping[str, Any]] = None,
):
    """
    Yield one event dict per Universal Scout step, then a terminal ``complete`` event.

    Events:
      - ``{"event": "step", "step": "<key>", "data": {...}}``
      - ``{"event": "complete", "raw": <full scout dict>}``

    When ``jurisdiction`` is present (from geocoding), Universal Scout search lines name the
    resolved **city** or **county** for permits and **building codes**. Optional
    ``ahj_identification`` is echoed into the final payload for the memo.
    """
    z = normalize_us_zip(zip_code)
    ctx = (enhanced_context or "").strip() or None
    fc = _get_client()
    addr = (site_address or "").strip() or None
    ju: Optional[Mapping[str, Any]] = jurisdiction if jurisdiction else None
    ahj_snap: Optional[Mapping[str, Any]] = ahj_identification if ahj_identification else None

    st_for_filter: Optional[str] = None
    if ju:
        st_for_filter = str(ju.get("state") or ju.get("state_short") or "").strip() or None

    q1_core, q2_core, q3_core = _scout_queries_for_location(z, addr, ju)
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
    )
    yield {"event": "complete", "raw": full}


def search_local_building_codes_by_zip(
    zip_code: str,
    *,
    search_limit: int = 5,
    enhanced_context: str = "",
) -> Dict[str, Any]:
    """
    Universal Scout workflow (ZIP-centric, three passes):

    1. Jurisdiction hints for the ZIP (trusted domains only).
    2. Building department / permits for that area.
    3. Adopted codes and amendments.

    Each step uses Firecrawl **/v2/search** (``web`` source only): URL + snippet discovery
    without bundled full-page scrape; capped at a few SERP rows per query.
    """
    for ev in iter_universal_scout(
        zip_code, search_limit=search_limit, enhanced_context=enhanced_context
    ):
        if ev.get("event") == "complete":
            return ev["raw"]
    raise RuntimeError("Universal Scout completed without a terminal event")
