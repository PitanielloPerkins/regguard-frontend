"""
Reg Guard — model router for API spend control.

- **Reality Capture** (multimodal job-site photo): ``gemini-2.5-flash`` class for spatial / JSON box analysis.
- **Permit scout context** and **community-note** flows: ``gemini-2.5-flash`` class (distilled / fast tier).

Defaults now target the stable Gemini **2.5 Flash** engine block to avoid the 1.5-series 404 lifecycle
lockouts on the ``v1beta`` channel. Model identifiers are bare names (no ``models/`` prefix); the
``google.generativeai`` SDK prepends the ``models/`` segment and targets the ``v1beta`` channel automatically.

Override via env: ``REG_GUARD_GEMINI_SPATIAL``, ``REG_GUARD_GEMINI_FLASH`` (legacy ``GEMINI_VISION_MODEL`` wins
for spatial only when ``REG_GUARD_GEMINI_SPATIAL`` is unset).
"""
from __future__ import annotations

import os
from enum import Enum
from typing import Optional

# Stable default engine block. Any dirty/cached env config pointing at the retired
# 1.5-pro identifier is force-rewritten to this at runtime to dodge v1beta 404 lockouts.
_DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"


def _sanitize_model_string(value: Optional[str], *, default: str = _DEFAULT_GEMINI_MODEL) -> str:
    """
    Runtime interceptor for dirty/cached env configs.

    Trims whitespace and, if the resolved identifier still references the retired
    ``1.5-pro`` model (which 404s on the ``v1beta`` channel), forcibly rewrites it to the
    stable default so a stale environment variable can never break a live request.
    """
    model = (value or "").strip()
    if not model:
        model = default
    if "1.5-pro" in model.lower():
        return default
    return model


class RegGuardRoute(str, Enum):
    """Logical request classes for Gemini selection (non-Gemini work can still log the routed tier)."""

    REALITY_CAPTURE = "reality_capture"
    PERMIT_FEE_SCOUT = "permit_fee_scout"
    COMMUNITY_NOTE = "community_note"


def gemini_spatial_model() -> str:
    """Gemini model for image + spatial JSON (Reality Capture)."""
    spatial_model = (
        os.environ.get("REG_GUARD_GEMINI_SPATIAL")
        or os.environ.get("GEMINI_VISION_MODEL")
        or _DEFAULT_GEMINI_MODEL
    )
    return _sanitize_model_string(spatial_model)


def gemini_flash_model() -> str:
    """Gemini model for lightweight text / retrieval-adjacent routing tier."""
    flash_model = os.environ.get("REG_GUARD_GEMINI_FLASH") or _DEFAULT_GEMINI_MODEL
    return _sanitize_model_string(flash_model)


def resolve_gemini_model(*, has_image: bool = False, route: Optional[RegGuardRoute] = None) -> str:
    """
    Logic gate: any **image** (Reality Capture) → spatial (Pro-class).
    Standard permit-fee scout or community-note tier → Flash-class.
    """
    if has_image or route == RegGuardRoute.REALITY_CAPTURE:
        return gemini_spatial_model()
    if route in (RegGuardRoute.PERMIT_FEE_SCOUT, RegGuardRoute.COMMUNITY_NOTE):
        return gemini_flash_model()
    return gemini_flash_model()


def model_for_reality_capture() -> str:
    return resolve_gemini_model(has_image=True)


def model_for_permit_scout_text() -> str:
    return resolve_gemini_model(route=RegGuardRoute.PERMIT_FEE_SCOUT)


def model_for_community_note_context() -> str:
    return resolve_gemini_model(route=RegGuardRoute.COMMUNITY_NOTE)
