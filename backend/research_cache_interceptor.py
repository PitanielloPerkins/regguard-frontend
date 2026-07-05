"""
Research Cache Interceptor — Database caching layer for Universal Scout results.

Intercepts expensive Firecrawl API execution chains by checking the `cached_jurisdictions`
table before triggering external network requests. Implements multi-tenant cache reuse across
all users, dramatically reducing credits consumed per research run.

**Cache Flow:**
1. User submits ZIP code + address to /research endpoint
2. Before calling iter_universal_scout, check cached_jurisdictions table
3. If cache hit (created_at < 30 days old):
   - Read cached JSONB payload from database
   - Bypass Firecrawl entirely
   - Pass cached data directly to LLM parser (fast path)
   - Return response to user
4. If cache miss:
   - Run full Firecrawl pipeline (slow path)
   - Immediately store successful result in cached_jurisdictions
   - Serve response to user
   - Next query for same ZIP gets instant cache hit

**Benefits:**
- 90%+ reduction in API calls for repeat ZIPs (24h cache TTL minimum, 30 days typical)
- ~100ms cache lookup vs ~30s Firecrawl execution per step
- Multi-tenant: all users benefit from accumulated cache
- Fallback to Firecrawl on cache miss (no user-facing failures)
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from jurisdiction_cache import (
    lookup_cached_jurisdiction,
    store_cached_jurisdiction,
)

logger = logging.getLogger(__name__)

# Cache age threshold (seconds): cache is considered "fresh" if created_at is less than this old
_CACHE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60  # 30 days default


def _cache_is_fresh(created_at_iso: Optional[str]) -> bool:
    """
    Check if a cached record is still fresh (created_at < 30 days old).
    
    Args:
        created_at_iso: ISO 8601 timestamp from database (e.g., "2026-06-27T10:44:00Z")
    
    Returns:
        True if cache is fresh, False if stale or invalid
    """
    if not created_at_iso:
        return False
    
    try:
        # Parse ISO 8601 timestamp, handle both "Z" and "+00:00" formats
        timestamp_str = created_at_iso.replace("Z", "+00:00")
        created_dt = datetime.fromisoformat(timestamp_str)
        
        # Get current time in UTC
        now = datetime.now(timezone.utc)
        
        # Ensure created_dt is timezone-aware for comparison
        if created_dt.tzinfo is None:
            created_dt = created_dt.replace(tzinfo=timezone.utc)
        
        age_seconds = (now - created_dt).total_seconds()
        is_fresh = age_seconds < _CACHE_MAX_AGE_SECONDS
        
        if not is_fresh:
            logger.debug(
                f"Cache stale: {age_seconds / (24 * 3600):.1f} days old "
                f"(max {_CACHE_MAX_AGE_SECONDS / (24 * 3600):.0f} days)"
            )
        
        return is_fresh
    
    except (ValueError, TypeError) as e:
        logger.warning(f"Failed to parse created_at timestamp: {created_at_iso} ({e})")
        return False


def try_cached_jurisdiction(zip_code: str) -> Optional[Dict[str, Any]]:
    """
    Attempt to retrieve a cached jurisdiction result from the database.
    
    **Fast path (cache hit):** Looks up zip_code in cached_jurisdictions, validates TTL,
    and returns the cached JSONB payload if fresh. Fails gracefully (returns None) on
    cache miss or TTL expiration.
    
    **Fallback:** If this returns None, caller should proceed with full Firecrawl pipeline.
    
    Args:
        zip_code: 5-digit US ZIP code (e.g., "75074")
    
    Returns:
        Dict with cached Firecrawl payload if hit and fresh, None otherwise
    """
    if not zip_code or not isinstance(zip_code, str):
        return None
    
    zip_normalized = (zip_code or "").strip()
    if len(zip_normalized) != 5 or not zip_normalized.isdigit():
        logger.debug(f"Invalid ZIP code format for cache lookup: {zip_normalized}")
        return None
    
    try:
        # Query cached_jurisdictions table
        record = lookup_cached_jurisdiction(zip_normalized)
        
        if not record:
            logger.debug(f"Cache miss: No record found for ZIP {zip_normalized}")
            return None
        
        # Check TTL: is the record fresh?
        created_at = record.get("created_at")
        if not _cache_is_fresh(created_at):
            logger.info(
                f"Cache expired for ZIP {zip_normalized} "
                f"(created: {created_at}). Will refresh from Firecrawl."
            )
            return None
        
        # Extract the cached payload
        payload = record.get("firecrawl_payload")
        if not payload:
            logger.warning(f"Cached record for ZIP {zip_normalized} has empty payload")
            return None
        
        # Payload may be stored as JSON string or dict depending on Supabase JSONB handling
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except json.JSONDecodeError:
                logger.error(f"Failed to parse JSON payload for ZIP {zip_normalized}")
                return None
        
        logger.info(f"Cache hit for ZIP {zip_normalized} (age: {record.get('created_at')})")
        return payload
    
    except Exception as e:
        logger.error(f"Error during cache lookup for ZIP {zip_normalized}: {e}")
        # Fail gracefully — let caller proceed with Firecrawl
        return None


def cache_firecrawl_result(
    zip_code: str,
    city: str,
    state: str,
    firecrawl_payload: Dict[str, Any],
) -> bool:
    """
    Store a successful Firecrawl result in the cache for future use.
    
    Called after Firecrawl completes successfully, immediately caches the result so:
    1. Repeat queries for same ZIP get instant cache hit
    2. All other users benefit from the cached result (multi-tenant)
    3. Next research run avoids expensive API calls
    
    **Failure handling:** Returns False on error, but does NOT raise. Caller should
    continue serving the result to the user even if caching fails.
    
    Args:
        zip_code: 5-digit US ZIP code
        city: City name (e.g., "Plano")
        state: 2-letter state abbreviation (e.g., "TX")
        firecrawl_payload: Full Firecrawl scout result dict (from iter_universal_scout)
    
    Returns:
        True if successfully cached, False otherwise
    """
    if not all([zip_code, city, state, firecrawl_payload]):
        logger.warning("Missing required fields for caching: zip_code, city, state, or payload")
        return False
    
    zip_normalized = (zip_code or "").strip()
    if len(zip_normalized) != 5 or not zip_normalized.isdigit():
        logger.warning(f"Invalid ZIP for caching: {zip_normalized}")
        return False
    
    try:
        success = store_cached_jurisdiction(
            zip_code=zip_normalized,
            city=city.strip(),
            state=state.strip().upper(),
            firecrawl_payload=firecrawl_payload,
        )
        
        if success:
            logger.info(f"Successfully cached Firecrawl result for ZIP {zip_normalized}")
        else:
            logger.warning(f"Failed to cache Firecrawl result for ZIP {zip_normalized}")
        
        return success
    
    except Exception as e:
        logger.error(f"Exception while caching Firecrawl result for ZIP {zip_normalized}: {e}")
        # Fail gracefully; don't interrupt user experience
        return False


def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics for monitoring and optimization.
    
    Returns:
        Dict with: total_cached, states_covered, oldest_cache_age_days
    """
    from jurisdiction_cache import get_cache_stats as _get_stats
    
    try:
        stats = _get_stats()
        return {
            "total_cached": stats.get("total_entries", 0),
            "states_covered": stats.get("states_covered", 0),
            "states_list": stats.get("states_list", []),
            "oldest_cache_age_days": stats.get("oldest_entry_age_days"),
            "cache_max_age_days": _CACHE_MAX_AGE_SECONDS / (24 * 3600),
        }
    except Exception as e:
        logger.error(f"Failed to fetch cache stats: {e}")
        return {
            "total_cached": 0,
            "states_covered": 0,
            "states_list": [],
            "oldest_cache_age_days": None,
            "cache_max_age_days": _CACHE_MAX_AGE_SECONDS / (24 * 3600),
        }


def create_cache_intercept_context(
    zip_code: str,
    city: str,
    state: str,
) -> Dict[str, Any]:
    """
    Create a cache interception context for a research request.
    
    Checks if cached data exists, returns structure indicating whether to use
    cache (fast path) or proceed with Firecrawl (slow path).
    
    Args:
        zip_code: 5-digit US ZIP code
        city: City name
        state: 2-letter state abbreviation
    
    Returns:
        Dict with:
          - use_cache (bool): True if cache hit and fresh
          - cached_payload (Optional[Dict]): Cached Firecrawl result if hit
          - cache_age_seconds (Optional[int]): Age of cache record in seconds
          - zip_code (str): Normalized ZIP
          - city (str): City name
          - state (str): State abbreviation
    """
    result = {
        "use_cache": False,
        "cached_payload": None,
        "cache_age_seconds": None,
        "zip_code": zip_code.strip() if zip_code else "",
        "city": city.strip() if city else "",
        "state": state.strip().upper() if state else "",
    }
    
    if not result["zip_code"] or len(result["zip_code"]) != 5:
        return result
    
    # Try to load from cache
    cached_record = try_cached_jurisdiction(result["zip_code"])
    
    if cached_record:
        result["use_cache"] = True
        result["cached_payload"] = cached_record
        
        # Calculate cache age
        created_at = cached_record.get("created_at")
        if created_at:
            try:
                timestamp_str = created_at.replace("Z", "+00:00")
                created_dt = datetime.fromisoformat(timestamp_str)
                if created_dt.tzinfo is None:
                    created_dt = created_dt.replace(tzinfo=timezone.utc)
                now = datetime.now(timezone.utc)
                result["cache_age_seconds"] = int((now - created_dt).total_seconds())
            except (ValueError, TypeError):
                pass
    
    return result


# Configuration: allow cache to be disabled via environment variable
def is_cache_enabled() -> bool:
    """Check if cache interceptor is enabled (default: True)."""
    import os
    v = (os.environ.get("REG_GUARD_CACHE_INTERCEPTOR") or "1").strip().lower()
    return v not in ("0", "false", "no", "off")
