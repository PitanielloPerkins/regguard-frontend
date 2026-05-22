"""
Vercel serverless entry for the Reg Guard monorepo.

Imports the FastAPI application from ``backend/main.py`` and exposes it under the
``/api`` prefix so ``vercel.json`` rewrites (``/api/*`` → this handler) align with
backend route paths (e.g. ``POST /api/research`` → ``main.app`` route ``/research``).
"""
from __future__ import annotations

import sys
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_BACKEND = _ROOT / "backend"
if str(_BACKEND) not in sys.path:
    sys.path.insert(0, str(_BACKEND))

from fastapi import FastAPI

from main import app as backend_app  # noqa: E402

app = FastAPI(title="Reg Guard API (Vercel)")
app.mount("/api", backend_app)
