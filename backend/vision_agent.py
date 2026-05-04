"""
Reg Guard — Reality Capture Audit: Gemini multimodal analysis of job-site photos vs scout context.

Uses Gemini 1.5 Pro (configurable) with JSON output for observations + normalized bounding boxes.
For Austin, TX + gas meter present: estimates clearance using pixel geometry (meter width heuristic).
"""
from __future__ import annotations

import io
import json
import math
import os
import re
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

from dotenv import load_dotenv
from PIL import Image

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")

from vision import normalize_vision_text

try:
    import google.generativeai as genai  # type: ignore[import-untyped]
except ImportError:
    genai = None  # type: ignore[misc, assignment]


def gemini_configured() -> bool:
    key = (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()
    return bool(key) and genai is not None


def _gemini_api_key() -> str:
    return (os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY") or "").strip()


def _gemini_model_name() -> str:
    return (os.environ.get("GEMINI_VISION_MODEL") or "gemini-1.5-pro").strip()


def _normalize_media_type(content_type: Optional[str], filename: Optional[str]) -> str:
    ct = (content_type or "").split(";")[0].strip().lower()
    if ct in ("image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"):
        if ct == "image/jpg":
            return "image/jpeg"
        return ct
    name = (filename or "").lower()
    if name.endswith((".jpg", ".jpeg")):
        return "image/jpeg"
    if name.endswith(".png"):
        return "image/png"
    if name.endswith(".gif"):
        return "image/gif"
    if name.endswith(".webp"):
        return "image/webp"
    return "image/jpeg"


def scout_summary_for_reality_capture(raw: Dict[str, Any], *, limit_hits: int = 36) -> str:
    """Flatten Universal Scout hits into a short text block for the multimodal prompt."""
    lines: List[str] = []
    n = 0
    for step in ("step_jurisdiction", "step_building_permits", "step_building_codes"):
        block = raw.get(step) or {}
        if not isinstance(block, dict):
            continue
        q = block.get("query")
        if isinstance(q, str) and q.strip():
            lines.append(f"[{step}] query: {q.strip()}")
        for item in block.get("results") or []:
            if n >= limit_hits:
                break
            if not isinstance(item, dict):
                continue
            title = str(item.get("title") or "").strip()
            url = str(item.get("url") or "").strip()
            if title and url:
                lines.append(f"- {title} — {url}")
            elif url:
                lines.append(f"- {url}")
            n += 1
        if n >= limit_hits:
            break
    return "\n".join(lines) if lines else "(No scout hits yet.)"


def _box_to_pixels(box_2d: List[float], width: int, height: int) -> Tuple[float, float, float, float]:
    """Gemini-style normalized box [ymin, xmin, ymax, xmax] on 0–1000 scale → pixel l,t,r,b."""
    if len(box_2d) != 4:
        return 0.0, 0.0, 0.0, 0.0
    ymin, xmin, ymax, xmax = [float(x) for x in box_2d]
    scale_x = width / 1000.0
    scale_y = height / 1000.0
    left = xmin * scale_x
    right = xmax * scale_x
    top = ymin * scale_y
    bottom = ymax * scale_y
    return left, top, right, bottom


def _axis_aligned_rect_edge_distance_px(
    a: Tuple[float, float, float, float],
    b: Tuple[float, float, float, float],
) -> float:
    """Minimum distance between two axis-aligned rectangles (0 if overlapping)."""
    al, at, ar, ab = a
    bl, bt, br, bb = b
    hl = max(al, bl)
    hr = min(ar, br)
    vt = max(at, bt)
    vb = min(ab, bb)
    if hl < hr and vt < vb:
        return 0.0
    dx = 0.0
    if ar < bl:
        dx = bl - ar
    elif br < al:
        dx = al - br
    dy = 0.0
    if ab < bt:
        dy = bt - ab
    elif bb < at:
        dy = at - bb
    return math.hypot(dx, dy)


_GAS_LABEL = re.compile(r"gas.*(meter|valve)|meter.*gas|relief|regulator", re.I)
_ELEC_LABEL = re.compile(
    r"electrical|panel|disconnect|service|meter\s+socket|main|breaker|conduit|weatherhead",
    re.I,
)


def _label_bucket(label: str) -> Optional[str]:
    if _GAS_LABEL.search(label):
        return "gas"
    if _ELEC_LABEL.search(label) and not re.search(r"\bgas\b", label, re.I):
        return "electrical"
    return None


def _austin_clearance_geometry(
    detections: List[Dict[str, Any]],
    width: int,
    height: int,
) -> Dict[str, Any]:
    """
    Austin Design Criteria: ~36 in radial clearance between gas relief/meter zone and electrical equipment.
    Pixel distance + heuristic PPI from assumed residential gas meter width (~11 in).
    """
    gas_rects: List[Tuple[float, float, float, float]] = []
    elec_rects: List[Tuple[float, float, float, float]] = []
    meter_width_px_max = 0.0

    for det in detections:
        label = str(det.get("label") or "")
        raw_box = det.get("box_2d")
        if not isinstance(raw_box, list) or len(raw_box) != 4:
            continue
        try:
            px_box = _box_to_pixels([float(raw_box[i]) for i in range(4)], width, height)
        except (TypeError, ValueError):
            continue
        bucket = _label_bucket(label)
        if bucket == "gas":
            gas_rects.append(px_box)
            gw = px_box[2] - px_box[0]
            gh = px_box[3] - px_box[1]
            meter_width_px_max = max(meter_width_px_max, gw, gh)
        elif bucket == "electrical":
            elec_rects.append(px_box)

    out: Dict[str, Any] = {
        "applies": False,
        "gas_meter_detected": bool(gas_rects),
        "electrical_equipment_detected": bool(elec_rects),
        "edge_distance_px": None,
        "estimated_clearance_inches": None,
        "violates_36_in_rule": None,
        "notes": "",
    }

    if not gas_rects or not elec_rects:
        out["notes"] = (
            "Austin 36-inch clearance check skipped — need both a gas meter/valve detection "
            "and electrical equipment in frame."
        )
        return out

    out["applies"] = True
    best_d = float("inf")
    best_pair: Optional[Tuple[Tuple[float, float, float, float], Tuple[float, float, float, float]]] = None
    for g in gas_rects:
        for e in elec_rects:
            d = _axis_aligned_rect_edge_distance_px(g, e)
            if d < best_d:
                best_d = d
                best_pair = (g, e)

    out["edge_distance_px"] = round(best_d, 2)

    assumed_meter_width_in = 11.0
    if meter_width_px_max <= 1.0:
        out["notes"] = "Gas meter box too small to calibrate scale; inch estimate unreliable."
        out["violates_36_in_rule"] = None
        return out

    ppi = meter_width_px_max / assumed_meter_width_in
    est_in = best_d / ppi if ppi > 0 else None
    out["estimated_clearance_inches"] = round(est_in, 2) if est_in is not None else None

    if est_in is not None:
        out["violates_36_in_rule"] = est_in < 36.0
        out["notes"] = (
            f"Heuristic: ~{est_in:.1f} in separation (edge-to-edge), assuming ~{assumed_meter_width_in:.0f} in "
            f"visible gas-meter span for scale. AHJ field verification required."
        )
    return out


def _strip_json_fence(raw: str) -> str:
    s = (raw or "").strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z0-9]*\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


def _run_gemini_audit_sync(
    image_bytes: bytes,
    content_type: Optional[str],
    filename: Optional[str],
    *,
    scout_summary: str,
    city: str,
    state: str,
    width: int,
    height: int,
) -> Dict[str, Any]:
    if not image_bytes:
        raise ValueError("Empty image data.")
    if len(image_bytes) > 12 * 1024 * 1024:
        raise ValueError("Image too large; max 12MB.")
    if genai is None:
        raise ValueError("google-generativeai is not installed.")
    key = _gemini_api_key()
    if not key:
        raise ValueError("GEMINI_API_KEY or GOOGLE_API_KEY is not set.")

    genai.configure(api_key=key)
    model = genai.GenerativeModel(_gemini_model_name())
    media = _normalize_media_type(content_type, filename)

    locality = ", ".join(p for p in (city.strip(), state.strip()) if p) or "unknown locality"
    austin_note = ""
    if city.strip().lower() == "austin" and state.strip().upper() == "TX":
        austin_note = (
            "LOCAL RULE FOCUS (City of Austin, TX): City Design Criteria require roughly **36 inches** clearance "
            "between **gas relief / meter equipment** and **electrical equipment**. "
            "If both appear in frame, flag likely violations using geometry from your boxes."
        )

    schema_instructions = (
        "Return ONE JSON object only (no markdown). Keys:\n"
        '- "observations": array of 3–8 short strings (neutral facts referencing scout context where relevant).\n'
        '- "detections": array of objects with "label" (string: e.g. Gas Meter, Gas Valve, Electrical Panel, '
        'Ground Rod, Service Disconnect, Meter Socket) and '
        '"box_2d": [ymin, xmin, ymax, xmax] integers 0–1000 relative to image (top-left origin).\n'
        '- "austin_clearance": object with keys '
        '"gas_meter_detected" (bool), "electrical_equipment_detected" (bool), '
        '"violates_36_in_rule" (bool|null), "notes" (string).\n'
        "Draw tight boxes around visible equipment only."
    )

    prompt = (
        "You are assisting a U.S. electrical contractor compliance tool.\n"
        f"Job site locality (geocoded): **{locality}**.\n"
        f"{austin_note}\n\n"
        "Universal Scout results (titles + URLs — codes & permits for this jurisdiction):\n"
        f"{scout_summary}\n\n"
        "Analyze the attached photo against this scout context: equipment, grounding, gas proximity to electrical, "
        "and permit/code relevance. No legal advice.\n"
        + schema_instructions
    )

    image_part = {"mime_type": media, "data": image_bytes}
    resp = model.generate_content(
        [prompt, image_part],
        generation_config=genai.GenerationConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )
    raw_text = ""
    if hasattr(resp, "text") and resp.text:
        raw_text = resp.text
    elif getattr(resp, "candidates", None):
        parts = getattr(resp.candidates[0].content, "parts", None) or []
        raw_text = "".join(getattr(p, "text", "") or "" for p in parts)

    data = json.loads(_strip_json_fence(raw_text))
    if not isinstance(data, dict):
        raise ValueError("Gemini returned non-object JSON.")

    observations = data.get("observations") or []
    obs_lines: List[str] = []
    if isinstance(observations, list):
        for o in observations:
            if isinstance(o, str) and o.strip():
                obs_lines.append(f"• {o.strip()}")
    obs_text = normalize_vision_text("\n".join(obs_lines))

    detections_raw = data.get("detections") or []
    detections: List[Dict[str, Any]] = []
    if isinstance(detections_raw, list):
        for d in detections_raw:
            if not isinstance(d, dict):
                continue
            lab = str(d.get("label") or "").strip()
            box = d.get("box_2d")
            if not lab or not isinstance(box, list) or len(box) != 4:
                continue
            try:
                box_n = [int(round(float(box[i]))) for i in range(4)]
            except (TypeError, ValueError):
                continue
            detections.append({"label": lab, "box_2d": box_n})

    is_austin = city.strip().lower() == "austin" and state.strip().upper() == "TX"
    geo_clearance = _austin_clearance_geometry(detections, width, height) if is_austin else {
        "applies": False,
        "gas_meter_detected": False,
        "electrical_equipment_detected": False,
        "edge_distance_px": None,
        "estimated_clearance_inches": None,
        "violates_36_in_rule": None,
        "notes": "Austin-only radial clearance geometry not evaluated for this locality.",
    }

    model_clearance = data.get("austin_clearance")
    notes_extra = ""
    if isinstance(model_clearance, dict):
        mn = model_clearance.get("notes")
        if isinstance(mn, str) and mn.strip():
            notes_extra = mn.strip()

    merged_notes = geo_clearance.get("notes") or ""
    if notes_extra:
        merged_notes = f"{merged_notes} {notes_extra}".strip()

    violates = geo_clearance.get("violates_36_in_rule")
    clearance_block = {
        **geo_clearance,
        "notes": merged_notes,
        "violates_36_in_rule": violates,
    }

    for det in detections:
        bucket = _label_bucket(det["label"])
        if violates is True:
            det["status"] = "violation" if bucket else "unknown"
        elif violates is False:
            det["status"] = "ok" if bucket else "unknown"
        else:
            det["status"] = "unknown"

    visual_audit = {
        "image_width": width,
        "image_height": height,
        "detections": detections,
        "austin_clearance": clearance_block,
        "model_id": _gemini_model_name(),
    }

    if clearance_block.get("applies") and isinstance(obs_text, str):
        extra = (
            f"\n• **Reality Capture (Austin clearance):** edge distance ≈ {clearance_block.get('edge_distance_px')} px; "
            f"estimated ~{clearance_block.get('estimated_clearance_inches')} in separation (heuristic). "
            f"{'FLAG: under 36 in — verify in field.' if violates is True else ''}"
            f"{'Passes heuristic 36 in spacing.' if violates is False else ''}"
        )
        obs_text = normalize_vision_text(obs_text + extra)

    return {"photo_analysis": obs_text, "visual_audit": visual_audit}


def run_reality_capture_audit(
    image_bytes: bytes,
    content_type: Optional[str],
    filename: Optional[str],
    *,
    scout_summary: str,
    city: str,
    state: str,
) -> Dict[str, Any]:
    """Blocking Gemini multimodal audit; returns photo_analysis + visual_audit dict."""
    img = Image.open(io.BytesIO(image_bytes))
    width, height = img.size
    return _run_gemini_audit_sync(
        image_bytes,
        content_type,
        filename,
        scout_summary=scout_summary,
        city=city,
        state=state,
        width=int(width),
        height=int(height),
    )


def iter_reality_capture_audit_stream(
    image_bytes: bytes,
    content_type: Optional[str],
    filename: Optional[str],
    *,
    scout_summary: str,
    city: str,
    state: str,
    visual_audit_holder: Optional[List[Any]] = None,
) -> Iterator[str]:
    """Yield incremental text fragments (bullet lines) for SSE vision_delta."""
    audit = run_reality_capture_audit(
        image_bytes,
        content_type,
        filename,
        scout_summary=scout_summary,
        city=city,
        state=state,
    )
    if visual_audit_holder is not None:
        visual_audit_holder.append(audit.get("visual_audit"))
    text = audit.get("photo_analysis") or ""
    lines = text.split("\n")
    buf = ""
    for line in lines:
        piece = (line + "\n") if line else "\n"
        buf += piece
        if len(buf) >= 24 or line.startswith("•"):
            yield buf
            buf = ""
    if buf:
        yield buf
