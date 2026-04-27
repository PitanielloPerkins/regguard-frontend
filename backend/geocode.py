"""
Reverse geocoding (lat/lon → U.S. ZIP) via BigDataCloud client API.

@lru_cache deduplicates HTTP calls for the same rounded coordinates in-process
(e.g. user taps "Locate" twice, or the same area is used again).
"""
import json
import re
import urllib.error
import urllib.parse
import urllib.request
from functools import lru_cache
from typing import Any, Optional

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
