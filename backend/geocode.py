"""
Geocoding: reverse (lat/lon → U.S. ZIP) via BigDataCloud, and forward (U.S. address / ZIP)
via Google Geocoding for **city / county** resolution on the research path.
"""
import json
import os
import re
import urllib.error
import urllib.parse
import urllib.request
from functools import lru_cache
from pathlib import Path
from typing import Any, List, Optional, Tuple

from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")

_RE_ZIP5 = re.compile(r"^(\d{5})")


def _first_us_zip5(postcode: Optional[str]) -> Optional[str]:
    if not postcode:
        return None
    t = str(postcode).strip()
    m = _RE_ZIP5.match(t)
    if m:
        return m.group(1)
    digits = re.sub(r"\D", "", t)
    return digits[:5] if len(digits) >= 5 else None


def _fetch_bigdata_client(lat: float, lon: float) -> dict[str, Any]:
    q = urllib.parse.urlencode(
        {
            "latitude": str(lat),
            "longitude": str(lon),
            "localityLanguage": "en",
        }
    )
    url = f"https://api.bigdatacloud.net/data/reverse-geocode-client?{q}"
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "RegGuard/1.0"},
    )
    with urllib.request.urlopen(req, timeout=12) as resp:
        if resp.status != 200:
            raise ValueError("geocode_http")
        return json.load(resp)


@lru_cache(maxsize=4096)
def lookup_us_zip_for_coordinates(lat: float, lon: float) -> str:
    """
    Return a 5-digit U.S. ZIP for the given WGS-84 coordinates.

    ``lat`` and ``lon`` must be pre-rounded (e.g. 5 decimals) so the cache
    key is stable. Raises ValueError with a user-facing message on failure.
    """
    data = _fetch_bigdata_client(lat, lon)
    code = (data.get("countryCode") or "").strip()
    if code and code != "US":
        raise ValueError(
            "This tool only auto-fills U.S. ZIP codes. That location is outside "
            "the United States — enter a ZIP on your own."
        )
    z = _first_us_zip5(str(data.get("postcode") or "").strip() or None)
    if not z:
        raise ValueError(
            "We could not resolve a 5-digit U.S. ZIP for this position. You can type "
            "your ZIP in the field above."
        )
    return z


def us_zip_from_lat_lon(lat: float, lon: float) -> str:
    """
    Public entry: round coordinates, then return cached 5-digit ZIP.
    Rounding (~1.1m at equator) groups nearby GPS samples into one cache key.
    """
    lat_r = round(float(lat), 5)
    lon_r = round(float(lon), 5)
    try:
        return lookup_us_zip_for_coordinates(lat_r, lon_r)
    except ValueError:
        raise
    except (urllib.error.URLError, TimeoutError, OSError) as e:
        raise ValueError(
            "Network error while looking up your ZIP. Try again or type it in."
        ) from e
    except Exception as e:  # noqa: BLE001 — surface as 400, do not crash the app
        raise ValueError("Could not look up a ZIP for this area. Type your ZIP manually.") from e


def require_google_maps_key() -> str:
    """Server-side key for Google Geocoding (city / county from formatted address or ZIP)."""
    key = (os.environ.get("GOOGLE_MAPS_API_KEY") or "").strip()
    if not key:
        raise ValueError(
            "GOOGLE_MAPS_API_KEY is missing. Set it in .env so addresses can be resolved to city and county."
        )
    return key


def _google_geocode_get(payload: dict[str, Any]) -> dict[str, Any]:
    q = urllib.parse.urlencode(payload, quote_via=urllib.parse.quote)
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{q}"
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "RegGuard/1.0"},
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            if resp.status != 200:
                raise ValueError("Google Geocoding HTTP error.")
            return json.load(resp)
    except urllib.error.HTTPError as e:
        raise ValueError(f"Google Geocoding request failed: {e.code}") from e
    except (urllib.error.URLError, TimeoutError, OSError, json.JSONDecodeError) as e:
        raise ValueError("Could not reach Google Geocoding. Try again.") from e


def google_geocode_us_address(address: str) -> Tuple[List[dict[str, Any]], str]:
    """
    Forward geocode a U.S. postal address string (e.g. Places formatted_address).

    Returns ``(address_components, formatted_address)`` for jurisdiction classification.
    """
    raw = (address or "").strip()
    if not raw:
        raise ValueError("Address is required.")
    key = require_google_maps_key()
    payload = _google_geocode_get(
        {"address": raw, "components": "country:US", "key": key},
    )
    status = (payload.get("status") or "").strip()
    if status != "OK":
        msg = payload.get("error_message") or status or "UNKNOWN"
        raise ValueError(f"Google Geocoding error: {msg}")

    results = payload.get("results") or []
    if not results:
        raise ValueError("Could not resolve that address. Try another selection.")

    top = results[0]
    components = top.get("address_components")
    if not isinstance(components, list):
        raise ValueError("Invalid Geocoding response (no address_components).")

    is_us = any(
        "country" in set(c.get("types") or []) and (c.get("short_name") or "").upper() == "US"
        for c in components
    )
    if not is_us:
        raise ValueError("Only U.S. addresses are supported.")

    formatted = str(top.get("formatted_address") or raw)
    return components, formatted


def google_geocode_us_zip(zip5: str) -> Tuple[List[dict[str, Any]], str]:
    """Geocode a 5-digit U.S. ZIP (centroid / area) for approximate city / county."""
    z = "".join(ch for ch in (zip5 or "") if ch.isdigit())[:5]
    if len(z) != 5:
        raise ValueError("A 5-digit U.S. ZIP is required for ZIP geocoding.")
    key = require_google_maps_key()
    payload = _google_geocode_get(
        {"components": f"country:US|postal_code:{z}", "key": key},
    )
    status = (payload.get("status") or "").strip()
    if status != "OK":
        msg = payload.get("error_message") or status or "UNKNOWN"
        raise ValueError(f"Google Geocoding error: {msg}")

    results = payload.get("results") or []
    if not results:
        raise ValueError("Could not geocode that ZIP code.")

    top = results[0]
    components = top.get("address_components")
    if not isinstance(components, list):
        raise ValueError("Invalid Geocoding response (no address_components).")

    formatted = str(top.get("formatted_address") or f"ZIP {z}")
    return components, formatted
