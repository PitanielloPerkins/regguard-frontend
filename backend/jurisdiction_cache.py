"""
Supabase cached_jurisdictions lookup and management.

Provides efficient reads from the global multi-tenant jurisdiction cache,
eliminating redundant Firecrawl API calls when jurisdiction data already exists.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None  # type: ignore[assignment]
    Client = None  # type: ignore[assignment]

logger = logging.getLogger(__name__)


def _supabase_client() -> Client:
    """Get initialized Supabase client."""
    if create_client is None:
        raise ImportError("supabase package not installed")
    
    import os
    url = (os.environ.get("SUPABASE_URL") or "").strip()
    key = (os.environ.get("SUPABASE_KEY") or "").strip()
    
    if not url or not key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_KEY are required. "
            "Set these environment variables to enable Supabase integration."
        )
    
    return create_client(url, key)


def lookup_cached_jurisdiction(zip_code: str) -> Optional[Dict[str, Any]]:
    """
    Look up a cached jurisdiction by ZIP code.
    
    Returns a dict with cached data if found, None otherwise.
    
    **Multi-tenant benefit:** All users can read from this global cache,
    reducing API calls to Firecrawl and other third-party services.
    
    Args:
        zip_code: 5-digit US ZIP code (e.g., "75074")
    
    Returns:
        Dict with keys: id, zip_code, city, state, firecrawl_payload, created_at
        or None if not found
    """
    if not zip_code or not isinstance(zip_code, str):
        return None
    
    zip_normalized = zip_code.strip()
    if len(zip_normalized) != 5 or not zip_normalized.isdigit():
        logger.warning(f"Invalid ZIP code format: {zip_normalized}")
        return None
    
    try:
        sb = _supabase_client()
        response = sb.table("cached_jurisdictions").select("*").eq(
            "zip_code", zip_normalized
        ).execute()
        
        data = response.data
        if data and len(data) > 0:
            record = data[0]
            logger.info(f"Cache hit for ZIP {zip_normalized}")
            return record
        
        logger.debug(f"Cache miss for ZIP {zip_normalized}")
        return None
    
    except Exception as e:
        logger.error(f"Failed to lookup cached jurisdiction for {zip_normalized}: {e}")
        return None


def store_cached_jurisdiction(
    zip_code: str,
    city: str,
    state: str,
    firecrawl_payload: Dict[str, Any],
) -> bool:
    """
    Store or update a jurisdiction in the cache.
    
    Only admins or service role can write to this cache.
    On upsert, the old record is replaced with the new one.
    
    Args:
        zip_code: 5-digit US ZIP code
        city: City name
        state: 2-letter state abbreviation
        firecrawl_payload: JSONB payload from Firecrawl /search
    
    Returns:
        True if successful, False otherwise
    """
    if not all([zip_code, city, state]):
        logger.warning("Missing required fields for jurisdiction cache")
        return False
    
    zip_normalized = zip_code.strip()
    if len(zip_normalized) != 5 or not zip_normalized.isdigit():
        logger.warning(f"Invalid ZIP code format: {zip_normalized}")
        return False
    
    try:
        sb = _supabase_client()
        
        # Upsert: insert if not exists, update if exists
        response = sb.table("cached_jurisdictions").upsert(
            {
                "zip_code": zip_normalized,
                "city": city.strip(),
                "state": state.strip().upper(),
                "firecrawl_payload": firecrawl_payload or {},
            },
            on_conflict="zip_code",
        ).execute()
        
        if response.data:
            logger.info(f"Successfully cached jurisdiction for ZIP {zip_normalized}")
            return True
        
        logger.error(f"Unexpected upsert response for ZIP {zip_normalized}")
        return False
    
    except Exception as e:
        logger.error(f"Failed to store cached jurisdiction for {zip_normalized}: {e}")
        return False


def get_cached_jurisdictions_by_state(state: str) -> list[Dict[str, Any]]:
    """
    Get all cached jurisdictions for a given state.
    
    Useful for bulk lookups or cache statistics.
    
    Args:
        state: 2-letter state abbreviation (e.g., "TX")
    
    Returns:
        List of jurisdiction records for that state
    """
    if not state or not isinstance(state, str) or len(state) != 2:
        logger.warning(f"Invalid state format: {state}")
        return []
    
    try:
        sb = _supabase_client()
        response = sb.table("cached_jurisdictions").select("*").eq(
            "state", state.strip().upper()
        ).execute()
        
        return response.data or []
    
    except Exception as e:
        logger.error(f"Failed to fetch jurisdictions for state {state}: {e}")
        return []


def clear_cache_for_zip(zip_code: str) -> bool:
    """
    Remove a jurisdiction from the cache (useful for cache invalidation).
    
    Only admins or service role can delete.
    
    Args:
        zip_code: 5-digit US ZIP code
    
    Returns:
        True if successful, False otherwise
    """
    if not zip_code or not isinstance(zip_code, str):
        return False
    
    zip_normalized = zip_code.strip()
    if len(zip_normalized) != 5 or not zip_normalized.isdigit():
        logger.warning(f"Invalid ZIP code format: {zip_normalized}")
        return False
    
    try:
        sb = _supabase_client()
        response = sb.table("cached_jurisdictions").delete().eq(
            "zip_code", zip_normalized
        ).execute()
        
        logger.info(f"Cleared cache for ZIP {zip_normalized}")
        return True
    
    except Exception as e:
        logger.error(f"Failed to clear cache for {zip_normalized}: {e}")
        return False


def get_cache_stats() -> Dict[str, Any]:
    """
    Get cache statistics (useful for monitoring and TTL decisions).
    
    Returns:
        Dict with: total_entries, states_covered, oldest_entry_age_days
    """
    try:
        sb = _supabase_client()
        
        # Count total entries
        response = sb.table("cached_jurisdictions").select(
            "id", count="exact"
        ).execute()
        total_entries = response.count or 0
        
        # Get distinct states
        response = sb.table("cached_jurisdictions").select(
            "state"
        ).execute()
        states = set(r["state"] for r in (response.data or []) if r.get("state"))
        
        # Get oldest entry
        response = sb.table("cached_jurisdictions").select(
            "created_at"
        ).order("created_at", desc=False).limit(1).execute()
        oldest_age_days = None
        if response.data and response.data[0].get("created_at"):
            from datetime import datetime, timezone
            oldest_dt = datetime.fromisoformat(
                response.data[0]["created_at"].replace("Z", "+00:00")
            )
            oldest_age_days = (
                datetime.now(timezone.utc) - oldest_dt
            ).days
        
        return {
            "total_entries": total_entries,
            "states_covered": len(states),
            "states_list": sorted(list(states)),
            "oldest_entry_age_days": oldest_age_days,
        }
    
    except Exception as e:
        logger.error(f"Failed to fetch cache stats: {e}")
        return {
            "total_entries": 0,
            "states_covered": 0,
            "states_list": [],
            "oldest_entry_age_days": None,
        }
