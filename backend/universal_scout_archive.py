"""Last Universal Scout raw payload per ZIP — local hook for BIM cross-reference and offline tools."""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional

from scraper import normalize_us_zip

_ARCHIVE_PATH = Path(__file__).resolve().parent / "universal_scout_archive.json"
_LOCK = threading.Lock()


def save_scout_snapshot(zip5: str, raw: Dict[str, Any]) -> None:
    """Upsert archived scout ``raw`` for a 5-digit ZIP (best-effort, thread-safe)."""
    z = normalize_us_zip(zip5)
    with _LOCK:
        data: Dict[str, Any] = {}
        if _ARCHIVE_PATH.is_file():
            try:
                with _ARCHIVE_PATH.open("r", encoding="utf-8") as f:
                    blob = json.load(f)
                if isinstance(blob, dict):
                    data = blob
            except (json.JSONDecodeError, OSError):
                data = {}
        data[z] = {"updated_at": datetime.now(timezone.utc).isoformat(), "raw": raw}
        with _ARCHIVE_PATH.open("w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def load_scout_snapshot(zip5: str) -> Optional[Dict[str, Any]]:
    """Return the last archived scout dict for this ZIP, or ``None``."""
    z = normalize_us_zip(zip5)
    with _LOCK:
        if not _ARCHIVE_PATH.is_file():
            return None
        try:
            with _ARCHIVE_PATH.open("r", encoding="utf-8") as f:
                blob = json.load(f)
        except (json.JSONDecodeError, OSError):
            return None
    if not isinstance(blob, dict):
        return None
    entry = blob.get(z)
    if not isinstance(entry, dict):
        return None
    raw = entry.get("raw")
    return raw if isinstance(raw, dict) else None
