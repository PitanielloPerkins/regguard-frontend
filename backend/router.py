"""
Reg Guard — model router for API spend control.

- **Reality Capture** (multimodal job-site photo): ``gemini-1.5-pro`` class for spatial / JSON box analysis.
- **Permit scout context** and **community-note** flows: ``gemini-1.5-flash`` class (distilled / fast tier).

Override via env: ``REG_GUARD_GEMINI_SPATIAL``, ``REG_GUARD_GEMINI_FLASH`` (legacy ``GEMINI_VISION_MODEL`` wins
for spatial only when ``REG_GUARD_GEMINI_SPATIAL`` is unset).
"""
from __future__ import annotations

import os
from enum import Enum
from typing import Optional


class RegGuardRoute(str, Enum):
    """Logical request classes for Gemini selection (non-Gemini work can still log the routed tier)."""

    REALITY_CAPTURE = "reality_capture"
    PERMIT_FEE_SCOUT = "permit_fee_scout"
    COMMUNITY_NOTE = "community_note"


def gemini_spatial_model() -> str:
    """Gemini model for image + spatial JSON (Reality Capture)."""
    ex = (os.environ.get("REG_GUARD_GEMINI_SPATIAL") or "").strip()
    if ex:
        return ex
    legacy = (os.environ.get("GEMINI_VISION_MODEL") or "").strip()
    if legacy:
        return legacy
    return "gemini-1.5-pro"


def gemini_flash_model() -> str:
    """Gemini model for lightweight text / retrieval-adjacent routing tier."""
    return (os.environ.get("REG_GUARD_GEMINI_FLASH") or "gemini-1.5-flash").strip()


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
