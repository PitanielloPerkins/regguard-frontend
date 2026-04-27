"""
Reg Guard — Universal Scout: Firecrawl search in *discovery* configuration.

Discovery mode here means the Firecrawl `/search` flow that returns SERP hits and,
via `scrapeOptions`, fetches each page (markdown + outbound links) in one call—
the “discover URLs, then extract content” pattern from Firecrawl’s search API.

Results are steered to official-style hosts: `.gov`, `.org`, Municode, and ICC / ICCSAFE.
"""
from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional
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
# government, broad non-profit TLD, and the two major US code publishers.
SEARCH_DOMAIN_SCOPE = (
    "(site:gov OR site:org OR site:municode.com OR site:iccsafe.org)"
)

_AGENT_JURISDICTION = (
    "Find which US city and county US ZIP {zip} falls under. "
    "Prefer results naming the municipality and county for permit jurisdiction."
)
_AGENT_PERMITS = (
    "For the US city and/or county that contains ZIP {zip}, search for: "
    "[City/County] building department, permit applications, "
    "adopted building code and local amendments, official AHJ site."
)
_AGENT_CODES = (
    "For ZIP {zip} and its local jurisdiction, find adopted building codes "
    "(e.g. IBC/IRC) and municipal or county code amendments, official sources."
)

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
    True if the host is intended coverage: .gov, .org, Municode, or ICC / ICCSAFE.

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


def _scout_search(
    fc: Firecrawl,
    query: str,
    *,
    user_limit: int,
) -> List[Dict[str, Optional[str]]]:
    """
    Run one Universal Scout Firecrawl search: discovery scrape options + trusted-host filter.
    """
    q = _append_scope(query)
    api_limit = _scout_api_limit(user_limit)
    r = fc.search(
        q,
        limit=api_limit,
        location="US",
        scrape_options=DISCOVERY_SCRAPE_OPTIONS,
    )
    raw_hits = _web_hits_raw(r)
    return _filter_trusted(raw_hits, user_limit)


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
    markdown and links) and restricts to `.gov`, `.org`, Municode, and ICCSAFE hosts.
    """
    z = normalize_us_zip(zip_code)
    ctx = (enhanced_context or "").strip() or None
    fc = _get_client()

    q1 = _with_context(f"{_AGENT_JURISDICTION.format(zip=z)} (ZIP {z})", ctx)
    hits1 = _scout_search(fc, q1, user_limit=search_limit)
    hint = _jurisdiction_spelling_hint(hits1)

    q2_core = _AGENT_PERMITS.format(zip=z)
    if hint:
        q2 = _with_context(f"{q2_core} Context from web: {hint}", ctx)
    else:
        q2 = _with_context(q2_core, ctx)
    hits2 = _scout_search(fc, q2, user_limit=search_limit)

    q3 = _with_context(_AGENT_CODES.format(zip=z), ctx)
    hits3 = _scout_search(fc, q3, user_limit=search_limit)

    return {
        "zip": z,
        "scout": {
            "mode": "discovery",
            "search_domain_scope": SEARCH_DOMAIN_SCOPE,
            "trust_policy": "hostname ends with .gov or .org, or contains municode / iccsafe",
            "scrape_formats": ["markdown", "links"],
        },
        "enhanced_context_used": bool(ctx),
        "agentic_workflow": [
            "Universal Scout 1 — Jurisdiction: infer city/county for the ZIP (trusted hosts).",
            "Universal Scout 2 — Permits: building department and permit sources.",
            "Universal Scout 3 — Codes: adopted codes and local amendments (official publishers).",
        ],
        "step_jurisdiction": {"query": _append_scope(q1), "results": hits1},
        "step_building_permits": {"query": _append_scope(q2), "results": hits2},
        "step_building_codes": {"query": _append_scope(q3), "results": hits3},
    }
