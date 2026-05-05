"""
Reg Guard — BIM & Service Bridge hook: ingest Revit-style JSON, cross-reference archived Universal Scout, and
flag **Clash Zones** where electrical conduit routes encroach on Austin **36-inch** gas-relief / meter clearance.
"""
from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Optional, Set, Tuple

from scraper import normalize_us_zip, url_matches_trust_policy
from universal_scout_archive import load_scout_snapshot

# City of Austin Design Criteria — gas relief / meter clearance (Reg Guard product sync with digest).
AUSTIN_MIN_GAS_CLEARANCE_IN = 36.0

Point3 = Tuple[float, float, float]
Segment3 = Tuple[Point3, Point3]


def _unit_scale_to_inches(units: str) -> float:
    u = (units or "ft").strip().lower()
    if u in ("in", "inch", "inches"):
        return 1.0
    if u in ("ft", "feet", "foot"):
        return 12.0
    if u in ("m", "meter", "meters", "metre", "metres"):
        return 39.3700787
    return 12.0


def _as_float3(v: Any) -> Optional[Point3]:
    if not isinstance(v, list) or len(v) < 3:
        return None
    try:
        return (float(v[0]), float(v[1]), float(v[2]))
    except (TypeError, ValueError):
        return None


def _distance_point_segment_3d(p: Point3, a: Point3, b: Point3) -> float:
    ab = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    ap = (p[0] - a[0], p[1] - a[1], p[2] - a[2])
    ab2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2
    if ab2 < 1e-18:
        dx, dy, dz = p[0] - a[0], p[1] - a[1], p[2] - a[2]
        return math.sqrt(dx * dx + dy * dy + dz * dz)
    t = max(0.0, min(1.0, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / ab2))
    cx = a[0] + t * ab[0]
    cy = a[1] + t * ab[1]
    cz = a[2] + t * ab[2]
    dx, dy, dz = p[0] - cx, p[1] - cy, p[2] - cz
    return math.sqrt(dx * dx + dy * dy + dz * dz)


def _is_gas_mep_element(el: Dict[str, Any]) -> bool:
    cat = str(el.get("category") or "").lower()
    fam = str(el.get("family") or el.get("type_name") or el.get("type") or "").lower()
    sys_n = str(el.get("system") or el.get("mep_system") or el.get("system_type") or "").lower()
    if "gas" in sys_n or "gas" in fam:
        return True
    if "gas" in cat:
        return True
    if "meter" in fam and ("gas" in fam or "mechanical" in cat):
        return True
    if "relief" in fam and "gas" in fam:
        return True
    return False


def _is_conduit_like_element(el: Dict[str, Any]) -> bool:
    cat = str(el.get("category") or "").lower()
    fam = str(el.get("family") or el.get("type_name") or el.get("type") or "").lower()
    if "conduit" in cat or "cable tray" in cat or "cabletray" in cat.replace(" ", ""):
        return True
    if "electrical" in cat and any(x in fam for x in ("conduit", "emt", "pvc", "rigid", "imc")):
        return True
    return False


def _conduit_segments_inches(el: Dict[str, Any], scale: float) -> List[Segment3]:
    out: List[Segment3] = []
    curve = el.get("curve") or el.get("line") or el.get("location_curve")
    if isinstance(curve, dict):
        s = _as_float3(curve.get("start") or curve.get("p0") or curve.get("pt0"))
        e = _as_float3(curve.get("end") or curve.get("p1") or curve.get("pt1"))
        if s and e:
            out.append(
                (
                    (s[0] * scale, s[1] * scale, s[2] * scale),
                    (e[0] * scale, e[1] * scale, e[2] * scale),
                )
            )
    if not out:
        loc = _as_float3(el.get("location"))
        if loc:
            p = (loc[0] * scale, loc[1] * scale, loc[2] * scale)
            out.append((p, p))
    return out


def _gas_reference_points_inches(el: Dict[str, Any], scale: float) -> List[Point3]:
    pts: List[Point3] = []
    loc = _as_float3(el.get("location"))
    if loc:
        pts.append((loc[0] * scale, loc[1] * scale, loc[2] * scale))
    bbox = el.get("bbox") or el.get("bounding_box") or el.get("boundingBox")
    if isinstance(bbox, dict):
        mn = _as_float3(bbox.get("min") or bbox.get("sw"))
        mx = _as_float3(bbox.get("max") or bbox.get("ne"))
        if mn and mx:
            c = (
                (mn[0] + mx[0]) * 0.5 * scale,
                (mn[1] + mx[1]) * 0.5 * scale,
                (mn[2] + mx[2]) * 0.5 * scale,
            )
            pts.append(c)
    return pts


def detect_austin_conduit_gas_clashes(
    elements: List[Dict[str, Any]],
    scale_to_inches: float,
    required_clearance_in: float,
) -> List[Dict[str, Any]]:
    """
    Heuristic clash sweep: min distance from each gas reference point to each conduit segment.
    Distances are in **inches** after ``scale_to_inches`` is applied to model coordinates.
    """
    conduits: List[Tuple[str, List[Segment3]]] = []
    gas: List[Tuple[str, List[Point3]]] = []
    for el in elements:
        if not isinstance(el, dict):
            continue
        eid = str(el.get("id") or el.get("unique_id") or el.get("element_id") or "").strip() or "unknown"
        if _is_conduit_like_element(el):
            segs = _conduit_segments_inches(el, scale_to_inches)
            if segs:
                conduits.append((eid, segs))
        if _is_gas_mep_element(el):
            pts = _gas_reference_points_inches(el, scale_to_inches)
            if pts:
                gas.append((eid, pts))

    clashes: List[Dict[str, Any]] = []
    seen: Set[Tuple[str, str, int, int]] = set()
    for gid, gpts in gas:
        for cid, segs in conduits:
            for si, (a, b) in enumerate(segs):
                for pi, p in enumerate(gpts):
                    key = (gid, cid, si, pi)
                    if key in seen:
                        continue
                    seen.add(key)
                    d = _distance_point_segment_3d(p, a, b)
                    if d + 1e-6 < required_clearance_in:
                        clashes.append(
                            {
                                "id": f"clash-{gid}-{cid}-{si}-{pi}",
                                "rule": "Austin Design Criteria — ~36 in gas relief / meter separation (model check)",
                                "clearance_required_in": round(required_clearance_in, 2),
                                "clearance_modeled_in": round(d, 3),
                                "conduit_element_id": cid,
                                "gas_element_id": gid,
                                "severity": "clash_zone",
                                "note": "Reg Guard auto-route / clash flag — field-verify before rerouting conduit.",
                            }
                        )
    return clashes


_RE_DESIGN_CRITERIA = re.compile(r"design\s+criteria|electrical\s+service|787|gas|relief", re.I)


def cross_reference_universal_scout(
    scout_raw: Optional[Dict[str, Any]],
    zip5: str,
    bim_categories: Set[str],
) -> Dict[str, Any]:
    """Match archived **Universal Scout** URLs to BIM context (electrical / Austin Design Criteria signals)."""
    if not scout_raw:
        return {
            "archive_hit": False,
            "zip": zip5,
            "message": "No archived Universal Scout payload for this ZIP — run compliance research once to seed the local bridge.",
            "trusted_hits": [],
            "bim_categories": sorted(c for c in bim_categories if c),
        }

    trusted: List[Dict[str, Any]] = []
    for step_key in ("step_jurisdiction", "step_building_permits", "step_building_codes", "step_federal_fast41"):
        block = scout_raw.get(step_key)
        if not isinstance(block, dict):
            continue
        q = str(block.get("query") or "")
        for item in (block.get("results") or [])[:8]:
            if not isinstance(item, dict):
                continue
            url = item.get("url")
            title = str(item.get("title") or "")
            if not url or not isinstance(url, str):
                continue
            if not url_matches_trust_policy(url):
                continue
            design_signal = bool(_RE_DESIGN_CRITERIA.search(f"{title} {url}"))
            trusted.append(
                {
                    "step": step_key,
                    "title": title or url,
                    "url": url,
                    "bim_relevance": (
                        "austin_mep_clearance_hint"
                        if design_signal
                        else "general_ahj_electrical"
                    ),
                    "scout_query_line": q[:240] if q else None,
                }
            )

    return {
        "archive_hit": True,
        "zip": zip5,
        "trusted_hits": trusted[:24],
        "bim_categories": sorted(c for c in bim_categories if c),
    }


def _austin_clearance_applies(zip5: str, project: Dict[str, Any], scout_raw: Optional[Dict[str, Any]]) -> bool:
    if len(zip5) == 5 and zip5.startswith("787"):
        return True
    city = str(project.get("city") or "").strip().lower()
    st = str(project.get("state") or "").strip().upper()
    if city == "austin" and st == "TX":
        return True
    ju = scout_raw.get("jurisdiction") if scout_raw else None
    if isinstance(ju, dict):
        jc = str(ju.get("city") or "").strip().lower()
        js = str(ju.get("state") or ju.get("state_short") or "").strip().upper()
        if jc == "austin" and js == "TX":
            return True
    return False


def run_bim_sync_bridge(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Entrypoint for ``POST /bim/import`` — accepts a flexible Revit-style JSON export.

    Expected shape (all keys optional except ZIP + elements):

    - ``zip`` or ``project.zip`` — 5-digit U.S. ZIP
    - ``project`` — ``{ name, city, state, zip, units }``
    - ``elements`` — list of dicts with ``id``, ``category``, ``family`` / ``type``, ``location`` or ``curve`` / ``bbox``
    - ``scout_raw`` — optional override of archived Universal Scout dict
    """
    if not isinstance(payload, dict):
        raise ValueError("Payload must be a JSON object.")
    project = payload.get("project")
    project = project if isinstance(project, dict) else {}
    zip_raw = str(payload.get("zip") or project.get("zip") or "").strip()
    if not zip_raw:
        raise ValueError("ZIP is required (`zip` or `project.zip`).")
    z = normalize_us_zip(zip_raw)

    elements = payload.get("elements")
    if elements is None and isinstance(payload.get("revit"), dict):
        elements = payload["revit"].get("elements")  # type: ignore[union-attr]
    if not isinstance(elements, list):
        raise ValueError("`elements` must be a non-empty Revit-style array.")
    norm_els: List[Dict[str, Any]] = [e for e in elements if isinstance(e, dict)]

    units = str(payload.get("units") or project.get("units") or "ft")
    scale = _unit_scale_to_inches(units)

    scout_override = payload.get("scout_raw")
    if scout_override is not None and not isinstance(scout_override, dict):
        scout_override = None
    scout_raw: Optional[Dict[str, Any]] = scout_override or load_scout_snapshot(z)

    categories = {str(e.get("category") or "") for e in norm_els}
    cross = cross_reference_universal_scout(scout_raw, z, categories)
    cross["conduit_like_present"] = any(_is_conduit_like_element(e) for e in norm_els)
    cross["gas_like_present"] = any(_is_gas_mep_element(e) for e in norm_els)
    austin = _austin_clearance_applies(z, project, scout_raw)
    clash_zones = (
        detect_austin_conduit_gas_clashes(norm_els, scale, AUSTIN_MIN_GAS_CLEARANCE_IN) if austin else []
    )

    return {
        "ok": True,
        "schema": "regguard.bim_bridge.v1",
        "zip": z,
        "austin_gas_clearance_evaluated": austin,
        "clearance_required_inches": AUSTIN_MIN_GAS_CLEARANCE_IN if austin else None,
        "geometry_units": units,
        "geometry_normalized_to_inches_factor": scale,
        "element_count": len(norm_els),
        "clash_zones": clash_zones,
        "scout_cross_reference": cross,
    }
