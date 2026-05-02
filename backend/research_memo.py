"""
Reg Guard — Claude text memo: Markdown Contractor Action Plan from scout payload.

Expert Brain: ``inspector_digest_directive`` + ``tagged_priority_hits`` (Plano / NEC 2023 / fees incl. 2026·$85 cues).
"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Dict, Iterator, List, Set

from anthropic import Anthropic
from dotenv import load_dotenv

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")


def _anthropic_client() -> Anthropic | None:
    key = (os.environ.get("ANTHROPIC_API_KEY") or "").strip()
    if not key:
        return None
    return Anthropic(api_key=key)


def research_model() -> str:
    return (os.environ.get("ANTHROPIC_RESEARCH_MODEL") or "claude-3-5-haiku-latest").strip()


_RE_PLANO = re.compile(r"plano", re.I)
_RE_NEC = re.compile(
    r"\bnec\b|national\s+electrical\s+code|2023\s*nec|nec\s*2023|\bnfpa\s*70\b",
    re.I,
)
_RE_FEES = re.compile(
    r"fee|fees|schedule|permit\s+cost|valuation|2026|\$85|\$45|85\.00|45\.00",
    re.I,
)


def _scout_hit_tags(title: str, url: str) -> List[str]:
    blob = f"{title} {url}"
    tags: List[str] = []
    if _RE_PLANO.search(blob):
        tags.append("plano_tx")
    if _RE_NEC.search(blob):
        tags.append("nec_2023_context")
    if _RE_FEES.search(blob):
        tags.append("permit_fees_schedule")
    return tags


def _merge_tagged_hits(
    steps_digest: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """De-dupe URLs that look relevant to Plano, NEC 2023, or permit fees (title/URL heuristics)."""
    by_url: Dict[str, Dict[str, Any]] = {}
    for block in steps_digest:
        step_key = block.get("step")
        for hit in block.get("hits") or []:
            if not isinstance(hit, dict):
                continue
            url = hit.get("url")
            if not url or not isinstance(url, str):
                continue
            title = str(hit.get("title") or "")
            tag_list = _scout_hit_tags(title, url)
            if not tag_list:
                continue
            if url not in by_url:
                by_url[url] = {
                    "url": url,
                    "title": hit.get("title"),
                    "tags": set(tag_list),
                    "scout_steps": [step_key],
                }
            else:
                bucket = by_url[url]
                bucket["tags"].update(tag_list)
                steps_l: List[Any] = bucket["scout_steps"]
                if step_key not in steps_l:
                    steps_l.append(step_key)
    out: List[Dict[str, Any]] = []
    for row in by_url.values():
        tag_set: Set[str] = row["tags"]
        row_out: Dict[str, Any] = {
            "url": row["url"],
            "title": row.get("title"),
            "tags": sorted(tag_set),
            "scout_steps": row.get("scout_steps"),
        }
        out.append(row_out)
    out.sort(key=lambda r: (len(r.get("tags") or []), str(r.get("url"))), reverse=True)
    return out


_INSPECTOR_DIGEST_DIRECTIVE: Dict[str, Any] = {
    "persona": (
        "Act as a Senior Electrical Inspector. You are writing for a licensed contractor crew preparing "
        "a field punch list—not a prose summary for homeowners."
    ),
    "logic_steps": [
        (
            "Step 1 — Extraction: Read `scout_steps[].hits` (title + URL). Prioritize rows in "
            "`tagged_priority_hits` (Plano TX, NEC / NFPA 70 / 2023 context, permit fee / 2026 / dollar amounts). "
            "Cross-check `unique_source_urls`."
        ),
        (
            "Step 2 — Synthesis: Map `enhanced_job_context` (e.g. install panel, service upgrade, feeder work) "
            "against extracted municipal + NEC-aligned hints. Where scout data is thin, state what must be verified "
            "on the official AHJ portal or site—do not invent ordinance text."
        ),
        (
            "Step 3 — Technical punch list: Output ONLY Markdown with `- [ ]` task lines under the required "
            "headings (no 'summary' blobs; short one-line context before a heading is OK)."
        ),
    ],
    "required_checklist_headings": [
        "### Permit & Fees",
        "### NEC Technicals (AFCI/GFCI/Grounding)",
        "### Inspection Prep",
    ],
    "latest_fee_intel": (
        "Contractor-facing intel: Plano and similar AHJs are often discussed as shifting permit minima—look for "
        "**2026** fee updates cited around **$85** in scout titles/URLs or municipal PDFs. When digest hits mention "
        "2026 or $85, surface those explicitly in **Permit & Fees**. Always add a `- [ ]` to **confirm the current "
        "official fee schedule** on the city's site (older figures such as $45 may be superseded)."
    ),
}


def build_research_digest(raw: Dict[str, Any], source_urls: List[str], enhanced_query: str) -> str:
    """Compact research context for the action-plan model (no full page bodies)."""
    ju = raw.get("jurisdiction")
    ju_blob: Dict[str, Any] = ju if isinstance(ju, dict) else {}

    steps_digest: List[Dict[str, Any]] = []
    for key in ("step_jurisdiction", "step_building_permits", "step_building_codes"):
        block = raw.get(key) or {}
        if not isinstance(block, dict):
            continue
        rows = []
        for item in (block.get("results") or [])[:12]:
            if not isinstance(item, dict):
                continue
            title_u = str(item.get("title") or "")
            url_u = str(item.get("url") or "")
            row: Dict[str, Any] = {
                "url": item.get("url"),
                "title": item.get("title"),
                "hint_tags": _scout_hit_tags(title_u, url_u),
            }
            rows.append(row)
        steps_digest.append({"step": key, "query": block.get("query"), "hits": rows})

    tagged_priority_hits = _merge_tagged_hits(steps_digest)

    payload = {
        "zip": raw.get("zip"),
        "site_address": raw.get("site_address"),
        "jurisdiction": ju_blob,
        "agentic_workflow": raw.get("agentic_workflow") or [],
        "scout_steps": steps_digest,
        "tagged_priority_hits": tagged_priority_hits,
        "unique_source_urls": source_urls,
        "enhanced_job_context": (enhanced_query or "").strip(),
        "inspector_digest_directive": _INSPECTOR_DIGEST_DIRECTIVE,
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def iter_contractor_action_plan_stream(system_prompt: str, user_digest: str) -> Iterator[str]:
    """Stream Markdown Contractor Action Plan from Claude."""
    client = _anthropic_client()
    if client is None:
        raise ValueError("ANTHROPIC_API_KEY is not set. Required for the Contractor Action Plan memo.")

    try:
        with client.messages.stream(
            model=research_model(),
            max_tokens=4096,
            system=system_prompt,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Read `inspector_digest_directive` and `tagged_priority_hits` first, then the rest of the JSON. "
                        "Follow persona + logic_steps. Use ONLY checklist output (`- [ ]`) under the exact headings in "
                        "`required_checklist_headings`, then add a **### Reference Links** section listing "
                        "`unique_source_urls`. "
                        "Apply `latest_fee_intel` when writing **Permit & Fees** (prioritize 2026 / $85 cues from hits "
                        "when present).\n\n"
                        f"{user_digest}"
                    ),
                }
            ],
        ) as stream:
            for text in stream.text_stream:
                if text:
                    yield text
    except Exception as err:
        raise ValueError(
            f"Claude research memo failed: {err!s}" if str(err) else "Claude research memo failed"
        ) from err
