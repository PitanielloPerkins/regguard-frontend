"""
Reg Guard — FastAPI application entry point.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
import sys
import time
import threading
import uuid
from pathlib import Path
from queue import Queue
from typing import Any, Dict, Iterator, List, Optional, Tuple, cast

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from geocode import google_reverse_geocode_us_latlng, us_zip_from_lat_lon
from jurisdiction import JurisdictionProfile, geocode_profile_from_address
# Firecrawl Universal Scout (/v2/search, tight caps) — see ``scraper.py``.
from scraper import clear_scout_run_caches, iter_universal_scout, normalize_us_zip
from vision import iter_job_site_image_text_stream, normalize_vision_text

_BACKEND_DIR = Path(__file__).resolve().parent
_BACKEND_BOOT_ID = uuid.uuid4().hex[:10]

# Temporarily off: very fast heartbeats were suspected of flooding the stream.
_SSE_HEARTBEATS_ENABLED = False
# Used only when _SSE_HEARTBEATS_ENABLED is True.
_STREAM_HEARTBEAT_SEC = 2.0

_ORIGIN_RE = re.compile(r"^https?://(127\.0\.0\.1|localhost)(:\d+)?$")

_RESEARCH_STALL_FIRECRAWL_MESSAGE = (
    "Research stalled. Check Firecrawl usage at firecrawl.dev/app"
)

logger = logging.getLogger("reg_guard")

# Claude memo — Markdown Contractor Action Plan (see /research summary streaming).
# Must stay aligned with ``inspector_digest_directive`` in ``research_memo.build_research_digest``.
_CONTRACTOR_ACTION_PLAN_SYSTEM = """You are Reg Guard's **Senior Electrical Inspector** persona: write for a **licensed contractor crew** as a **field punch list**, not a homeowner narrative or loose summary.

The JSON user message includes ``inspector_digest_directive``: follow its **logic_steps** (extraction from scout hits and ``tagged_priority_hits``, synthesis vs. ``enhanced_job_context``, checklist-only output). Prioritize titles/URLs that signal **Plano, TX**, **NEC / NFPA 70 / 2023**, and **permit fees** (including **2026** / **$85** when those strings appear in the digest).

Output ONLY Markdown. Opening title:

## Contractor Action Plan — Panel / service work (inspector punch list)

Then use **exactly** these headings in order (each section uses **only** ``- [ ]`` task lines after an optional single line of context):

### Permit & Fees
- Checkbox items for AHJ permit type, applicant-of-record (**licensed electrical contractor** where applicable), online vs. counter, and **fee schedule verification**.
- When the digest or ``tagged_priority_hits`` references **2026** and/or **$85**, call that out explicitly and reconcile with any older figures (e.g. **$45**) using **verify on official city portal** language—never assert a fee as final without a checklist step to confirm.
- For **Plano, TX** when indicated by site/jurisdiction/tags, anchor tasks to City of Plano permit/electrical workflows found in the digest.

### NEC Technicals (AFCI/GFCI/Grounding)
Use **2023 NEC** professional knowledge plus digest hints. Checkbox tasks must touch, where applicable to the job (e.g. panel install / service upgrade / relocated circuits): **210.8 GFCI**, **210.12 AFCI**, **Article 250** grounding and bonding at the service, **110.26** working space. Phrase unknowns as verification tasks, not fake citations.

### Inspection Prep
Service / final style checks: labeling / circuit directory, torque marks or spec compliance, grounding electrode accessibility and depth/driven length per **250.53(G)** where rod electrodes apply, bond integrity—what a **Plano** (or stated AHJ) inspector is likely to ask if the digest suggests that jurisdiction.

### Reference Links
List each URL from ``unique_source_urls`` once (markdown link when title known from scout hits, else bare URL). No fabricated URLs.

Rules:
- Imperative, neutral tone. **No long prose blocks**—checklists dominate.
- Do not invent ordinance text, PDFs, or inspection handbooks not supported by the digest; use ``- [ ]`` to **fetch/confirm** on the official site.
- You may cite standard **2023 NEC** articles from professional knowledge; note AHJ may adopt with **amendments**—add a checkbox to confirm adopted edition.
"""


def compute_backend_source_fingerprint() -> str:
    """Short hash of backend ``.py`` mtimes — changes when sources change on disk."""
    h = hashlib.sha256()
    try:
        paths = sorted(_BACKEND_DIR.rglob("*.py"))
    except OSError:
        return "unknown"
    for p in paths:
        if "__pycache__" in p.parts:
            continue
        try:
            rel = p.relative_to(_BACKEND_DIR).as_posix()
            h.update(rel.encode("utf-8", errors="replace"))
            h.update(str(p.stat().st_mtime_ns).encode("ascii", errors="ignore"))
        except OSError:
            continue
    return h.hexdigest()[:16]


app = FastAPI(
    title="Reg Guard",
    description="Agentic Compliance Assistant for Contractors",
)


@app.on_event("startup")
async def _log_firecrawl_key_prefix() -> None:
    k = os.getenv("FIRECRAWL_API_KEY") or ""
    prefix = k[:5] if k else "(not set)"
    print(f"Using Firecrawl Key: {prefix}...")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
    ],
    allow_origin_regex=r"https?://(127\.0\.0\.1|localhost)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=[
        "Content-Type",
        "Cache-Control",
        "Connection",
        "Transfer-Encoding",
        "X-Accel-Buffering",
    ],
)


def _research_sse_cors_headers(request: Request) -> Dict[str, str]:
    """Explicit CORS for the streaming body (middleware also applies; this duplicates Allow-Origin)."""
    origin = (request.headers.get("origin") or "").strip()
    allow = origin if origin and _ORIGIN_RE.match(origin) else "http://127.0.0.1:5173"
    return {
        "Access-Control-Allow-Origin": allow,
        "Access-Control-Allow-Credentials": "true",
    }


def _build_enhanced_query(job_description: str, photo_analysis: Optional[str]) -> str:
    """Single research context string: voice (job) + optional Claude 3.5 Sonnet vision (photo)."""
    parts: list[str] = []
    jd = (job_description or "").strip()
    if jd:
        parts.append(f"[Job description (voice or typed)]\n{jd}")
    if photo_analysis and photo_analysis.strip():
        parts.append(f"[Job-site photo — Claude 3.5 Sonnet vision analysis]\n{photo_analysis.strip()}")
    if not parts:
        return "— (no job description or image provided; ZIP-only research)"
    return "\n\n".join(parts)


def _parse_search_limit(v: int) -> int:
    v = int(v)
    if v < 1 or v > 20:
        raise ValueError("search_limit must be between 1 and 20")
    return v


def _digest_suggests_plano_tx(raw: Dict[str, Any], enhanced_query: str) -> bool:
    """Heuristic: digest or job text points at Plano, Texas."""
    parts: List[str] = []
    site = str(raw.get("site_address") or "")
    parts.append(site)
    parts.append(str(raw.get("zip") or ""))
    ju = raw.get("jurisdiction")
    if isinstance(ju, dict):
        for k in ("city", "label", "formatted_address", "county"):
            v = ju.get(k)
            if v is not None:
                parts.append(str(v))
    blob = " ".join(parts).lower()
    q = (enhanced_query or "").lower()
    if "plano" not in blob and "plano" not in q:
        return False
    texas_hint = (
        " texas" in blob
        or ", tx" in blob
        or " tx " in blob
        or " tx," in blob
        or blob.endswith(" tx")
        or "texas" in blob
        or " texas" in q
        or "texas" in q
        or " tx " in q
    )
    return texas_hint or bool(re.search(r"\b75\d{3}\b", str(raw.get("zip") or "")))


def _collect_source_urls(raw: Dict[str, Any]) -> List[str]:
    seen: set[str] = set()
    ordered: List[str] = []
    for step in (
        "step_jurisdiction",
        "step_building_permits",
        "step_building_codes",
    ):
        block = raw.get(step) or {}
        for item in block.get("results") or []:
            u = item.get("url")
            if u and u not in seen:
                seen.add(u)
                ordered.append(u)
    return ordered


def _research_action_plan_fallback_markdown(
    raw: Dict[str, Any],
    source_urls: List[str],
    enhanced_query: str,
) -> str:
    """Deterministic Markdown memo when ANTHROPIC_API_KEY is unavailable."""
    zip_str = str(raw.get("zip") or "")
    site = (raw.get("site_address") or "").strip()
    ju = raw.get("jurisdiction")
    ju_line = ""
    if isinstance(ju, dict):
        lab = ju.get("label")
        if isinstance(lab, str) and lab.strip():
            ju_line = lab.strip()

    head = (
        f"Research context: **{site}** (US ZIP **{zip_str}**)."
        if site
        else f"Research context: US ZIP **{zip_str}**."
    )
    has_ctx = (enhanced_query or "").strip() and not enhanced_query.strip().startswith("— (no")
    in_plano = _digest_suggests_plano_tx(raw, enhanced_query)

    permit_scope = (
        "Pull an **electrical / building permit** for the service or panel upgrade (confirm trade and "
        "sub-type with the City of Plano). Typical panel / service changes require a permit."
        if in_plano
        else "Pull permits required for the **service or panel upgrade**; confirm exact permit type with the local AHJ."
    )

    permit_logistics_body = (
        [
            "- [ ] Open the City of Plano building / electrical permit portal and confirm **current** "
            "instructions for residential or commercial electrical work.",
            "- [ ] **Fee schedule:** look for **2026** updates citing about **$85** minimums in official or scout-linked "
            "materials; if only older data (e.g. **$45**) appears, treat it as **unverified** until confirmed on the "
            "live city fee PDF/portal.",
            "- [ ] Confirm that a **licensed electrician / eligible electrical contractor** is the "
            "**applicant of record** to pull the permit (verify exact wording on the Plano application).",
            "- [ ] Upload or bring single-line diagrams, load calculations, and manufacturer cut sheets the city requests.",
            "",
        ]
        if in_plano
        else [
            "- [ ] Confirm minimum permit fees (watch for **2026** / **$85** discussion in your AHJ's published schedule) "
            "and acceptable payment methods on the jurisdiction's **current** fee schedule.",
            "- [ ] Confirm **who may apply** for the electrical permit (owner, contractor license class, etc.).",
            "- [ ] Submit plans, load calculations, and cut sheets per local checklist.",
            "",
        ]
    )

    inspection_body = (
        [
            "- [ ] **Service / Final inspection**: panel **circuit directory** complete and matches breakers; "
            "neutrals and EGCs landed only on listed buses.",
            "- [ ] **Torque marking**: follow manufacturer torque specs; add inspector-visible **torque marks** "
            "where required by spec or local practice.",
            "- [ ] **Grounding electrode** visible and accessible — e.g. ground rod: verify **top of rod depth / cover** "
            "meets **NEC 250.53(G)** (typically **8 ft** driven length with minimal cover; confirm on site and local amendment).",
            "- [ ] Bonding jumpers / GEC clamps tight, corrosion-resistant, and accessible for inspection photos.",
            "- [ ] Working space in front of the panel clear per **NEC 110.26** (depth, width, height, free from storage).",
            "",
        ]
        if in_plano
        else [
            "- [ ] Panel **labeling**, **torque marks** (per manufacturer / AHJ), and **grounding electrode system** "
            "ready for inspection (depth / routing per **NEC 250** — confirm local amendments).",
            "- [ ] Working space clear per **NEC 110.26**.",
            "",
        ]
    )

    lines: List[str] = [
        "## Contractor Action Plan — Panel / service work (inspector punch list)",
        "",
        "_Generated without Claude — enable ANTHROPIC_API_KEY for a tailored memo._",
        "",
        "### Permit & Fees",
        "",
        "- [ ] " + permit_scope,
        "- [ ] **Verify AHJ**"
        + (f" — **{ju_line}**." if ju_line else f" for ZIP **{zip_str}**."),
        "- [ ] Match permit type to scope on the official permit checklist.",
    ]
    lines.extend(permit_logistics_body)
    lines.extend(
        [
            "### NEC Technicals (AFCI/GFCI/Grounding)",
            "",
            "- [ ] **GFCI** — Where **new or relocated** branch circuits extend into kitchen, bathroom, garage, exterior, "
            "basement, etc., confirm **210.8** protection on appropriate circuits.",
            "- [ ] **AFCI** — Where **new or relocated** 120 V branch circuits supply family rooms, bedrooms, etc., confirm **210.12** device type.",
            "- [ ] **Grounding & bonding (Art. 250)** — Main bonding jumper, neutral bus separation in subpanels, EGC run with every circuit, "
            "and electrode system continuous to service.",
            "- [ ] **Working space (110.26)** — 30 in. width, 36 in. depth, 6.5 ft height (or as required for equipment); "
            "panel not blocked by shelving or equipment.",
            "- [ ] Confirm **adopted NEC cycle and local amendments** on the AHJ website.",
            "",
            "### Inspection Prep",
            "",
        ],
    )
    lines.extend(inspection_body)
    lines.append("### Reference Links")
    lines.append("")
    if source_urls:
        for u in source_urls:
            lines.append(f"- {u}")
    else:
        lines.append("- *(No URLs returned in this run.)*")

    wf = raw.get("agentic_workflow") or []
    if wf:
        lines.extend(["", "---", "", "**Workflow trace**", ""])
        for line in wf:
            lines.append(f"- {line}")

    if has_ctx and len(enhanced_query) < 2000:
        short = re.sub(r"\s+", " ", enhanced_query)[:500]
        if len(enhanced_query) > 500:
            short += "…"
        lines.extend(["", "**Context snapshot:**", "", short])

    lines.extend(["", "---", "", head])
    return "\n".join(lines)


def _iter_streaming_words(chunks: Iterator[str]) -> Iterator[str]:
    """Split model chunks into word/whitespace pieces without splitting a word across chunk boundaries."""
    buf = ""
    for chunk in chunks:
        buf += chunk
        while True:
            m = re.match(r"^(\S+\s+)", buf)
            if m:
                yield m.group(1)
                buf = buf[m.end() :]
                continue
            m2 = re.match(r"^(\s+)", buf)
            if m2:
                yield m2.group(1)
                buf = buf[m2.end() :]
                continue
            break
    if buf:
        yield buf


def _action_plan_queue_producer(q: Queue, digest: str) -> None:
    try:
        for fragment in _iter_streaming_words(
            iter_contractor_action_plan_stream(_CONTRACTOR_ACTION_PLAN_SYSTEM, digest),
        ):
            if fragment:
                q.put(("delta", fragment))
        q.put(("done", None))
    except Exception as e:
        q.put(("error", e))


def _ahj_identification_payload(ju: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "city": ju.get("city") or "",
        "county": ju.get("county") or "",
        "state": ju.get("state") or "",
        "mode": ju.get("mode") or "",
        "zip": ju.get("zip") or "",
        "formatted_address": ju.get("formatted_address") or "",
        "label": ju.get("label") or "",
    }


def _scout_iter_next(it: Iterator[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    try:
        return next(it)
    except StopIteration:
        return None


def _iter_summary_word_chunks(text: str) -> Iterator[str]:
    """Yield text in word-sized pieces (including trailing whitespace) for client typewriter UI."""
    for m in re.finditer(r"\S+\s*", text or "", flags=re.MULTILINE):
        yield m.group(0)


def _vision_queue_producer(
    q: Queue,
    image_bytes: bytes,
    content_type: Optional[str],
    filename: Optional[str],
) -> None:
    try:
        for fragment in iter_job_site_image_text_stream(image_bytes, content_type, filename):
            if fragment:
                q.put(("delta", fragment))
        q.put(("done", None))
    except Exception as e:
        q.put(("error", e))


def _safe_sse_data_frame(chunk: Dict[str, Any]) -> str:
    """SSE frame with ``data: …\\n\\n``. Fallback to a plain-text line if JSON cannot encode."""
    try:
        return f"data: {json.dumps(chunk, ensure_ascii=False, default=str)}\n\n"
    except (TypeError, ValueError) as e:
        plain = f"SSE_JSON_FAILED: {e!s}".replace("\n", " ").replace("\r", " ")[:800]
        return f"data: {plain}\n\n"


def _log_research_step(label: str, *, detail: str = "") -> None:
    """Stdout trace for hung streams — always visible when running ``python backend/main.py``."""
    if detail:
        line = f"research step: {label} — {detail}"
    else:
        line = f"research step: {label}"
    print(line, flush=True)
    sys.stdout.flush()
    logger.info(line)


async def _with_heartbeats(threadpool_coro):
    """
    Await one threadpool call without blocking the event loop.
    Heartbeats are optional (_SSE_HEARTBEATS_ENABLED) to avoid flooding the client.
    """
    if not _SSE_HEARTBEATS_ENABLED:
        res = await threadpool_coro
        yield ("__done__", res)
        return
    task = asyncio.create_task(threadpool_coro)
    while not task.done():
        try:
            await asyncio.wait_for(asyncio.shield(task), timeout=_STREAM_HEARTBEAT_SEC)
        except asyncio.TimeoutError:
            yield ": ping\n\n"
            yield _safe_sse_data_frame({"event": "heartbeat", "ts": time.time()})
            await asyncio.sleep(0)
    yield ("__done__", task.result())


@app.get("/")
def root() -> Dict[str, str]:
    return {
        "name": "Reg Guard",
        "tagline": "Agentic Compliance Assistant for Contractors",
    }


@app.get("/dashboard-revision")
def dashboard_revision() -> Dict[str, str]:
    """
    Lightweight JSON for dashboard polling. ``version`` is static (env); ``revision`` changes
    when this process restarts or backend sources change on disk.
    """
    app_version = (os.environ.get("REG_GUARD_APP_VERSION") or "1.0.0").strip() or "1.0.0"
    explicit_rev = (os.environ.get("REG_GUARD_REVISION") or "").strip()
    revision = explicit_rev or f"{_BACKEND_BOOT_ID}-{compute_backend_source_fingerprint()}"
    return {
        "version": app_version,
        "revision": revision,
    }


@app.get("/geocode-zip")
def geocode_zip(latitude: float, longitude: float) -> Dict[str, str]:
    """
    Reverse geocode a position to a 5-digit U.S. ZIP (in-memory @lru_cache for repeats).
    """
    try:
        z = us_zip_from_lat_lon(latitude, longitude)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"zip": z}


@app.get("/reverse-geocode-address")
def reverse_geocode_address(latitude: float, longitude: float) -> Dict[str, str]:
    """
    Server-side reverse geocode (Google Geocoding API, no HTTP Referer) for Locate Me UX.
    """
    try:
        formatted, zip5 = google_reverse_geocode_us_latlng(latitude, longitude)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"formatted_address": formatted, "zip": zip5}


@app.post("/research")
async def research(
    request: Request,
    zip_code: str = Form(
        "",
        description="5-digit ZIP from address selection (cross-check with geocode.py)",
    ),
    job_description: str = Form(""),
    search_limit: int = Form(5),
    site_address: str = Form(
        "",
        description="Google Places formatted_address — city/county via geocode.py",
    ),
    image: Optional[UploadFile] = File(None),
):
    """
    Multipart research streamed as **Server-Sent Events** (``text/event-stream``).

    The response body is an **async generator** of many ``data:`` SSE frames
    (``data: <json>\\n\\n``), including incremental ``summary_delta`` chunks, not one final string only.

    Each event's ``data`` field is one JSON object (same schema as the former NDJSON lines).

    Emits immediately to avoid proxy/client JSON timeouts, then streams Claude vision (if any),
    Firecrawl scout steps, and word-sized chunks of the Contractor Action Plan.

    Events include: ``open``, ``heartbeat`` (during slow Firecrawl/vision work), ``vision_delta``,
    ``context``, ``jurisdiction`` (when geocoded),
    ``step`` (including ``step_ahj_identification`` before Universal Scout), ``step`` (scout),
    ``summary_delta``, ``complete``.
    """
    try:
        lim = _parse_search_limit(search_limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    image_bytes: Optional[bytes] = None
    image_meta: Tuple[Optional[str], Optional[str]] = (None, None)
    if image is not None and (image.filename or "").strip():
        image_bytes = await image.read()
        if image_bytes:
            image_meta = (image.content_type, image.filename)

    jd = (job_description or "").strip()
    site_line = (site_address or "").strip()

    if not site_line:
        raise HTTPException(
            status_code=400,
            detail="Select a U.S. job site address from the address search field.",
        )

    async def research_sse():
        try:
            yield _safe_sse_data_frame({"event": "open"})
            _log_research_step("open", detail="SSE stream started")

            try:
                profile: JurisdictionProfile = await run_in_threadpool(
                    geocode_profile_from_address,
                    site_line,
                )
            except ValueError as e:
                yield _safe_sse_data_frame({"event": "error", "message": str(e)})
                return

            if (zip_code or "").strip():
                try:
                    client_z = normalize_us_zip(zip_code)
                except ValueError as e:
                    yield _safe_sse_data_frame({"event": "error", "message": str(e)})
                    return
                if client_z != profile.zip5:
                    yield _safe_sse_data_frame(
                        {
                            "event": "error",
                            "message": "ZIP does not match the selected address. Pick the address again from suggestions.",
                        }
                    )
                    return

            zip_for_scout = profile.zip5
            scout_jurisdiction = profile.to_scout_dict()
            scout_site = profile.formatted_address or site_line

            photo_analysis: Optional[str] = None
            if image_bytes:
                content_type, filename = image_meta
                q: Queue = Queue()
                thread = threading.Thread(
                    target=_vision_queue_producer,
                    args=(q, image_bytes, content_type, filename),
                    daemon=True,
                )
                _log_research_step("vision", detail="Claude vision — analyzing job-site image")
                thread.start()
                raw_parts: List[str] = []
                while True:
                    kind: str
                    val: Any
                    async for pkt in _with_heartbeats(run_in_threadpool(q.get)):
                        if isinstance(pkt, tuple) and pkt[0] == "__done__":
                            kind, val = pkt[1]
                            break
                        yield pkt
                    if kind == "delta":
                        raw_parts.append(cast(str, val))
                        yield _safe_sse_data_frame({"event": "vision_delta", "text": cast(str, val)})
                    elif kind == "done":
                        break
                    else:
                        err = cast(Exception, val)
                        yield _safe_sse_data_frame({"event": "error", "message": str(err)})
                        return
                photo_analysis = normalize_vision_text("".join(raw_parts))
                _log_research_step("vision", detail="Claude vision — done")

            enhanced_query = _build_enhanced_query(job_description, photo_analysis)
            yield _safe_sse_data_frame(
                {
                    "event": "context",
                    "enhanced_query": enhanced_query,
                    "job_description": jd,
                    "photo_analysis": photo_analysis,
                }
            )
            _log_research_step("context", detail="enhanced query ready for scout")

            if scout_jurisdiction and scout_site:
                yield _safe_sse_data_frame(
                    {
                        "event": "jurisdiction",
                        "site_address": scout_site,
                        "profile": scout_jurisdiction,
                    }
                )
                _log_research_step("jurisdiction", detail="geocoded profile emitted to client")

            ahj_for_scout: Optional[Dict[str, Any]] = None
            if scout_jurisdiction:
                ahj_for_scout = _ahj_identification_payload(scout_jurisdiction)
                _log_research_step(
                    "AHJ identification",
                    detail="city/county/state from geocode (before Universal Scout)",
                )
                yield _safe_sse_data_frame(
                    {
                        "event": "step",
                        "step": "step_ahj_identification",
                        "data": {
                            "query": "Identify city and county from formatted address (geocode.py → Google Geocoding API)",
                            "results": [],
                            **ahj_for_scout,
                        },
                    }
                )

            final_raw: Optional[Dict[str, Any]] = None
            try:
                _log_research_step(
                    "Universal Scout",
                    detail="Firecrawl /search — jurisdiction, permits, codes (sequential)",
                )
                it = iter(
                    iter_universal_scout(
                        zip_for_scout,
                        search_limit=lim,
                        enhanced_context=enhanced_query,
                        site_address=scout_site,
                        jurisdiction=scout_jurisdiction,
                        ahj_identification=ahj_for_scout,
                    )
                )
                _scout_labels = {
                    "step_jurisdiction": "pass 1/3 — jurisdiction & AHJ hints (Firecrawl)",
                    "step_building_permits": "pass 2/3 — building permits (Firecrawl)",
                    "step_building_codes": "pass 3/3 — adopted codes (Firecrawl)",
                }
                while True:
                    ev: Optional[Dict[str, Any]] = None
                    async for pkt in _with_heartbeats(run_in_threadpool(_scout_iter_next, it)):
                        if isinstance(pkt, tuple) and pkt[0] == "__done__":
                            ev = pkt[1]
                            break
                        yield pkt
                    if ev is None:
                        break
                    if ev.get("event") == "complete":
                        final_raw = ev["raw"]
                        _log_research_step("Universal Scout", detail="all search passes complete")
                        break
                    if ev.get("event") == "step":
                        key = str(ev.get("step") or "step")
                        _log_research_step(
                            "Universal Scout",
                            detail=_scout_labels.get(key, key),
                        )
                    yield _safe_sse_data_frame(ev)
            except Exception:
                logger.exception("Firecrawl / Universal Scout crawl failed")
                yield _safe_sse_data_frame({"event": "error", "message": _RESEARCH_STALL_FIRECRAWL_MESSAGE})
                return

            if final_raw is None:
                yield _safe_sse_data_frame(
                    {"event": "error", "message": "Research finished without complete payload."}
                )
                return

            raw = final_raw
            source_urls = _collect_source_urls(raw)
            _log_research_step("digest", detail="building structured research digest")
            digest = build_research_digest(raw, source_urls, enhanced_query)

            summary: str
            if (os.getenv("ANTHROPIC_API_KEY") or "").strip():
                q_plan: Queue = Queue()
                thread_plan = threading.Thread(
                    target=_action_plan_queue_producer,
                    args=(q_plan, digest),
                    daemon=True,
                )
                _log_research_step("action plan", detail="Claude — Contractor Action Plan streaming")
                thread_plan.start()
                raw_parts: List[str] = []
                while True:
                    kind: str
                    val: Any
                    async for pkt in _with_heartbeats(run_in_threadpool(q_plan.get)):
                        if isinstance(pkt, tuple) and pkt[0] == "__done__":
                            kind, val = pkt[1]
                            break
                        yield pkt
                    if kind == "delta":
                        raw_parts.append(cast(str, val))
                        yield _safe_sse_data_frame({"event": "summary_delta", "text": cast(str, val)})
                        await asyncio.sleep(0)
                    elif kind == "done":
                        summary = "".join(raw_parts)
                        break
                    else:
                        err = cast(Exception, val)
                        stub = _research_action_plan_fallback_markdown(raw, source_urls, enhanced_query)
                        banner = (
                            f"*Claude action plan unavailable ({err!s}); "
                            "showing structured fallback memo.*\n\n"
                        )
                        yield _safe_sse_data_frame({"event": "summary_delta", "text": banner})
                        await asyncio.sleep(0)
                        for chunk in _iter_summary_word_chunks(stub):
                            yield _safe_sse_data_frame({"event": "summary_delta", "text": chunk})
                            await asyncio.sleep(0)
                        summary = banner + stub
                        _log_research_step("action plan", detail="fallback memo (Claude error)")
                        break
            else:
                _log_research_step("action plan", detail="structured fallback memo — no ANTHROPIC_API_KEY")
                summary = _research_action_plan_fallback_markdown(raw, source_urls, enhanced_query)
                for chunk in _iter_summary_word_chunks(summary):
                    yield _safe_sse_data_frame({"event": "summary_delta", "text": chunk})
                    await asyncio.sleep(0)

            _log_research_step("complete", detail="streaming final payload to client")
            ju_complete = scout_jurisdiction or {}
            yield _safe_sse_data_frame(
                {
                    "event": "complete",
                    "zip": raw["zip"],
                    "site_address": raw.get("site_address"),
                    "city": ju_complete.get("city") or None,
                    "county": ju_complete.get("county") or None,
                    "jurisdiction": raw.get("jurisdiction"),
                    "summary": summary,
                    "source_urls": source_urls,
                    "enhanced_query": enhanced_query,
                    "job_description": jd,
                    "photo_analysis": photo_analysis,
                }
            )
        finally:
            clear_scout_run_caches()

    return StreamingResponse(
        research_sse(),
        media_type="text/event-stream; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Keep-Alive": "timeout=600, max=1000",
            **_research_sse_cors_headers(request),
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
