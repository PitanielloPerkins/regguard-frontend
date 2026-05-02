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
import time
import threading
import uuid
from pathlib import Path
from queue import Queue
from typing import Any, Dict, Iterator, List, Optional, Tuple, cast

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
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

# Chunked SSE stream: yield heartbeats while Firecrawl / vision block in threadpool
# so proxies and browsers keep the connection open during long scans.
_STREAM_HEARTBEAT_SEC = 2.0

_RESEARCH_STALL_FIRECRAWL_MESSAGE = (
    "Research stalled. Check Firecrawl usage at firecrawl.dev/app"
)

logger = logging.getLogger("reg_guard")

# Claude memo — Markdown Contractor Action Plan (see /research summary streaming).
_CONTRACTOR_ACTION_PLAN_SYSTEM = """You are Reg Guard's compliance writing assistant for licensed U.S. contractors.

Respond ONLY with Markdown. Use exactly these sections and headings:

## Contractor Action Plan

### Permit Status
State clearly **Required**, **Not required**, or **Uncertain — verify with AHJ** for the job scope implied by the digest. Short paragraph; tie to jurisdiction context when the digest supports it.

### Key Constraints
Bulleted list: setbacks, hours of operation, noise ordinances, and other locality limits **when inferable** from the digest or typical AHJ practice for that jurisdiction type. If unknown, state **Insufficient detail in sources — confirm with AHJ** and bullet what to ask.

### Action Items
Numbered list (1. 2. 3. …) of concrete contractor next steps (whom to call, which applications, inspections, documents).

### Reference Links
Bulleted Markdown links for URLs from `unique_source_urls` in the digest (`[title or host](url)` when a title appears in scout hits; otherwise use the bare URL). Include each distinct URL once.

Rules:
- Do not invent URLs, ordinance text, or definitive permit outcomes absent digest support; prefer **Uncertain** / verify wording.
- Neutral, factual tone; no lecturing.
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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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
    zip_str = raw.get("zip", "")
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

    lines = [
        "## Contractor Action Plan",
        "",
        "### Permit Status",
        "**Uncertain — verify with AHJ.** Most structural or mechanical scopes require permits; "
        "confirm against your trade and scope with the jurisdiction below.",
        "",
        "### Key Constraints",
        "- **Insufficient detail in sources** — confirm setbacks, allowed construction hours, "
        "noise ordinances, and staging rules with the Authority Having Jurisdiction.",
        "",
        "### Action Items",
    ]
    n = 1
    if ju_line:
        lines.append(f"{n}. Confirm AHJ and permit desk for: **{ju_line}**.")
        n += 1
    lines.append(
        f"{n}. Call or portal-check the city/county building department for ZIP **{zip_str}** "
        "with your job description and plans."
    )
    n += 1
    lines.append(
        f"{n}. Gather site photos, scope of work, and property records before filing applications."
    )
    n += 1
    ctx_note = (
        "Enhanced job context (voice/photo/text) was merged into the scout queries."
        if has_ctx
        else "Run research again with voice or typed scope for tighter steering."
    )
    lines.append(f"{n}. {ctx_note}")
    lines.extend(["", "### Reference Links"])
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
    """Split model chunks into word+whitespace pieces without splitting across chunk boundaries."""
    buf = ""
    for chunk in chunks:
        buf += chunk
        while True:
            m = re.match(r"^(\S+\s+)", buf)
            if not m:
                break
            yield m.group(1)
            buf = buf[m.end() :]
    if buf.strip():
        yield buf.lstrip()


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


def _sse_data_event(obj: Dict[str, Any]) -> bytes:
    """One SSE message: a single JSON object in the data field (newline-safe via JSON escaping)."""
    payload = json.dumps(obj, ensure_ascii=False)
    return f"data: {payload}\n\n".encode("utf-8")


def _log_research_step(label: str, *, detail: str = "") -> None:
    """Stdout trace for hung streams — always visible when running ``python backend/main.py``."""
    if detail:
        line = f"research step: {label} — {detail}"
    else:
        line = f"research step: {label}"
    print(line, flush=True)
    logger.info(line)


async def _with_heartbeats(threadpool_coro):
    """
    Await one threadpool call (Vision queue pull or Universal Scout step) without
    stalling the asyncio event loop; emit NDJSON heartbeats if the call is slow
    so intermediaries keep the stream alive.
    """
    task = asyncio.create_task(threadpool_coro)
    while not task.done():
        try:
            await asyncio.wait_for(asyncio.shield(task), timeout=_STREAM_HEARTBEAT_SEC)
        except asyncio.TimeoutError:
            # Wire-level padding so intermediaries flush; empty lines are ignored by the NDJSON client.
            yield b"\n"
            yield _line({"event": "heartbeat", "ts": time.time()})
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
    Multipart research streamed as NDJSON (one JSON object per line).

    Emits immediately to avoid proxy/client JSON timeouts, then streams Claude vision (if any),
    Firecrawl scout steps, and word chunks of the final summary.

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

    profile: JurisdictionProfile
    try:
        profile = await run_in_threadpool(geocode_profile_from_address, site_line)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    if (zip_code or "").strip():
        try:
            client_z = normalize_us_zip(zip_code)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e)) from e
        if client_z != profile.zip5:
            raise HTTPException(
                status_code=400,
                detail="ZIP does not match the selected address. Pick the address again from suggestions.",
            )
    zip_for_scout = profile.zip5
    scout_jurisdiction = profile.to_scout_dict()
    scout_site = profile.formatted_address or site_line

    async def ndjson_bytes():
        try:
            yield _line({"event": "open"})
            _log_research_step("open", detail="NDJSON stream started")

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
                        yield _line({"event": "vision_delta", "text": cast(str, val)})
                    elif kind == "done":
                        break
                    else:
                        err = cast(Exception, val)
                        yield _line({"event": "error", "message": str(err)})
                        return
                photo_analysis = normalize_vision_text("".join(raw_parts))
                _log_research_step("vision", detail="Claude vision — done")

            enhanced_query = _build_enhanced_query(job_description, photo_analysis)
            yield _line(
                {
                    "event": "context",
                    "enhanced_query": enhanced_query,
                    "job_description": jd,
                    "photo_analysis": photo_analysis,
                }
            )
            _log_research_step("context", detail="enhanced query ready for scout")

            if scout_jurisdiction and scout_site:
                yield _line(
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
                yield _line(
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
                    yield _line(ev)
            except Exception:
                logger.exception("Firecrawl / Universal Scout crawl failed")
                yield _line({"event": "error", "message": _RESEARCH_STALL_FIRECRAWL_MESSAGE})
                return

            if final_raw is None:
                yield _line({"event": "error", "message": "Research finished without complete payload."})
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
                        yield _line({"event": "summary_delta", "text": cast(str, val)})
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
                        yield _line({"event": "summary_delta", "text": banner})
                        for chunk in _iter_summary_word_chunks(stub):
                            yield _line({"event": "summary_delta", "text": chunk})
                        summary = banner + stub
                        _log_research_step("action plan", detail="fallback memo (Claude error)")
                        break
            else:
                _log_research_step("action plan", detail="structured fallback memo — no ANTHROPIC_API_KEY")
                summary = _research_action_plan_fallback_markdown(raw, source_urls, enhanced_query)
                for chunk in _iter_summary_word_chunks(summary):
                    yield _line({"event": "summary_delta", "text": chunk})

            _log_research_step("complete", detail="streaming final payload to client")
            ju_complete = scout_jurisdiction or {}
            yield _line(
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
        ndjson_bytes(),
        media_type="application/x-ndjson; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Keep-Alive": "timeout=600, max=1000",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
