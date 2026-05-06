"""
Reg Guard — FastAPI application entry point.

Research memo: ``research_memo.build_research_digest``. **Universal Scout** applies a **data fence**
in ``scraper.py``: every query line appends **City, ST** or **County, ST** via ``LOCALITY_LOCK`` using phrasing such as
**``{city}, {state} official city code and building permits``** (looser than a strict in-state-only SERP lock).
**Plano, TX** also appends ``PLANO_SCOUT_*`` strings there.

**FinOps:** Firecrawl ``/search`` responses are deduplicated by normalized query in ``semantic_scout_cache`` (TTL, opt-out
``REG_GUARD_SEMANTIC_SCOUT_CACHE=0``). Trusted-page **markdown** rescrapes are cached in ``markdown_scraper`` (opt-out
``REG_GUARD_MARKDOWN_SCRAPER_CACHE=0``); call ``fetch_trusted_url_markdown`` when you need cheap page text.
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

from fastapi import Body, FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from geocode import google_reverse_geocode_us_latlng, us_zip_from_lat_lon
from jurisdiction import JurisdictionProfile, geocode_profile_from_address
from maintenance_mode import create_subscription, list_subscriptions, set_maintenance_mode
from research_memo import (
    build_research_digest,
    filter_source_urls,
    iter_contractor_action_plan_stream,
    scout_has_no_trusted_results,
)
from universal_scout_archive import save_scout_snapshot
# Firecrawl Universal Scout (/v2/search, tight caps) — see ``scraper.py``.
from scraper import (
    SCOUT_SOURCE_STEP_KEYS,
    clear_scout_run_caches,
    format_future_risk_markdown,
    future_risk_alerts_from_raw,
    iter_universal_scout,
    normalize_us_zip,
)
from bim_sync import run_bim_sync_bridge
from calculations import permit_draft_calculation_response
from community_gotchas import append_note, list_notes_for_zip
from cost_tracking import log_api_usage
from router import model_for_community_note_context, model_for_permit_scout_text
from vision_agent import (
    gemini_configured,
    iter_reality_capture_audit_stream,
    normalize_vision_text,
    scout_summary_for_reality_capture,
)

# ROI calculator defaults — unit economics for admin / dashboard.
_ROI_MANUAL_HOUR_USD = 75.0
_ROI_FAILED_INSPECTION_USD = 1200.0

# Sync reference: Dallas Building Inspection — minimum trade permit (incl. admin) used in digest/fallback prompts.
_DALLAS_TX_MIN_TRADE_PERMIT_USD = 167.00

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
# Digest: ``research_memo.build_research_digest``. Scout query construction + data fence: ``scraper.py``.
_CONTRACTOR_ACTION_PLAN_SYSTEM = """You are Reg Guard's **field punch list** writer for licensed electrical contractors.

Scout results favor **.gov** and **Municode** for the input locality. Act as a **Master Electrician for that specific city or county**; output **only** `- [ ]` technical punch list lines under the required headings (no narrative paragraphs).

When non-empty ``bim_clash_zones`` is present, you **MUST** follow ``inspector_digest_directive.bim_clash_zone_moat`` under **### Technical Punch List** (Austin **36-inch** gas-relief / meter clearance vs modeled conduit). When ``bim_integration_crossref`` is present, satisfy that cross-reference line item against archived scout URLs.

When the digest JSON includes non-empty ``community_scout_inspector_notes``, you **MUST** follow ``inspector_digest_directive.community_inspector_moat``: under **### Technical Punch List**, lead with **COMMUNITY ALERT: Recent Inspector Feedback** and checkbox lines for each crowdsourced note (tag **verify with AHJ**).

When the digest locality is **Plano, Texas**, you **MUST** include under **Technical Punch List** a **MANDATORY GOTCHA: Plano Ordinance 250.50** block with `- [ ]` tasks for **two 8-foot grounding rods** spaced **20 feet** apart, **connected by a 2/0 AWG conductor** between rods per Plano (**not** the **6-foot** rod-spacing narrative from generic NEC discussion). Cross-check codified wording on official Plano / Municode sources when the digest allows.

When the digest locality is **Plano, Texas**, also prioritize City of Plano amendments vs base NEC, fee schedules (including **2026** when cited), and inspection nuance from **only** Plano-applicable hits.

When the digest locality is **Plano, Texas**, under **Permit Costs** include a `- [ ]` line for **Reg Guard 2026 sync**: **$75.00** total electrical permit (**$65.00** base + **$10.00** laborer) — confirm on official City of Plano fee schedule.

When the digest locality is **Dallas, Texas**, under **Permit Costs** include a `- [ ]` line stating **$167.00** total minimum **trade** permit (incl. **administrative fees**); under **Technical Punch List** include **MANDATORY GOTCHA: Oncor coordination** with `- [ ]` tasks for **mandatory Oncor** notification and coordination before **service disconnect**, **meter seal** / **pull**, or other **utility-side** work.

When the digest locality is **Austin, Texas**, under **### Technical Punch List** include **MANDATORY GOTCHA: City of Austin Design Criteria** with `- [ ]` tasks for **36-inch** clearance from **gas relief valves** and, for **service upgrades** (incl. **78704** / **787** Austin), the **225A** interior **panel bus** with **200A** main / **Solar-Ready** pattern where Austin requires it. Under **Permit Costs**, itemize **Safety Surcharges** from **austintexas.gov/development-services/fees**.

The JSON includes ``inspector_digest_directive`` and may include ``bim_clash_zones``, ``bim_scout_cross_reference``, ``community_scout_inspector_notes``, ``plano_ord_250_50_requirement``, ``plano_electrical_permit_fee_sync_usd``, ``plano_electrical_permit_fee_2026_note``, ``dallas_minimum_trade_permit_usd``, ``dallas_minimum_trade_permit_note``, ``dallas_oncor_disconnect_coordination``, ``austin_design_criteria_requirement``, ``austin_development_services_fees_url``, ``austin_safety_surcharge_note``, ``austin_central_zip_service_upgrade``, and ``empty_scout_nec_2023_fallback``:
- **consultant_role**, **gotchas_guidance**, **fee_and_code_guidance**, **output_format**, **community_inspector_moat** (when present)
- Obey **required_checklist_headings** exactly. If ``plano_ord_250_50_requirement`` is present, satisfy it.

Output ONLY Markdown. Title:

## Contractor Action Plan — Panel / service work (Plano Code Audit when applicable)

Then **exactly** these headings in order—only ``- [ ] `` task lines after optional one-line context per section:

### Permit Costs
### Technical Punch List
Place **MANDATORY GOTCHA:** lines (with supporting `- [ ]` items) for local amendments that **differ** from national NEC when the digest supports it—for Plano, **250.50 / dual 8 ft rods / 20 ft apart / 2/0 AWG bond** between rods is mandatory; for **Austin**, **Design Criteria** (gas relief **36-inch**, **225A**/ **200A** solar-ready bus on upgrades); other examples: exterior disconnect labeling, stricter working space, etc. Do not fabricate ordinance text.

### Inspection Must-Haves
### Reference Links
Each URL in ``unique_source_urls`` once (markdown link when title known, else bare URL).

Rules:
- Imperative checklist tone; **no long prose**.
- Cite details **only** when traceable to the digest; otherwise `- [ ]` to verify on official **.gov** / **Municode**.
- If ``empty_scout_nec_2023_fallback`` is true, the prior rule is waived **only** for the NEC-2023 model-knowledge tasks above (still tag them as verify-with-AHJ).
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
    try:
        from semantic_scout_cache import scout_cache_ttl_sec, semantic_scout_cache_enabled
        from markdown_scraper import markdown_scraper_cache_enabled

        print(
            "FinOps — "
            f"semantic scout search cache: {'on' if semantic_scout_cache_enabled() else 'off'} "
            f"(TTL {scout_cache_ttl_sec():.0f}s), "
            f"markdown scraper cache: {'on' if markdown_scraper_cache_enabled() else 'off'}"
        )
    except Exception as ex:
        print(f"FinOps — status unavailable: {ex}")


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
    """Single research context string: voice (job) + optional multimodal photo audit text."""
    parts: list[str] = []
    jd = (job_description or "").strip()
    if jd:
        parts.append(f"[Job description (voice or typed)]\n{jd}")
    if photo_analysis and photo_analysis.strip():
        parts.append(f"[Job-site photo — Reality Capture Audit]\n{photo_analysis.strip()}")
    if not parts:
        return "— (no job description or image provided; ZIP-only research)"
    return "\n\n".join(parts)


def _parse_search_limit(v: int) -> int:
    v = int(v)
    if v < 1 or v > 20:
        raise ValueError("search_limit must be between 1 and 20")
    return v


def _scout_firecrawl_step_sequence(vertical: str) -> List[str]:
    """Ordered Universal Scout step keys matching ``iter_universal_scout`` (multi-tier intelligence)."""
    x = (vertical or "").strip().lower().replace(" ", "_").replace("-", "_")
    keys = ["step_jurisdiction", "step_building_permits", "step_building_codes"]
    if x in ("infrastructure", "infra", "critical_infrastructure", "data_center", "datacenter", "dc"):
        return keys + ["step_federal_fast41", "step_data_center_water"]
    return keys + ["step_residential_zoning"]


def _collect_source_urls(raw: Dict[str, Any]) -> List[str]:
    seen: set[str] = set()
    ordered: List[str] = []
    for step in SCOUT_SOURCE_STEP_KEYS:
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
    *,
    community_gotchas: Optional[List[Dict[str, Any]]] = None,
    bim_clash_report: Optional[Dict[str, Any]] = None,
) -> str:
    """Deterministic Markdown memo when ANTHROPIC_API_KEY is unavailable."""
    zip_str = str(raw.get("zip") or "")
    site = (raw.get("site_address") or "").strip()
    ju = raw.get("jurisdiction")
    ju_line = ""
    city = ""
    state = ""
    if isinstance(ju, dict):
        lab = ju.get("label")
        if isinstance(lab, str) and lab.strip():
            ju_line = lab.strip()
        city = str(ju.get("city") or "").strip()
        state = str(ju.get("state") or ju.get("state_short") or "").strip()

    head = (
        f"Research context: **{site}** (US ZIP **{zip_str}**)."
        if site
        else f"Research context: US ZIP **{zip_str}**."
    )
    has_ctx = (enhanced_query or "").strip() and not enhanced_query.strip().startswith("— (no")

    loc_short = ", ".join(p for p in (city, state) if p)
    if not loc_short:
        loc_short = ju_line or f"ZIP {zip_str}"

    permit_scope = (
        f"Pull permits required for the **service or panel upgrade** for **{loc_short}**; "
        "confirm exact permit type and department name on the official AHJ site or from the scout links below."
    )

    fee_fallback = (
        f"- [ ] **If scout results do not state a permit fee:** Verify exact fee with {city} Building Department."
        if city
        else "- [ ] **If scout results do not state a permit fee:** Verify exact fee with the local Building Department / AHJ."
    )

    permit_block = [
        "- [ ] Use only resources that apply to this **site / jurisdiction**; discard other states' data unless "
        "explicitly cited as controlling.",
        "- [ ] Open the official permit or building portal for this jurisdiction and confirm **application type**, **fees "
        "listed there**, and **who may pull** the permit.",
        fee_fallback,
        "- [ ] Note any **adopted NEC edition / local amendments** only if stated in the search results or linked ordinances.",
        "- [ ] Upload or bring single-line diagrams, load calculations, and cut sheets the jurisdiction requests.",
        "",
    ]
    if city.lower() == "plano" and (state or "").strip().upper() == "TX":
        permit_block.insert(
            1,
            "- [ ] Scout targets: **Plano building fee schedule 2026** and **Plano TX electrical amendments 2023 NEC** — confirm figures on the official city fee table / code adoption pages.",
        )
    if city.lower() == "dallas" and (state or "").strip().upper() == "TX":
        permit_block.insert(
            1,
            f"- [ ] **Reg Guard sync (Dallas, TX):** Minimum **trade** permit **${_DALLAS_TX_MIN_TRADE_PERMIT_USD:.2f}** "
            "including **administrative fees** (planning floor only — confirm on official Dallas permit / fee pages).",
        )
        permit_block.insert(
            2,
            "- [ ] **Oncor (Dallas):** Complete **mandatory Oncor** notification / coordination for **service disconnect**, **meter pull**, or **utility-side** work before cutting or restoring **energized** service.",
        )
    if city.lower() == "austin" and (state or "").strip().upper() == "TX":
        permit_block.insert(
            1,
            "- [ ] **Reg Guard sync (Austin, TX):** Itemize **Development Services** permit fees and **Safety Surcharges** using **https://www.austintexas.gov/development-services/fees** (confirm against the live City of Austin schedule).",
        )

    inspection_body = [
        "- [ ] **Service / Final inspection**: panel **circuit directory** complete and matches breakers; "
        "neutrals and EGCs landed only on listed buses.",
        "- [ ] **Torque marking**: follow manufacturer torque specs; add inspector-visible **torque marks** "
        "where required by spec or local practice.",
        "- [ ] **Grounding electrode** visible and accessible — verify routing and connections per **NEC 250** as adopted "
        "locally (confirm edition in results).",
        "- [ ] Bonding / GEC clamps tight, corrosion-resistant, and accessible for inspection.",
        "- [ ] Working space in front of the panel clear per **NEC 110.26** (depth, width, height, free from storage).",
        "",
    ]

    lines: List[str] = [
        "## Contractor Action Plan — Panel / service work (inspector punch list)",
        "",
        "### Permit Costs",
        "",
        "- [ ] " + permit_scope,
        "- [ ] **Verify AHJ**"
        + (f" — **{ju_line}**." if ju_line else f" for **{loc_short}**."),
        "- [ ] Match permit type to scope on the official checklist.",
    ]
    if city.lower() == "plano" and (state or "").strip().upper() == "TX":
        lines.extend(
            [
                "",
                "- [ ] **Reg Guard 2026 sync (Plano, TX):** Electrical permit **$75.00** total — **$65.00** base + **$10.00** laborer fee. Confirm on the official City of Plano fee schedule before posting.",
                "",
            ]
        )
    elif city.lower() == "dallas" and (state or "").strip().upper() == "TX":
        lines.extend(
            [
                "",
                "- [ ] **Reg Guard sync (Dallas, TX):** Minimum **trade** permit **$167.00** total including **administrative fees** (confirm on official Dallas permit / fee pages).",
                "",
            ]
        )
    elif city.lower() == "austin" and (state or "").strip().upper() == "TX":
        lines.extend(
            [
                "",
                "- [ ] **Reg Guard sync (Austin, TX):** **Permit Costs** must reflect **Development Services** fees including **Safety Surcharges** per **austintexas.gov/development-services/fees**.",
                "",
            ]
        )
    lines.extend(permit_block)
    punch_core = [
            "- [ ] **MANDATORY GOTCHA:** For each **local amendment** in the digest that is **stricter than base NEC**, add "
            "explicit `- [ ]` tasks (e.g. electrode / ground-rod local rules, **exterior disconnect labels**).",
    ]
    if city.lower() == "plano" and (state or "").strip().upper() == "TX":
        punch_core.insert(
            0,
            "- [ ] **MANDATORY GOTCHA: Plano Ordinance 250.50** — **Two 8-foot grounding rods** **20 feet** apart, **connected by 2/0 AWG** "
            "between rods (**not** **6-foot** generic NEC-spacing narrative); verify on official Plano / Municode.",
        )
        punch_core.insert(
            1,
            "- [ ] **Plano permit fee (2026 sync)** — Budget **$75.00** total (**$65.00** base + **$10.00** laborer); confirm against current City of Plano fee table.",
        )
    if city.lower() == "dallas" and (state or "").strip().upper() == "TX":
        punch_core.insert(
            0,
            "- [ ] **MANDATORY GOTCHA: Oncor coordination** — **Mandatory Oncor** scheduling / notification for **service disconnect**, **meter seal**, and **utility reconnect**; no **hot** service work without Oncor clearance per current contractor rules.",
        )
    if city.lower() == "austin" and (state or "").strip().upper() == "TX":
        punch_core.insert(
            0,
            "- [ ] **MANDATORY GOTCHA: City of Austin Design Criteria** — **36-inch** minimum clearance from **gas relief valves**; **service upgrade:** **225A** interior **panel bus** with **200A** main / **Solar-Ready** pattern per current **Design Criteria** / **Electrical Service Requirements** (verify for **78704** / **787** Austin).",
        )

    nec_200a_fallback: List[str] = []
    if scout_has_no_trusted_results(raw):
        nec_200a_fallback = [
            "- [ ] **Empty scout — use NEC 2023 baseline knowledge for 200A upgrade** (tag every bullet for AHJ adoption check):",
            "- [ ] **(NEC 2023 — verify adopted edition w/ AHJ)** Service **supply conductors** ampacity & **main OCPD** sizing for **200A** (incl. Art. 230, applicable tap/length rules).",
            "- [ ] **(NEC 2023 — verify adopted edition w/ AHJ)** **Grounding & bonding** — electrode system, GEC, N-G bond, **Art. 250**.",
            "- [ ] **(NEC 2023 — verify adopted edition w/ AHJ)** **Working space** clear in front of service/panel equipment — **110.26**.",
            "- [ ] **(NEC 2023 — verify adopted edition w/ AHJ)** **GFCI** / **AFCI** requirements for **dwelling** branch or feeder circuits where 2023 mandates.",
            "- [ ] **(NEC 2023 — verify adopted edition w/ AHJ)** Panelboard / equipment ratings, **EGC**s with feeders, neutral & EGC separation **200.4(B)**.",
            "",
        ]

    community_block: List[str] = []
    for item in community_gotchas or []:
        if not isinstance(item, dict):
            continue
        t = str(item.get("text") or "").strip()
        if not t:
            continue
        community_block.append(f"- [ ] {t} **(crowdsourced — verify with AHJ)**")
    community_header: List[str] = []
    if community_block:
        community_header = [
            "**COMMUNITY ALERT: Recent Inspector Feedback**",
            "",
            *community_block,
            "",
        ]

    bim_header: List[str] = []
    zones_list: Optional[List[Any]] = None
    if isinstance(bim_clash_report, dict):
        zraw = bim_clash_report.get("clash_zones")
        zones_list = zraw if isinstance(zraw, list) else None
        if zones_list:
            bim_header.extend(
                [
                    "**CLASH ZONES (BIM vs Universal Scout)**",
                    "",
                ]
            )
            for zone in zones_list:
                if not isinstance(zone, dict):
                    continue
                zid = zone.get("id")
                cid = zone.get("conduit_element_id")
                gid = zone.get("gas_element_id")
                d_mod = zone.get("clearance_modeled_in")
                d_req = zone.get("clearance_required_in")
                bim_header.append(
                    f"- [ ] **{zid}** — Conduit `{cid}` vs gas `{gid}` modeled **{d_mod}** in clearance vs "
                    f"**{d_req}** in (Austin gas-relief envelope) — **field-verify / reroute**."
                )
            bim_header.append("")
        scr = bim_clash_report.get("scout_cross_reference")
        if isinstance(scr, dict) and scr.get("archive_hit") and not zones_list:
            bim_header.extend(
                [
                    "**BIM — Universal Scout cross-check**",
                    "",
                    "- [ ] Reconcile modeled routes against archived `.gov` Universal Scout anchors from the BIM bridge payload.",
                    "",
                ]
            )

    lines.extend(
        [
            "### Technical Punch List",
            "",
        ]
        + community_header
        + bim_header
        + nec_200a_fallback
        + punch_core
        + [
            "- [ ] **GFCI / AFCI** — align with **adopted code + amendments** from results, not NEC alone.",
            "- [ ] **Grounding & bonding (Art. 250)** — plus any **additive local** requirements in the digest.",
            "- [ ] **Working space (110.26)** — plus **local clearance** changes if cited.",
            "- [ ] Confirm **code edition and effective dates** from AHJ / Municode links in the digest.",
            "",
            "### Inspection Must-Haves",
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


def _vision_gemini_queue_producer(
    q: Queue,
    image_bytes: bytes,
    content_type: Optional[str],
    filename: Optional[str],
    scout_summary: str,
    city: str,
    state: str,
    zip5: str,
    visual_holder: List[Any],
) -> None:
    try:
        for fragment in iter_reality_capture_audit_stream(
            image_bytes,
            content_type,
            filename,
            scout_summary=scout_summary,
            city=city,
            state=state,
            zip5=zip5,
            visual_audit_holder=visual_holder,
        ):
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


def _reasoning_sse_frame(phase: str, text: str) -> str:
    """Short status line for the UI reasoning strip (``phase``: ``scout`` | ``audit``)."""
    return _safe_sse_data_frame({"event": "reasoning", "phase": phase, "text": text})


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


@app.get("/permit-draft-calculations")
def permit_draft_calculations(job_description: str = "") -> Dict[str, Any]:
    """
    NEC Article 220 / 310 illustrative snapshot for **200 A upgrade** permit drafts.

    Drives the frontend **Permit Submittal Package** PDF section (load VA, feeder amps, copper size).
    """
    return permit_draft_calculation_response(job_description)


@app.get("/finops-cache")
def finops_cache_status() -> Dict[str, Any]:
    """
    Profit / FinOps: whether in-process Firecrawl **search** semantic cache and **markdown** scrape cache are enabled.
    Opt-out via ``REG_GUARD_SEMANTIC_SCOUT_CACHE=0`` and ``REG_GUARD_MARKDOWN_SCRAPER_CACHE=0``.
    """
    from markdown_scraper import markdown_scraper_cache_enabled
    from semantic_scout_cache import scout_cache_ttl_sec, semantic_scout_cache_enabled

    return {
        "semantic_scout_cache_enabled": semantic_scout_cache_enabled(),
        "semantic_scout_cache_ttl_sec": scout_cache_ttl_sec(),
        "markdown_scraper_cache_enabled": markdown_scraper_cache_enabled(),
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


@app.get("/roi-stats")
def roi_stats(
    manual_hours_saved: float = 0,
    failed_inspections_avoided: float = 0,
) -> Dict[str, Any]:
    """
    Unit economics snapshot: ``(manual_hours_saved * $75) + (failed_inspections_avoided * $1200)``.
    """
    mh = float(manual_hours_saved)
    fi = float(failed_inspections_avoided)
    labor = mh * _ROI_MANUAL_HOUR_USD
    inspection = fi * _ROI_FAILED_INSPECTION_USD
    total = labor + inspection
    return {
        "manual_hours_saved": mh,
        "failed_inspections_avoided": fi,
        "dollars_per_manual_hour": _ROI_MANUAL_HOUR_USD,
        "dollars_per_failed_inspection_avoided": _ROI_FAILED_INSPECTION_USD,
        "labor_savings_usd": round(labor, 2),
        "inspection_risk_savings_usd": round(inspection, 2),
        "total_savings_usd": round(total, 2),
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


@app.post("/community-gotchas")
def post_community_gotcha(
    zip_code: str = Form(..., description="5-digit U.S. ZIP for this inspector note"),
    text: str = Form(..., description="Short crowdsourced field tip for contractors in this ZIP"),
) -> Dict[str, Any]:
    """Append one crowdsourced inspector note for a ZIP (Community Scout Moat JSON store)."""
    try:
        note = append_note(zip_code, text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    z = normalize_us_zip(zip_code)
    log_api_usage(
        project_key=z,
        route="community_note_write",
        model=model_for_community_note_context(),
        meta={"action": "append"},
    )
    return {"ok": True, "zip": z, "note": note}


@app.post("/bim/import")
def bim_import(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """Ingest a Revit-style JSON export, cross-reference archived Universal Scout, and flag Austin gas/conduit clash zones."""
    try:
        return run_bim_sync_bridge(payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.get("/maintenance/subscriptions")
def maintenance_list() -> Dict[str, Any]:
    """Dashboard: list Maintenance Mode sensor-alert subscriptions for completed projects."""
    return {"subscriptions": list_subscriptions()}


@app.post("/maintenance/subscriptions")
def maintenance_create(
    project_name: str = Form(...),
    zip_code: str = Form(...),
    site_address: str = Form(""),
    sensor_profile: str = Form("thermal_vibration"),
    alert_threshold_note: str = Form(""),
    maintenance_mode_enabled: bool = Form(True),
) -> Dict[str, Any]:
    try:
        return create_subscription(
            project_name=project_name,
            zip_code=zip_code,
            site_address=site_address,
            sensor_profile=sensor_profile,
            alert_threshold_note=alert_threshold_note,
            maintenance_mode_enabled=maintenance_mode_enabled,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e


@app.patch("/maintenance/subscriptions/{subscription_id}")
def maintenance_patch(
    subscription_id: str,
    body: Dict[str, Any] = Body(...),
) -> Dict[str, Any]:
    if "maintenance_mode_enabled" not in body:
        raise HTTPException(status_code=400, detail="maintenance_mode_enabled is required")
    try:
        return set_maintenance_mode(subscription_id, bool(body["maintenance_mode_enabled"]))
    except ValueError as e:
        msg = str(e)
        code = 404 if "Unknown" in msg else 400
        raise HTTPException(status_code=code, detail=msg) from e


@app.get("/reverse-geocode-address")
def reverse_geocode_address(latitude: float, longitude: float) -> Dict[str, str]:
    """
    Server-side reverse geocode (Google Geocoding API, no HTTP Referer) for Locate Me UX.
    """
    try:
        formatted, zip5, city = google_reverse_geocode_us_latlng(latitude, longitude)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    return {"formatted_address": formatted, "zip": zip5, "city": city or ""}


@app.post("/research")
async def research(
    request: Request,
    zip_code: str = Form(
        "",
        description="5-digit ZIP from address selection (cross-check with geocode.py)",
    ),
    client_city: str = Form(
        "",
        description="Google Places locality — aligns scout queries when forward-geocode differs slightly",
    ),
    job_description: str = Form(""),
    search_limit: int = Form(5),
    site_address: str = Form(
        "",
        description="Google Places formatted_address — city/county via geocode.py",
    ),
    bim_bridge_json: str = Form(
        "",
        description="Optional JSON from POST /bim/import (RegGuard BIM bridge) — merged into digest for clash-zone routing",
    ),
    scout_trades: str = Form(
        "",
        description="Comma-separated trade toggles: electrician, plumber, hvac (Universal Scout MEP augment)",
    ),
    mission_critical_dc: str = Form(
        "false",
        description="When true, scout adds Tier III/IV redundancy + liquid-cooling containment code cues",
    ),
    scout_vertical: str = Form(
        "building",
        description="building | infrastructure | data_center — triggers FAST-41 pass when infrastructure or data_center",
    ),
    image: Optional[UploadFile] = File(None),
):
    """
    Multipart research streamed as **Server-Sent Events** (``text/event-stream``).

    The response body is an **async generator** of many ``data:`` SSE frames
    (``data: <json>\\n\\n``), including incremental ``summary_delta`` chunks, not one final string only.

    Each event's ``data`` field is one JSON object (same schema as the former NDJSON lines).

    Emits immediately to avoid proxy/client JSON timeouts, then runs Universal Scout, then **Gemini**
    Reality Capture photo audit after scout when an image is included (requires API keys).
    Streams word-sized chunks of the Contractor Action Plan.

    Events include: ``open``, ``heartbeat`` (during slow Firecrawl/vision work), ``reasoning``,
    ``vision_delta``,
    ``visual_audit`` (Gemini Reality Capture bounding boxes; requires ``GEMINI_API_KEY`` / ``GOOGLE_API_KEY`` when a photo is sent),
    ``context``, ``jurisdiction`` (when geocoded),
    ``step`` (including ``step_ahj_identification`` before Universal Scout), ``step`` (scout:
    ``step_jurisdiction``, ``step_building_permits``, ``step_building_codes``; **building** vertical adds
    ``step_residential_zoning`` (Municode / .gov / OpenGov setbacks); **infrastructure** or **data_center** adds
    ``step_federal_fast41`` and ``step_data_center_water``),
    ``future_risk_alert``, ``community_inspector_feedback`` (ZIP-indexed crowdsourced inspector notes when present),
    ``summary_delta``, ``complete``.

    Multipart fields **scout_trades** (comma list: electrician, plumber, hvac), **mission_critical_dc**, and
    **scout_vertical** (building | infrastructure | data_center) steer Universal Scout MEP augmentation and FAST-41.
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
    scout_profile_payload: Dict[str, Any] = {
        "trades": (scout_trades or "").strip(),
        "mission_critical_dc": str(mission_critical_dc or "").strip().lower() in ("1", "true", "yes", "on"),
        "vertical": (scout_vertical or "").strip() or "building",
    }

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
            cc = (client_city or "").strip()
            if cc and str(scout_jurisdiction.get("mode")) == "city":
                gc_city = str(scout_jurisdiction.get("city") or "").strip()
                if not gc_city or gc_city.lower() != cc.lower():
                    scout_jurisdiction = {**scout_jurisdiction, "city": cc}
            scout_site = profile.formatted_address or site_line

            photo_analysis: Optional[str] = None
            visual_audit_payload: Optional[Dict[str, Any]] = None

            if image_bytes and not gemini_configured():
                yield _safe_sse_data_frame(
                    {
                        "event": "error",
                        "message": (
                            "Photo audit requires GEMINI_API_KEY or GOOGLE_API_KEY on the API "
                            "(google-generativeai). Claude image analysis has been removed."
                        ),
                    }
                )
                return

            pending_photo_audit = bool(image_bytes)

            scout_enhanced_query = _build_enhanced_query(job_description, None)

            if pending_photo_audit:
                enhanced_query = None
            else:
                enhanced_query = scout_enhanced_query

            if not pending_photo_audit:
                yield _safe_sse_data_frame(
                    {
                        "event": "context",
                        "enhanced_query": enhanced_query,
                        "job_description": jd,
                        "photo_analysis": photo_analysis,
                    }
                )
                _log_research_step("context", detail="enhanced query ready for scout")
            yield _reasoning_sse_frame(
                "scout",
                "Scout — Packaging job context for jurisdiction-scoped discovery (gov & code publishers)…",
            )

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
                # Universal Scout: each query line includes ``City, ST`` / county + ``(site:gov OR site:municode.com)`` — see ``scraper.py``.
                it = iter(
                    iter_universal_scout(
                        zip_for_scout,
                        search_limit=lim,
                        enhanced_context=scout_enhanced_query,
                        site_address=scout_site,
                        jurisdiction=scout_jurisdiction,
                        ahj_identification=ahj_for_scout,
                        scout_profile=scout_profile_payload,
                    )
                )
                _seq = _scout_firecrawl_step_sequence(scout_vertical)
                _pass_total = len(_seq)
                _scout_labels: Dict[str, str] = {}
                for _i, _key in enumerate(_seq, start=1):
                    if _key == "step_jurisdiction":
                        _scout_labels[_key] = f"pass {_i}/{_pass_total} — jurisdiction & AHJ hints (Firecrawl)"
                    elif _key == "step_building_permits":
                        _scout_labels[_key] = f"pass {_i}/{_pass_total} — building permits (Firecrawl)"
                    elif _key == "step_building_codes":
                        _scout_labels[_key] = f"pass {_i}/{_pass_total} — adopted codes (Firecrawl)"
                    elif _key == "step_residential_zoning":
                        _scout_labels[_key] = (
                            f"pass {_i}/{_pass_total} — residential zoning & setbacks — Municode / .gov / OpenGov (Firecrawl)"
                        )
                    elif _key == "step_federal_fast41":
                        _scout_labels[_key] = f"pass {_i}/{_pass_total} — FAST-41 federal permitting (Firecrawl)"
                    elif _key == "step_data_center_water":
                        _scout_labels[_key] = (
                            f"pass {_i}/{_pass_total} — utility-scale cooling water / NPDES / state environmental (Firecrawl)"
                        )
                _city_label = str((scout_jurisdiction or {}).get("city") or "").strip() or "local"
                _st_scout = str((scout_jurisdiction or {}).get("state") or "").strip().upper()
                _dallas_tx = _city_label.strip().lower() == "dallas" and _st_scout == "TX"
                _scout_reasoning: Dict[str, str] = {
                    "step_jurisdiction": f"Scouting {_city_label} jurisdiction, AHJ hints, and trusted .gov anchors…",
                    "step_building_permits": f"Scouting {_city_label} Building Dept — fee schedules and permit portals…",
                    "step_building_codes": f"Cross-referencing {_city_label} adopted codes and NEC 2023 amendment deltas…",
                    "step_residential_zoning": (
                        f"Residential tier — Municode / codified setbacks and yard lines for {_city_label} "
                        f"(OpenGov portal cues where published)…"
                    ),
                    "step_federal_fast41": (
                        f"Data-center / infra tier — FAST-41 / Permitting Council federal status cues for "
                        f"{_city_label} ({scout_profile_payload.get('vertical') or 'vertical'}) scope…"
                    ),
                    "step_data_center_water": (
                        f"Data-center / infra tier — cross-referencing utility-scale cooling-water / NPDES / "
                        f"state EQ commission signals for {_city_label}…"
                    ),
                }
                if _dallas_tx:
                    _scout_reasoning["step_building_permits"] = (
                        f"Scouting {_city_label} Building Dept — permits and fees; "
                        "checking Oncor utility rules for disconnects and meter coordination…"
                    )
                yield _reasoning_sse_frame(
                    "scout",
                    "Scout — Running multi-tier Firecrawl passes (jurisdiction → permits → codes → vertical intelligence)…",
                )
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
                        rtxt = _scout_reasoning.get(key)
                        if rtxt:
                            yield _reasoning_sse_frame("scout", rtxt)
                    yield _safe_sse_data_frame(ev)
                    if ev.get("event") == "step" and str(ev.get("step") or "") in (
                        "step_jurisdiction",
                        "step_building_permits",
                        "step_building_codes",
                        "step_residential_zoning",
                        "step_federal_fast41",
                        "step_data_center_water",
                    ):
                        await asyncio.sleep(0.5)
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
            source_urls = filter_source_urls(_collect_source_urls(raw))
            try:
                save_scout_snapshot(str(raw.get("zip") or zip_for_scout), raw)
            except (ValueError, OSError) as ex:
                logger.warning("Universal Scout archive write skipped: %s", ex)
            future_risk_snapshot = future_risk_alerts_from_raw(raw)
            yield _safe_sse_data_frame({"event": "future_risk_alert", "payload": future_risk_snapshot})

            _community_notes = list_notes_for_zip(zip_for_scout)
            if _community_notes:
                yield _safe_sse_data_frame(
                    {
                        "event": "community_inspector_feedback",
                        "zip": zip_for_scout,
                        "notes": _community_notes,
                    }
                )
            log_api_usage(
                project_key=zip_for_scout,
                route="community_note_retrieval",
                model=model_for_community_note_context(),
                meta={"note_count": len(_community_notes)},
            )
            log_api_usage(
                project_key=zip_for_scout,
                route="permit_fee_scout",
                model=model_for_permit_scout_text(),
                meta={"phase": "universal_scout_complete", "has_image": bool(image_bytes)},
            )

            if image_bytes:
                content_type, filename = image_meta
                scout_text = scout_summary_for_reality_capture(raw)
                city_j = str((scout_jurisdiction or {}).get("city") or "")
                state_j = str((scout_jurisdiction or {}).get("state") or "")
                visual_holder: List[Any] = []
                q_vis: Queue = Queue()
                thread_vis = threading.Thread(
                    target=_vision_gemini_queue_producer,
                    args=(
                        q_vis,
                        image_bytes,
                        content_type,
                        filename,
                        scout_text,
                        city_j,
                        state_j,
                        zip_for_scout,
                        visual_holder,
                    ),
                    daemon=True,
                )
                _log_research_step(
                    "vision",
                    detail="Gemini Reality Capture Audit — multimodal vs scout hits",
                )
                yield _reasoning_sse_frame(
                    "audit",
                    "Reality Capture — Auditing site photo against scout hits (Gemini multimodal)…",
                )
                thread_vis.start()
                raw_vis_parts: List[str] = []
                while True:
                    kind_v: str
                    val_v: Any
                    async for pkt in _with_heartbeats(run_in_threadpool(q_vis.get)):
                        if isinstance(pkt, tuple) and pkt[0] == "__done__":
                            kind_v, val_v = pkt[1]
                            break
                        yield pkt
                    if kind_v == "delta":
                        raw_vis_parts.append(cast(str, val_v))
                        yield _safe_sse_data_frame({"event": "vision_delta", "text": cast(str, val_v)})
                    elif kind_v == "done":
                        break
                    else:
                        err_v = cast(Exception, val_v)
                        yield _safe_sse_data_frame({"event": "error", "message": str(err_v)})
                        return
                photo_analysis = normalize_vision_text("".join(raw_vis_parts))
                visual_audit_payload = visual_holder[0] if visual_holder else None
                _log_research_step("vision", detail="Gemini Reality Capture Audit — done")
                yield _safe_sse_data_frame({"event": "visual_audit", "payload": visual_audit_payload})
                enhanced_query = _build_enhanced_query(job_description, photo_analysis)
                yield _safe_sse_data_frame(
                    {
                        "event": "context",
                        "enhanced_query": enhanced_query,
                        "job_description": jd,
                        "photo_analysis": photo_analysis,
                    }
                )
                _log_research_step("context", detail="enhanced query + Reality Capture ready for digest")

            if enhanced_query is None:
                yield _safe_sse_data_frame(
                    {"event": "error", "message": "Research digest missing enhanced query context."}
                )
                return

            _log_research_step("digest", detail="building structured research digest")
            yield _reasoning_sse_frame(
                "scout",
                "Scout complete — normalizing URLs and building a structured research digest…",
            )
            bim_digest: Optional[Dict[str, Any]] = None
            bim_raw_in = (bim_bridge_json or "").strip()
            if bim_raw_in:
                try:
                    parsed_bim = json.loads(bim_raw_in)
                    if isinstance(parsed_bim, dict):
                        bim_digest = parsed_bim
                except json.JSONDecodeError:
                    logger.warning("bim_bridge_json is not valid JSON — skipping BIM digest merge")
            digest = build_research_digest(
                raw,
                source_urls,
                enhanced_query,
                future_risk=future_risk_snapshot,
                community_scout_notes=_community_notes,
                bim_clash_report=bim_digest,
            )

            summary: str
            if (os.getenv("ANTHROPIC_API_KEY") or "").strip():
                yield _reasoning_sse_frame(
                    "audit",
                    "Audit — Synthesizing contractor action plan from the digest (fees, technical gates, inspections)…",
                )
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
                        yield _reasoning_sse_frame(
                            "audit",
                            "Audit — Recovering with structured fallback memo after synthesis error…",
                        )
                        stub = _research_action_plan_fallback_markdown(
                            raw,
                            source_urls,
                            enhanced_query,
                            community_gotchas=_community_notes,
                            bim_clash_report=bim_digest,
                        )
                        logger.warning("Contractor Action Plan Claude error — using fallback: %s", err)
                        for chunk in _iter_summary_word_chunks(stub):
                            yield _safe_sse_data_frame({"event": "summary_delta", "text": chunk})
                            await asyncio.sleep(0)
                        summary = stub
                        _log_research_step("action plan", detail="fallback memo (Claude error)")
                        break
            else:
                yield _reasoning_sse_frame(
                    "audit",
                    "Audit — Building structured fallback action memo (no live synthesis key)…",
                )
                _log_research_step("action plan", detail="structured fallback memo — no ANTHROPIC_API_KEY")
                summary = _research_action_plan_fallback_markdown(
                    raw,
                    source_urls,
                    enhanced_query,
                    community_gotchas=_community_notes,
                    bim_clash_report=bim_digest,
                )
                for chunk in _iter_summary_word_chunks(summary):
                    yield _safe_sse_data_frame({"event": "summary_delta", "text": chunk})
                    await asyncio.sleep(0)

            fr_md = format_future_risk_markdown(future_risk_snapshot)
            if fr_md:
                summary = fr_md + "\n\n" + summary

            _log_research_step("complete", detail="streaming final payload to client")
            ju_complete = scout_jurisdiction or {}
            yield _safe_sse_data_frame(
                {
                    "event": "complete",
                    "zip": raw["zip"],
                    "site_address": raw.get("site_address"),
                    "city": ju_complete.get("city") or None,
                    "county": ju_complete.get("county") or None,
                    "ahj_label": ju_complete.get("label") or None,
                    "jurisdiction": raw.get("jurisdiction"),
                    "summary": summary,
                    "source_urls": source_urls,
                    "enhanced_query": enhanced_query,
                    "job_description": jd,
                    "photo_analysis": photo_analysis,
                    "visual_audit": visual_audit_payload,
                    "future_risk_alert": future_risk_snapshot,
                    "community_inspector_feedback": _community_notes,
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
