"""
In-process **semantic cache** for Universal Scout Firecrawl `/search` results.

Keys normalize whitespace and case on the **full scoped query string** (including
``site:gov`` operators), plus user result cap and project state — duplicate scouts
within TTL reuse trusted SERP rows without a billable search.

Disable with ``REG_GUARD_SEMANTIC_SCOUT_CACHE=0``. Tune TTL via ``REG_GUARD_SCOUT_CACHE_TTL_SEC`` (default 3600).
"""
from __future__ import annotations

import hashlib
import os
import threading
import time
from typing import Any, Dict, List, Optional, Tuple

from cost_tracking import log_api_usage

_LOCK = threading.Lock()
_ENTRIES: Dict[str, Tuple[float, List[Dict[str, Optional[str]]], Dict[str, Any]]] = {}
_MAX_ENTRIES = 512


def semantic_scout_cache_enabled() -> bool:
    v = (os.environ.get("REG_GUARD_SEMANTIC_SCOUT_CACHE") or "1").strip().lower()
    return v not in ("0", "false", "no", "off")


def scout_cache_ttl_sec() -> float:
    try:
        return max(60.0, float(os.environ.get("REG_GUARD_SCOUT_CACHE_TTL_SEC", "3600")))
    except ValueError:
        return 3600.0


def clear_semantic_scout_cache() -> None:
    with _LOCK:
        _ENTRIES.clear()


def _normalize_query(q: str) -> str:
    return " ".join((q or "").lower().split())


def cache_key_firecrawl_line(scoped_query: str, user_limit: int, project_state: Optional[str]) -> str:
    st = (project_state or "").strip().upper() or "-"
    raw = f"{_normalize_query(scoped_query)}|{int(user_limit)}|{st}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()


def cache_get(
    scoped_query: str,
    user_limit: int,
    project_state: Optional[str],
) -> Optional[Tuple[List[Dict[str, Optional[str]]], Dict[str, Any]]]:
    if not semantic_scout_cache_enabled():
        return None
    k = cache_key_firecrawl_line(scoped_query, user_limit, project_state)
    now = time.monotonic()
    ttl = scout_cache_ttl_sec()
    with _LOCK:
        row = _ENTRIES.get(k)
        if not row:
            return None
        ts, hits, meta = row
        if now - ts > ttl:
            del _ENTRIES[k]
            return None
    log_api_usage(
        project_key="scout",
        route="firecrawl_search_semantic_cache_hit",
        model="cache",
        meta={"cache_key_prefix": k[:16], "hits": len(hits)},
    )
    return list(hits), dict(meta)


def cache_set(
    scoped_query: str,
    user_limit: int,
    project_state: Optional[str],
    hits: List[Dict[str, Optional[str]]],
    meta: Dict[str, Any],
) -> None:
    if not semantic_scout_cache_enabled():
        return
    k = cache_key_firecrawl_line(scoped_query, user_limit, project_state)
    now = time.monotonic()
    snap_hits = [dict(h) for h in hits]
    snap_meta = dict(meta)
    with _LOCK:
        while len(_ENTRIES) >= _MAX_ENTRIES:
            try:
                oldest = min(_ENTRIES.items(), key=lambda kv: kv[1][0])
                del _ENTRIES[oldest[0]]
            except ValueError:
                break
        _ENTRIES[k] = (now, snap_hits, snap_meta)
