"""Append-only JSONL log of API / model usage per project key — feeds future admin “API Savings” views."""
from __future__ import annotations

import json
import os
import sys
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

_LOCK = threading.Lock()
_LOCAL_LOG_PATH = Path(__file__).resolve().parent / "api_usage_log.jsonl"
_VERCEL_EPHEMERAL_LOG_PATH = Path("/tmp/api_usage_log.jsonl")


def _running_on_vercel() -> bool:
    return bool(
        os.environ.get("VERCEL")
        or os.environ.get("VERCEL_ENV")
        or os.environ.get("AWS_LAMBDA_FUNCTION_NAME")
    )


def _usage_log_path() -> Path:
    """Vercel/serverless filesystem is read-only except ``/tmp``."""
    if _running_on_vercel():
        return _VERCEL_EPHEMERAL_LOG_PATH
    return _LOCAL_LOG_PATH


def _append_usage_line(line: str) -> None:
    path = _usage_log_path()
    try:
        with _LOCK:
            path.parent.mkdir(parents=True, exist_ok=True)
            with path.open("a", encoding="utf-8") as f:
                f.write(line)
    except Exception as ex:
        # Errno 30 (EROFS) and similar must not crash the ASGI pipeline at stream end.
        msg = f"api_usage_log write skipped ({ex!s}): {line.rstrip()}"
        print(msg, flush=True)
        sys.stdout.flush()


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
    _append_usage_line(line)


def read_recent_usage(limit: int = 500) -> List[Dict[str, Any]]:
    """Best-effort tail of the log (for admin tooling)."""
    if limit < 1:
        return []
    path = _usage_log_path()
    if not path.is_file():
        return []
    with _LOCK:
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
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
