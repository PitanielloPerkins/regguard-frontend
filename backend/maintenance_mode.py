"""Completed-project maintenance subscriptions — AI-driven sensor alert configuration (Service Bridge)."""
from __future__ import annotations

import json
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from scraper import normalize_us_zip

_STORE_PATH = Path(__file__).resolve().parent / "maintenance_subscriptions.json"
_LOCK = threading.Lock()
_MAX_SUBS = 200


def _read_root() -> Dict[str, Any]:
    if not _STORE_PATH.is_file():
        return {"subscriptions": []}
    try:
        with _STORE_PATH.open("r", encoding="utf-8") as f:
            data = json.load(f)
    except (json.JSONDecodeError, OSError):
        return {"subscriptions": []}
    if not isinstance(data, dict):
        return {"subscriptions": []}
    subs = data.get("subscriptions")
    if not isinstance(subs, list):
        return {"subscriptions": []}
    return {"subscriptions": subs}


def _write_root(root: Dict[str, Any]) -> None:
    _STORE_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _STORE_PATH.open("w", encoding="utf-8") as f:
        json.dump(root, f, ensure_ascii=False, indent=2)


def list_subscriptions() -> List[Dict[str, Any]]:
    with _LOCK:
        root = _read_root()
    out: List[Dict[str, Any]] = []
    for item in root["subscriptions"]:
        if isinstance(item, dict) and item.get("id"):
            out.append(item)
    return out


def create_subscription(
    *,
    project_name: str,
    zip_code: str,
    site_address: str = "",
    sensor_profile: str = "thermal_vibration",
    alert_threshold_note: str = "",
    maintenance_mode_enabled: bool = True,
) -> Dict[str, Any]:
    z = normalize_us_zip(zip_code)
    pn = (project_name or "").strip()
    if not pn:
        raise ValueError("Project name is required.")
    note = (alert_threshold_note or "").strip()
    if len(note) > 4000:
        raise ValueError("Alert threshold note is too long.")
    rec: Dict[str, Any] = {
        "id": uuid.uuid4().hex[:14],
        "project_name": pn,
        "zip": z,
        "site_address": (site_address or "").strip(),
        "sensor_profile": (sensor_profile or "thermal_vibration").strip() or "thermal_vibration",
        "alert_threshold_note": note,
        "maintenance_mode_enabled": bool(maintenance_mode_enabled),
        "ai_evaluation_note": (
            "Reg Guard Maintenance Mode: correlate sensor drift / thermal rise against this ZIP’s archived "
            "Universal Scout electrical-amendment context; surface wear-before-outage alerts when thresholds breach."
        ),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "last_sensor_eval_at": None,
    }
    with _LOCK:
        root = _read_root()
        subs: List[Any] = list(root.get("subscriptions") or [])
        if not isinstance(subs, list):
            subs = []
        subs.append(rec)
        root["subscriptions"] = subs[-_MAX_SUBS:]
        _write_root(root)
    return rec


def set_maintenance_mode(subscription_id: str, enabled: bool) -> Dict[str, Any]:
    sid = (subscription_id or "").strip()
    if not sid:
        raise ValueError("Subscription id is required.")
    with _LOCK:
        root = _read_root()
        subs_raw = root.get("subscriptions")
        if not isinstance(subs_raw, list):
            subs_raw = []
        found: Optional[Dict[str, Any]] = None
        new_list: List[Any] = []
        for item in subs_raw:
            if not isinstance(item, dict):
                continue
            if str(item.get("id")) == sid:
                item = {**item, "maintenance_mode_enabled": bool(enabled)}
                found = item
            new_list.append(item)
        if found is None:
            raise ValueError("Unknown subscription id.")
        root["subscriptions"] = new_list
        _write_root(root)
    return found


def touch_sensor_evaluation(subscription_id: str) -> Dict[str, Any]:
    """Placeholder for future sensor pipeline — updates last eval timestamp."""
    sid = (subscription_id or "").strip()
    if not sid:
        raise ValueError("Subscription id is required.")
    ts = datetime.now(timezone.utc).isoformat()
    with _LOCK:
        root = _read_root()
        subs_raw = root.get("subscriptions")
        if not isinstance(subs_raw, list):
            subs_raw = []
        found: Optional[Dict[str, Any]] = None
        new_list: List[Any] = []
        for item in subs_raw:
            if not isinstance(item, dict):
                continue
            if str(item.get("id")) == sid:
                item = {**item, "last_sensor_eval_at": ts}
                found = item
            new_list.append(item)
        if found is None:
            raise ValueError("Unknown subscription id.")
        root["subscriptions"] = new_list
        _write_root(root)
    return found
