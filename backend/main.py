"""
Reg Guard — FastAPI application entry point.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
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
from scraper import iter_universal_scout, normalize_us_zip
from vision import iter_job_site_image_text_stream, normalize_vision_text

_BACKEND_DIR = Path(__file__).resolve().parent
_BACKEND_BOOT_ID = uuid.uuid4().hex[:10]


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


def _research_summary(
    raw: Dict[str, Any],
    source_urls: List[str],
    enhanced_query: str,
) -> str:
    zip_str = raw.get("zip", "")
    site = (raw.get("site_address") or "").strip()
    ju = raw.get("jurisdiction")
    ju_line = ""
    if isinstance(ju, dict):
        lab = ju.get("label")
        if isinstance(lab, str) and lab.strip():
            ju_line = lab.strip()

    head = (
        f"Reg Guard research for {site} (US ZIP {zip_str})."
        if site
        else f"Reg Guard research for US ZIP {zip_str}."
    )
    has_ctx = (enhanced_query or "").strip() and not enhanced_query.strip().startswith("— (no")
    lines = [head]
    if ju_line:
        lines.append(f"Jurisdiction steering: {ju_line}")
    lines.extend(
        [
            "Enhanced job context (voice, typed text, and/or photo) was used to steer"
            f" the Firecrawl search chain: {'yes' if has_ctx else 'no (ZIP only)'}",
            "",
            "Workflow:",
        ]
    )
    for line in raw.get("agentic_workflow") or []:
        lines.append(f"• {line}")
    if has_ctx and len(enhanced_query) < 2000:
        short = re.sub(r"\s+", " ", enhanced_query)[:500]
        if len(enhanced_query) > 500:
            short += "…"
        lines.extend(["", f"Context snapshot: {short}"])
    lines.extend(
        [
            "",
            f"Found {len(source_urls)} unique source URL(s) across jurisdiction, "
            "permit, and building-code searches (see source_urls).",
        ]
    )
    return "\n".join(lines)


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


def _line(obj: Dict[str, Any]) -> bytes:
    return (json.dumps(obj, ensure_ascii=False) + "\n").encode("utf-8")


@app.get("/")
def root() -> Dict[str, str]:
    return {
        "name": "Reg Guard",
        "tagline": "Agentic Compliance Assistant for Contractors",
    }


@app.get("/dashboard-revision")
def dashboard_revision() -> Dict[str, str]:
    """
    Polling endpoint: revision string changes when this process restarts or backend ``.py`` changes.
    """
    explicit = (os.environ.get("REG_GUARD_REVISION") or "").strip()
    if explicit:
        rev = explicit
    else:
        rev = f"{_BACKEND_BOOT_ID}-{compute_backend_source_fingerprint()}"
    return {"revision": rev, "pid": str(os.getpid())}


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

    Events include: ``open``, ``vision_delta``, ``context``, ``jurisdiction`` (when geocoded),
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
        yield _line({"event": "open"})

        photo_analysis: Optional[str] = None
        if image_bytes:
            content_type, filename = image_meta
            q: Queue = Queue()
            thread = threading.Thread(
                target=_vision_queue_producer,
                args=(q, image_bytes, content_type, filename),
                daemon=True,
            )
            thread.start()
            raw_parts: List[str] = []
            while True:
                kind, val = await run_in_threadpool(q.get)
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

        enhanced_query = _build_enhanced_query(job_description, photo_analysis)
        yield _line(
            {
                "event": "context",
                "enhanced_query": enhanced_query,
                "job_description": jd,
                "photo_analysis": photo_analysis,
            }
        )

        if scout_jurisdiction and scout_site:
            yield _line(
                {
                    "event": "jurisdiction",
                    "site_address": scout_site,
                    "profile": scout_jurisdiction,
                }
            )

        ahj_for_scout: Optional[Dict[str, Any]] = None
        if scout_jurisdiction:
            ahj_for_scout = _ahj_identification_payload(scout_jurisdiction)
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
        final_raw: Optional[Dict[str, Any]] = None
        while True:
            ev = await run_in_threadpool(_scout_iter_next, it)
            if ev is None:
                break
            if ev.get("event") == "complete":
                final_raw = ev["raw"]
                break
            yield _line(ev)

        if final_raw is None:
            yield _line({"event": "error", "message": "Research finished without complete payload."})
            return

        raw = final_raw
        source_urls = _collect_source_urls(raw)
        summary = _research_summary(raw, source_urls, enhanced_query)

        for chunk in _iter_summary_word_chunks(summary):
            yield _line({"event": "summary_delta", "text": chunk})

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

    return StreamingResponse(
        ndjson_bytes(),
        media_type="application/x-ndjson; charset=utf-8",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
