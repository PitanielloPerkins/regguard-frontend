"""
Reg Guard — FastAPI application entry point.
"""
import re
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool

from geocode import us_zip_from_lat_lon
from scraper import search_local_building_codes_by_zip
from vision import analyze_job_site_image

app = FastAPI(
    title="Reg Guard",
    description="Agentic Compliance Assistant for Contractors",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
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
    has_ctx = (enhanced_query or "").strip() and not enhanced_query.strip().startswith("— (no")
    lines = [
        f"Reg Guard research for US ZIP {zip_str}.",
        "Enhanced job context (voice, typed text, and/or photo) was used to steer"
        f" the Firecrawl search chain: {'yes' if has_ctx else 'no (ZIP only)'}",
        "",
        "Workflow:",
    ]
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


@app.get("/")
def root() -> Dict[str, str]:
    return {
        "name": "Reg Guard",
        "tagline": "Agentic Compliance Assistant for Contractors",
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


@app.post("/research")
async def research(
    zip_code: str = Form(..., description="US ZIP (5 digits or ZIP+4)"),
    job_description: str = Form(""),
    search_limit: int = Form(5),
    image: Optional[UploadFile] = File(None),
) -> Dict[str, Any]:
    """
    Multipart research: ZIP, optional job description, optional job-site image.
    If an image is present, Claude 3.5 Sonnet vision (Anthropic SDK, ANTHROPIC_API_KEY) processes it;
    results merge into the single enhanced query for Firecrawl.
    """
    try:
        lim = _parse_search_limit(search_limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    photo_analysis: Optional[str] = None
    if image is not None and (image.filename or "").strip():
        data = await image.read()
        if data:
            try:
                photo_analysis = await run_in_threadpool(
                    analyze_job_site_image,
                    data,
                    image.content_type,
                    image.filename,
                )
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e)) from e
            except Exception as e:
                raise HTTPException(
                    status_code=502,
                    detail="Vision (Claude) request failed. Check ANTHROPIC_API_KEY and image format.",
                ) from e

    enhanced_query = _build_enhanced_query(job_description, photo_analysis)

    try:
        raw = await run_in_threadpool(
            search_local_building_codes_by_zip,
            zip_code,
            search_limit=lim,
            enhanced_context=enhanced_query,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(
            status_code=502,
            detail="Firecrawl research failed. Verify FIRECRAWL_API_KEY and service status.",
        ) from e

    source_urls = _collect_source_urls(raw)
    return {
        "zip": raw["zip"],
        "summary": _research_summary(raw, source_urls, enhanced_query),
        "source_urls": source_urls,
        "enhanced_query": enhanced_query,
        "job_description": (job_description or "").strip(),
        "photo_analysis": photo_analysis,
    }
