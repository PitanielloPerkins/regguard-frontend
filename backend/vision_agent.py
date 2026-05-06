"""
Reg Guard — Reality Capture Audit: Gemini multimodal analysis of job-site photos vs scout context.

Uses Gemini 1.5 Pro (configurable) with JSON output for observations + normalized bounding boxes.
Scout context is flattened via **multi-tier Universal Regulatory Guardrail** summaries (see ``scout_summary_for_reality_capture``):
jurisdiction → permits → codes, then **residential zoning** (Municode · .gov · OpenGov) or **FAST-41** plus **utility-scale water** tiers by vertical.
**Austin 78704 gas clearance:** pixel geometry runs only when the site ZIP is **78704** and the model labels
include a **gas meter** (see ``_gas_meter_detected_in_detections``).
"""
from __future__ import annotations

import io
import json
import math
import os
import re
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

from cost_tracking import log_api_usage
from dotenv import load_dotenv
from PIL import Image
from router import model_for_reality_capture

from scraper import SCOUT_SOURCE_STEP_KEYS

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")


def _load_township_rules() -> List[Dict[str, Any]]:
    """Local gotcha DB: ``township_rules.json`` (product-seeded quirks; safe to extend)."""
    path = Path(__file__).resolve().parent / "township_rules.json"
    try:
        raw = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return []
    rules = raw.get("rules")
    return [r for r in rules if isinstance(r, dict)] if isinstance(rules, list) else []


def _township_gotcha_block(city: str, state: str, zip5: str) -> str:
    """Lines folded into Reality Capture scout text when locality matches seeded rules."""
    city_n = (city or "").strip().lower()
    state_n = (state or "").strip().upper()
    zip_clean = (zip5 or "").strip()
    lines: List[str] = []
    for rule in _load_township_rules():
        rc = str(rule.get("city") or "").strip().lower()
        rs = str(rule.get("state") or "").strip().upper()
        if rc and rc != city_n:
            continue
        if rs and rs != state_n:
            continue
        prefixes = rule.get("zip_prefixes")
        if isinstance(prefixes, list) and prefixes and zip_clean:
            if not any(zip_clean.startswith(str(p).strip()) for p in prefixes if str(p).strip()):
                continue
        summary = str(rule.get("summary") or "").strip()
        if not summary:
            continue
        rid = str(rule.get("id") or "local").strip()
        lines.append(f"[local_gotcha:{rid}] {summary}")
    if not lines:
        return ""
    return "**Local gotcha DB (seeded quirks — verify with AHJ):**\n" + "\n".join(f"• {x}" for x in lines)


_SCOUT_STEP_HEADINGS: Dict[str, str] = {
    "step_jurisdiction": "Tier 1 — Jurisdiction / AHJ anchor",
    "step_building_permits": "Tier 2 — Permits & plan check",
    "step_building_codes": "Tier 3 — Adopted codes & amendments",
    "step_residential_zoning": "Tier 4a — Residential: setbacks / zoning (Municode · .gov · OpenGov)",
    "step_federal_fast41": "Tier 4b — FAST-41 / Permitting Council (infra · data center)",
    "step_data_center_water": "Tier 5 — Utility-scale water: NPDES / withdrawal / state EQ (infra · data center)",
}


def normalize_vision_text(raw: str) -> str:
    """Normalize concatenated audit text to a stable bullet-oriented shape."""
    out = re.sub(r"[\n\r]{2,}", "\n", (raw or "").strip())
    if not out:
        return "• (No text returned from vision model; try a clearer photo.)"
    return out

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
    """Backward-compatible alias — Reality Capture uses the spatial (Pro-class) router."""
    return model_for_reality_capture()


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
    """Flatten **multi-tier** Universal Scout hits + local gotcha DB into a Reality Capture prompt block."""
    ju = raw.get("jurisdiction") if isinstance(raw.get("jurisdiction"), dict) else {}
    city_g = str(ju.get("city") or "").strip()
    state_g = str(ju.get("state") or ju.get("state_short") or "").strip()
    zip_g = str(raw.get("zip") or "").strip()
    lines: List[str] = [
        "**Universal Regulatory Guardrail — multi-tier scout context (trusted SERP only):**",
        "Use residential zoning hits for lot-line / setback narratives when the project vertical is building; "
        "use FAST-41 + utility-water hits for federal/state environmental coupling when vertical is infrastructure or data center.",
    ]
    n = 0
    for step in SCOUT_SOURCE_STEP_KEYS:
        if step not in raw:
            continue
        block = raw.get(step) or {}
        if not isinstance(block, dict):
            continue
        tier = _SCOUT_STEP_HEADINGS.get(step, step)
        lines.append(f"### {tier}")
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
    if n == 0:
        lines.append("(No trusted scout hits yet — verify API keys and locality.)")
    body = "\n".join(lines)
    got = _township_gotcha_block(city_g, state_g, zip_g)
    if got:
        return f"{body}\n\n{got}"
    return body


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
_GAS_METER_LABEL = re.compile(
    r"(gas\s*meter|meter.*\bgas\b|natural\s+gas\s*meter|gas\s+service\s+meter)",
    re.I,
)
_ELEC_LABEL = re.compile(
    r"electrical|panel|disconnect|service|meter\s+socket|main|breaker|conduit|weatherhead",
    re.I,
)


def _gas_meter_detected_in_detections(detections: List[Dict[str, Any]]) -> bool:
    """True when vision labels include an explicit gas *meter* (not valve-only)."""
    for det in detections:
        lab = str(det.get("label") or "")
        if _GAS_METER_LABEL.search(lab):
            return True
    return False


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
    Austin Design Criteria (78704 program path): ~36 in clearance gas meter zone vs electrical equipment.
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
            "Austin 78704 — 36-inch gas clearance check skipped — need both a gas meter detection "
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
            f"Austin 78704 — heuristic ~{est_in:.1f} in separation (edge-to-edge), assuming ~{assumed_meter_width_in:.0f} in "
            f"visible gas-meter span for scale. AHJ field verification required."
        )
    return out


def _strip_json_fence(raw: str) -> str:
    s = (raw or "").strip()
    if s.startswith("```"):
        s = re.sub(r"^```[a-zA-Z0-9]*\s*", "", s)
        s = re.sub(r"\s*```$", "", s)
    return s.strip()


def _extract_gemini_usage(resp: Any) -> Tuple[Optional[int], Optional[int]]:
    um = getattr(resp, "usage_metadata", None)
    if um is None:
        return None, None
    inp = getattr(um, "prompt_token_count", None)
    out = getattr(um, "candidates_token_count", None)
    try:
        inp_i = int(inp) if inp is not None else None
    except (TypeError, ValueError):
        inp_i = None
    try:
        out_i = int(out) if out is not None else None
    except (TypeError, ValueError):
        out_i = None
    return inp_i, out_i


# Gemini-style list pricing for Reality Capture (input / output per token).
_GEMINI_USD_PER_INPUT_TOKEN = 0.000000075
_GEMINI_USD_PER_OUTPUT_TOKEN = 0.0000003


def gemini_search_cost_usd(
    input_tokens: Optional[int],
    output_tokens: Optional[int],
) -> Optional[float]:
    """
    Estimated USD for one multimodal audit call:
    (input_tokens × 0.000000075) + (output_tokens × 0.0000003).
    """
    if input_tokens is None and output_tokens is None:
        return None
    inp = float(input_tokens or 0)
    out = float(output_tokens or 0)
    return round(inp * _GEMINI_USD_PER_INPUT_TOKEN + out * _GEMINI_USD_PER_OUTPUT_TOKEN, 8)


def _austin_78704_clearance_skip_notes(zip5: str, detections: List[Dict[str, Any]]) -> str:
    z = (zip5 or "").strip()
    if z != "78704":
        return (
            "Austin 78704 — 36-inch gas-meter radial clearance geometry runs only when the job-site ZIP is **78704**."
        )
    if not _gas_meter_detected_in_detections(detections):
        return (
            "ZIP 78704 — gas-meter 36-inch clearance check skipped because no **gas meter** was detected in vision labels "
            "(valve-only labels do not trigger this path)."
        )
    return ""


def _run_gemini_audit_sync(
    image_bytes: bytes,
    content_type: Optional[str],
    filename: Optional[str],
    *,
    scout_summary: str,
    city: str,
    state: str,
    zip5: str,
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

    spatial_model = model_for_reality_capture()
    genai.configure(api_key=key)
    model = genai.GenerativeModel(spatial_model)
    media = _normalize_media_type(content_type, filename)

    zip_clean = (zip5 or "").strip()
    locality_bits = [p for p in (city.strip(), state.strip()) if p]
    if zip_clean:
        locality_bits.append(f"ZIP {zip_clean}")
    locality = ", ".join(locality_bits) or "unknown locality"
    austin_note = ""
    if zip_clean == "78704":
        austin_note = (
            "LOCAL RULE FOCUS — **Austin ZIP 78704**: City Design Criteria include **36-inch** clearance between "
            "**gas meter / relief** equipment and **electrical equipment**. "
            "Label any visible **gas meter** clearly and box electrical gear tightly—geometry may be verified server-side."
        )
    elif city.strip().lower() == "austin" and state.strip().upper() == "TX":
        austin_note = (
            "Site is Austin, TX — note adopted codes / Design Criteria from scout context; "
            "**78704-only** automated gas-meter clearance geometry applies elsewhere."
        )

    schema_instructions = (
        "Return ONE JSON object only (no markdown). Keys:\n"
        '- "observations": array of 3–8 short strings (neutral facts referencing scout URLs / code signals where '
        "relevant — treat those as your legal-style citations).\n"
        '- "bottom_line": string — **The Bottom Line**: after those grounded observations, write **exactly two sentences** '
        "in plain English for a field electrician (e.g. whether a permit pathway or inspection hook is implied, and what "
        "an AHJ inspector is likely to look for). No markdown, no numbering, two sentences only.\n"
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
        "**Universal Regulatory Guardrail** — the block below is **multi-tier**: "
        "jurisdiction → permits → codes, then either **residential zoning/setbacks** (Municode · government · OpenGov) "
        "or **FAST-41** plus **utility-scale water / NPDES** signals depending on project vertical. "
        "Reference only what the tiers support; flag when field measurements (e.g. setbacks) cannot be confirmed from a photo.\n"
        "Scout results (titles + URLs — your citation layer):\n"
        f"{scout_summary}\n\n"
        "Analyze the attached photo against this scout context: equipment, grounding, gas proximity to electrical, "
        "and permit/code relevance. No legal advice.\n"
        "Order of reasoning: first ground your `observations` in the scout URLs and code signals above; then set "
        "`bottom_line` to **The Bottom Line** — exactly two plain-English sentences summarizing what matters for permits "
        "and inspections on this job.\n"
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
    in_tok, out_tok = _extract_gemini_usage(resp)
    cost_usd = gemini_search_cost_usd(in_tok, out_tok)
    usage_meta: Dict[str, Any] = {"phase": "gemini_multimodal_audit"}
    if cost_usd is not None:
        usage_meta["cost_usd"] = cost_usd
    log_api_usage(
        project_key=zip_clean or "unknown",
        route="reality_capture",
        model=spatial_model,
        input_tokens=in_tok,
        output_tokens=out_tok,
        meta=usage_meta,
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

    bottom_raw = data.get("bottom_line")
    bottom_line = str(bottom_raw).strip() if isinstance(bottom_raw, str) else ""

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

    run_78704_gas_geometry = zip_clean == "78704" and _gas_meter_detected_in_detections(detections)
    strict_meter = _gas_meter_detected_in_detections(detections)
    elec_label_seen = any(
        _label_bucket(str(d.get("label") or "")) == "electrical" for d in detections
    )
    if run_78704_gas_geometry:
        geo_clearance = _austin_clearance_geometry(detections, width, height)
    else:
        geo_clearance = {
            "applies": False,
            "gas_meter_detected": strict_meter,
            "electrical_equipment_detected": elec_label_seen,
            "edge_distance_px": None,
            "estimated_clearance_inches": None,
            "violates_36_in_rule": None,
            "notes": _austin_78704_clearance_skip_notes(zip_clean, detections),
        }
    geo_clearance["trigger_zip"] = "78704" if zip_clean == "78704" else None
    geo_clearance["gas_meter_detected_for_trigger"] = strict_meter

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
        if violates is True and bucket in ("gas", "electrical"):
            det["status"] = "violation"
        elif violates is False and bucket in ("gas", "electrical"):
            det["status"] = "ok"
        elif bucket in ("gas", "electrical"):
            det["status"] = "unknown"
        else:
            det["status"] = "ok"

    visual_audit: Dict[str, Any] = {
        "image_width": width,
        "image_height": height,
        "detections": detections,
        "austin_clearance": clearance_block,
        "model_id": spatial_model,
        "bottom_line": bottom_line or None,
        "cost_usd": cost_usd,
        "input_tokens": in_tok,
        "output_tokens": out_tok,
    }

    if clearance_block.get("applies") and isinstance(obs_text, str):
        extra = (
            f"\n• **Reality Capture (Austin 78704 gas clearance):** edge distance ≈ {clearance_block.get('edge_distance_px')} px; "
            f"estimated ~{clearance_block.get('estimated_clearance_inches')} in separation (heuristic). "
            f"{'FLAG: under 36 in — verify in field.' if violates is True else ''}"
            f"{'Passes heuristic 36 in spacing.' if violates is False else ''}"
        )
        obs_text = normalize_vision_text(obs_text + extra)

    return {
        "photo_analysis": obs_text,
        "visual_audit": visual_audit,
        "cost_usd": cost_usd,
        "bottom_line": bottom_line or None,
        "input_tokens": in_tok,
        "output_tokens": out_tok,
    }


def run_reality_capture_audit(
    image_bytes: bytes,
    content_type: Optional[str],
    filename: Optional[str],
    *,
    scout_summary: str,
    city: str,
    state: str,
    zip5: str,
) -> Dict[str, Any]:
    """Blocking Gemini multimodal audit; returns ``photo_analysis``, ``visual_audit`` (incl. ``bottom_line``, ``cost_usd``), and top-level token/cost mirrors."""
    img = Image.open(io.BytesIO(image_bytes))
    width, height = img.size
    return _run_gemini_audit_sync(
        image_bytes,
        content_type,
        filename,
        scout_summary=scout_summary,
        city=city,
        state=state,
        zip5=zip5,
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
    zip5: str,
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
        zip5=zip5,
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
