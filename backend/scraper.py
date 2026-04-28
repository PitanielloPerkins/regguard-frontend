"""
Reg Guard — Universal Scout: Firecrawl search in *discovery* configuration.

Discovery mode here means the Firecrawl `/search` flow that returns SERP hits and,
via `scrapeOptions`, fetches each page (markdown + outbound links) in one call—
the “discover URLs, then extract content” pattern from Firecrawl’s search API.

Results are steered to official-style hosts: `.gov`, `.org`, Municode, ICC / ICCSAFE,
American Legal Publishing (amlegal.com), and UpCodes (up.codes).
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

# Firecrawl supports common search operators; this OR-chain biases SERP toward
# government, broad non-profit TLD, major code publishers, and common codified-law hosts.
SEARCH_DOMAIN_SCOPE = (
    "(site:gov OR site:org OR site:municode.com OR site:iccsafe.org "
    "OR site:amlegal.com OR site:up.codes)"
)

_AGENT_JURISDICTION_ZIP = (
    "Find which US city and county US ZIP {zip} falls under. "
    "Prefer results naming the municipality and county for permit jurisdiction."
)
_AGENT_PERMITS_ZIP = (
    "For the US city and/or county that contains ZIP {zip}, search for: "
    "[City/County] building department, permit applications, "
    "adopted building code and local amendments, official AHJ site."
)
_AGENT_CODES_ZIP = (
    "For ZIP {zip} and its local jurisdiction, find adopted building codes "
    "(e.g. IBC/IRC) and municipal or county code amendments, official sources."
)


def _scout_queries_for_location(
    z: str,
    site_address: Optional[str],
    jurisdiction: Optional[Mapping[str, Any]],
) -> tuple[str, str, str]:
    """
    Build (jurisdiction, permits, codes) search lines for Universal Scout.

    When ``jurisdiction`` is present (from Google Geocoding), steer explicitly
    toward **city** vs **county** building departments; otherwise keep ZIP-centric copy.
    """
    addr = (site_address or "").strip()
    ju = jurisdiction
    if ju:
        addr = addr or str(ju.get("formatted_address") or "").strip() or f"ZIP {z}"

    if not ju or not addr:
        return (
            f"{_AGENT_JURISDICTION_ZIP.format(zip=z)} (ZIP {z})",
            _AGENT_PERMITS_ZIP.format(zip=z),
            _AGENT_CODES_ZIP.format(zip=z),
        )

    mode = str(ju.get("mode") or "").strip().lower()
    city = str(ju.get("city") or "").strip()
    county = str(ju.get("county") or "").strip()
    st = str(ju.get("state") or "").strip()

    if mode == "county" or (not city and county):
        county_disp = f"{county} County" if county and not county.lower().endswith("county") else county
        juris = (
            f"For job site {addr} in unincorporated or county-administered {county_disp}, "
            f"{st} (ZIP {z}), confirm the **county** is the Authority Having Jurisdiction "
            f"(AHJ) for building permits — not a city municipal building department."
        )
        permits = (
            f"{county_disp} {st} building permits and inspections, development services, "
            f"unincorporated areas, official .gov — ZIP {z}"
        )
        codes = (
            f"Building codes adopted specifically for {county_disp} {st}: county building code, "
            f"IBC IRC local adoption, county code amendments, codified law official .gov Municode "
            f"— jurisdiction ZIP {z}"
        )
        return (juris, permits, codes)

    city_disp = city or "the municipality"
    juris = (
        f"For job site {addr} in incorporated {city_disp}, {st} (ZIP {z}), the **city** "
        f"municipality is typically the AHJ for building permits at this address (not the county)."
    )
    permits = (
        f"{city_disp} {st} building department permits applications plan check "
        f"official city .gov — ZIP {z}"
    )
    codes = (
        f"Building codes adopted specifically for incorporated {city_disp} {st} "
        f"(not county-wide): municipal building code, IBC IRC local adoption, city code amendments, "
        f"official .gov Municode amlegal — area ZIP {z}"
    )
    return (juris, permits, codes)

# Reuse cached scrapes where possible (24h).
FIRECRAWL_MAX_AGE_MS = 86400000

# Discovery scrape: markdown for LLM-ready text; links for onward scouting.
DISCOVERY_SCRAPE_OPTIONS = ScrapeOptions(
    max_age=FIRECRAWL_MAX_AGE_MS,
    formats=["markdown", "links"],
    only_main_content=True,
)


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


def _hostname(url: str) -> str:
    try:
        p = urlparse(url)
        host = (p.hostname or "").lower().rstrip(".")
        return host
    except (ValueError, TypeError):
        return ""


def hostname_matches_trust_policy(host: str) -> bool:
    """
    True if the host matches Universal Scout coverage: .gov, .org, Municode,
    ICC / ICCSAFE, American Legal Publishing, or UpCodes.

    Post-filter is defense-in-depth alongside SEARCH_DOMAIN_SCOPE in the query string.
    """
    if not host:
        return False
    if host.endswith(".gov"):
        return True
    if host.endswith(".org"):
        return True
    if "municode" in host:
        return True
    if "iccsafe" in host:
        return True
    if "amlegal" in host:
        return True
    if "up.codes" in host:
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
) -> List[Dict[str, Optional[str]]]:
    seen: set[str] = set()
    out: List[Dict[str, Optional[str]]] = []
    for h in hits:
        u = h.get("url")
        if not u or u in seen:
            continue
        if not url_matches_trust_policy(u):
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


def _scout_api_limit(user_limit: int) -> int:
    """Ask Firecrawl for extra rows so post-filtering to trusted hosts still fills `user_limit`."""
    return min(100, max(user_limit, user_limit * 4))


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
) -> tuple[List[Dict[str, Optional[str]]], Dict[str, Any]]:
    """
    Run Universal Scout: scoped discovery search + trusted-host filter.
    If that yields zero rows, run one fallback search **without** domain operators,
    adding *official* (if absent) and *city government landing page* so the SERP targets
    the locality's official municipal entry page; return unfiltered web hits (deduped).
    """
    api_limit = _scout_api_limit(user_limit)
    primary_q = _append_scope(query)
    meta: Dict[str, Any] = {
        "primary_query": primary_q,
        "fallback_used": False,
        "fallback_query": None,
    }

    r = fc.search(
        primary_q,
        limit=api_limit,
        location="US",
        scrape_options=DISCOVERY_SCRAPE_OPTIONS,
    )
    trusted = _filter_trusted(_web_hits_raw(r), user_limit)
    if trusted:
        return trusted, meta

    fb = _fallback_official_query(query)
    meta["fallback_used"] = True
    meta["fallback_query"] = fb
    r2 = fc.search(
        fb,
        limit=api_limit,
        location="US",
        scrape_options=DISCOVERY_SCRAPE_OPTIONS,
    )
    return _dedupe_take(_web_hits_raw(r2), user_limit), meta


def _step_result_dict(
    hits: List[Dict[str, Optional[str]]],
    scout_meta: Dict[str, Any],
) -> Dict[str, Any]:
    return {
        "query": scout_meta["primary_query"],
        "results": hits,
        "fallback_used": scout_meta.get("fallback_used", False),
        "fallback_query": scout_meta.get("fallback_query"),
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
            "Fallback — If a scoped step returns no trusted URLs: one unscoped search (no site: filters) "
            "with *official* and *city government landing page* to reach the locality's official entry point.",
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
            "mode": "discovery",
            "search_domain_scope": SEARCH_DOMAIN_SCOPE,
            "trust_policy": (
                "hostname ends with .gov or .org, or contains municode, iccsafe, amlegal, or up.codes"
            ),
            "scrape_formats": ["markdown", "links"],
            "fallback": (
                "If a scoped step returns zero trusted URLs, Universal Scout runs one unscoped "
                "search: it keeps the same research intent, ensures the word *official*, and adds "
                "*city government landing page* to surface the municipality's official site entry "
                "(no site: domain filters)."
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

    When ``site_address`` and ``jurisdiction`` are provided (from Google Places),
    search lines steer toward **city** vs **county** building departments.
    """
    z = normalize_us_zip(zip_code)
    ctx = (enhanced_context or "").strip() or None
    fc = _get_client()
    addr = (site_address or "").strip() or None
    ju: Optional[Mapping[str, Any]] = jurisdiction if jurisdiction else None
    ahj_snap: Optional[Mapping[str, Any]] = ahj_identification if ahj_identification else None

    q1_core, q2_core, q3_core = _scout_queries_for_location(z, addr, ju)
    q1 = _with_context(q1_core, ctx)
    hits1, meta1 = _scout_search(fc, q1, user_limit=search_limit)
    yield {"event": "step", "step": "step_jurisdiction", "data": _step_result_dict(hits1, meta1)}
    hint = _jurisdiction_spelling_hint(hits1)

    if hint:
        q2 = _with_context(f"{q2_core} Context from web: {hint}", ctx)
    else:
        q2 = _with_context(q2_core, ctx)
    hits2, meta2 = _scout_search(fc, q2, user_limit=search_limit)
    yield {"event": "step", "step": "step_building_permits", "data": _step_result_dict(hits2, meta2)}

    q3 = _with_context(q3_core, ctx)
    hits3, meta3 = _scout_search(fc, q3, user_limit=search_limit)
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

    Each step uses Firecrawl **search discovery** (search + per-result scrape of
    markdown and links), scoped to trusted hosts; empty scoped steps trigger one
    unscoped **official** fallback search oriented to the city's government landing page.
    """
    for ev in iter_universal_scout(
        zip_code, search_limit=search_limit, enhanced_context=enhanced_context
    ):
        if ev.get("event") == "complete":
            return ev["raw"]
    raise RuntimeError("Universal Scout completed without a terminal event")
