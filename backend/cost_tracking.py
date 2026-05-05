"""Append-only JSONL log of API / model usage per project key — feeds future admin “API Savings” views."""
from __future__ import annotations

import json
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

_LOG_PATH = Path(__file__).resolve().parent / "api_usage_log.jsonl"
_LOCK = threading.Lock()


def log_api_usage(
    *,
    project_key: str,
    route: str,
    model: str,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    """Record one usage event (thread-safe). Token counts may be null when unavailable."""
    rec: Dict[str, Any] = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "project_key": (project_key or "").strip() or "unknown",
        "route": route,
        "model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "meta": meta if isinstance(meta, dict) else {},
    }
    if input_tokens is not None and output_tokens is not None:
        rec["total_tokens"] = int(input_tokens) + int(output_tokens)
    else:
        rec["total_tokens"] = None
    line = json.dumps(rec, ensure_ascii=False) + "\n"
    with _LOCK:
        _LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with _LOG_PATH.open("a", encoding="utf-8") as f:
            f.write(line)


def read_recent_usage(limit: int = 500) -> List[Dict[str, Any]]:
    """Best-effort tail of the log (for admin tooling)."""
    if limit < 1:
        return []
    if not _LOG_PATH.is_file():
        return []
    with _LOCK:
        try:
            lines = _LOG_PATH.read_text(encoding="utf-8").splitlines()
        except OSError:
            return []
    out: List[Dict[str, Any]] = []
    for line in lines[-limit:]:
        line = line.strip()
        if not line:
            continue
        try:
            out.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return out
