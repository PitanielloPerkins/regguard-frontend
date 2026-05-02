"""
Reg Guard — Claude text memo: Markdown Contractor Action Plan from scout payload.

Digest drives a **universal** Master Electrician consultant scope from ``site_address`` / ``jurisdiction``;
tagged hits highlight local NEC/fee signals—not a single city.
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


_RE_NEC = re.compile(
    r"\bnec\b|national\s+electrical\s+code|20\d{2}\s*nec|nec\s*20\d{2}|\bnfpa\s*70\b|code\s+adoption",
    re.I,
)
_RE_FEES = re.compile(
    r"fee|fees|schedule|permit\s+cost|valuation|building\s+department|electrical\s+permit|plan\s+review",
    re.I,
)


def _norm_key(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def _scout_hit_tags(
    title: str,
    url: str,
    city: str,
    state: str,
    county: str,
) -> List[str]:
    blob = _norm_key(f"{title} {url}")
    tags: List[str] = []
    c = _norm_key(city)
    if c and len(c) > 1 and c in blob:
        tags.append("project_city_in_hit")
    st = (state or "").strip().lower()
    if st and len(st) == 2 and re.search(rf"(?:^|[^\w]){re.escape(st)}(?:$|[^\w])", blob):
        tags.append("project_state_in_hit")
    co = _norm_key(county).replace(" county", "")
    if co and len(co) > 1 and co in blob:
        tags.append("project_county_in_hit")
    if _RE_NEC.search(f"{title} {url}"):
        tags.append("nec_code_in_hit")
    if _RE_FEES.search(f"{title} {url}"):
        tags.append("permit_fees_in_hit")
    return tags


def _merge_tagged_hits(
    steps_digest: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """De-dupe URLs whose titles/URLs look tied to this jurisdiction, NEC, or permit fees."""
    by_url: Dict[str, Dict[str, Any]] = {}
    for block in steps_digest:
        step_key = block.get("step")
        for hit in block.get("hits") or []:
            if not isinstance(hit, dict):
                continue
            url = hit.get("url")
            if not url or not isinstance(url, str):
                continue
            tag_list = hit.get("hint_tags")
            if not isinstance(tag_list, list) or not tag_list:
                continue
            tag_strs = [t for t in tag_list if isinstance(t, str)]
            if not tag_strs:
                continue
            if url not in by_url:
                by_url[url] = {
                    "url": url,
                    "title": hit.get("title"),
                    "tags": set(tag_strs),
                    "scout_steps": [step_key],
                }
            else:
                bucket = by_url[url]
                bucket["tags"].update(tag_strs)
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


def _build_inspector_digest_directive(raw: Dict[str, Any]) -> Dict[str, Any]:
    ju = raw.get("jurisdiction") if isinstance(raw.get("jurisdiction"), dict) else {}
    city = str(ju.get("city") or "").strip()
    state = str(ju.get("state") or ju.get("state_short") or "").strip()
    addr = str(raw.get("site_address") or ju.get("formatted_address") or "").strip()
    if not addr:
        addr = "the project address in this digest"

    county = str(ju.get("county") or "").strip()
    mode = str(ju.get("mode") or "").strip().lower()

    county_disp = ""
    if (mode == "county" or (not city and county)) and county:
        county_disp = f"{county} County" if county and not county.lower().endswith("county") else county
        loc_focus = f"{county_disp}, {state}".strip().strip(",") if state else county_disp
    elif city and state:
        loc_focus = f"{city}, {state}"
    else:
        loc_focus = ", ".join(p for p in (city, county, state) if p)
        if not loc_focus:
            loc_focus = "this jurisdiction (see `jurisdiction` and `site_address` in this digest)"

    consultant_role = (
        f"Act as a Master Electrician for {loc_focus}. "
        "Discard any data not explicitly from **that** jurisdiction's official **.gov** site or from **Municode** "
        "for this locality. If a search result is from another U.S. state or an unrelated city/county, "
        "ignore it completely. "
        f"Use only material credibly tied to {addr} and {loc_focus}."
    )

    if city:
        fee_verify_exact = (
            f'If no specific fee is found in the search results, include a `- [ ]` line exactly: '
            f"Verify exact fee with {city} Building Department."
        )
    elif county_disp:
        fee_verify_exact = (
            f'If no specific fee is found in the search results, include a `- [ ]` line exactly: '
            f"Verify exact fee with {county_disp} Building Department or county development services."
        )
    else:
        fee_verify_exact = (
            "If no specific fee is found in the search results, include a `- [ ]` line: "
            "Verify exact fee with the local Building Department / AHJ named in this digest."
        )

    return {
        "consultant_role": consultant_role,
        "logic_steps": [
            (
                "Step 1 — Extraction: Use only scout hits whose URLs are **.gov** or **Municode** and that clearly apply "
                f"to **{loc_focus}** (and {addr}). Prefer `tagged_priority_hits` that reference this locality. "
                "If another state or unrelated jurisdiction appears, ignore it entirely."
            ),
            (
                "Step 2 — Synthesis: Map `enhanced_job_context` to permit fees, adopted codes (e.g. NEC edition), "
                "and inspection expectations **only as stated in the provided search results**—do not invent amounts "
                "or ordinance text."
            ),
            (
                "Step 3 — Technical punch list: Output **only** Markdown lines beginning with `- [ ] ` (checkbox + space); "
                "no numbered essay format, no long narrative blocks."
            ),
        ],
        "required_checklist_headings": [
            "### Permit & Fees",
            "### NEC Technicals (AFCI/GFCI/Grounding)",
            "### Inspection Prep",
        ],
        "output_format": (
            "Strict technical punch list: every actionable line must be `- [ ] ` followed by the task. "
            "Optional one-line context immediately **before** a `###` heading is allowed."
        ),
        "fee_and_code_guidance": (
            "Identify specific **permit fees** and **local code adoptions** (e.g. which NEC edition applies) **only** "
            "when explicitly mentioned in the search results for this project. "
            + fee_verify_exact
            + " Base technical checklist items on the adopted NEC cycle **if** the results specify it; otherwise add "
            "checkboxes to confirm with the AHJ."
        ),
    }


def build_research_digest(raw: Dict[str, Any], source_urls: List[str], enhanced_query: str) -> str:
    """Compact research context for the action-plan model (no full page bodies)."""
    ju = raw.get("jurisdiction")
    ju_blob: Dict[str, Any] = ju if isinstance(ju, dict) else {}
    city_guess = str(ju_blob.get("city") or "").strip()
    state_guess = str(ju_blob.get("state") or ju_blob.get("state_short") or "").strip()
    county_guess = str(ju_blob.get("county") or "").strip()

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
                "hint_tags": _scout_hit_tags(title_u, url_u, city_guess, state_guess, county_guess),
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
        "inspector_digest_directive": _build_inspector_digest_directive(raw),
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
                        "Read `inspector_digest_directive` first (`consultant_role`, `logic_steps`, `fee_and_code_guidance`, "
                        "`output_format`), then `tagged_priority_hits` and the rest of the JSON. Follow the role and logic "
                        "steps; obey `output_format`. "
                        "Use ONLY checklist lines (`- [ ] `) under the headings in `required_checklist_headings`, "
                        "then add **### Reference Links** listing `unique_source_urls`. "
                        "Apply `fee_and_code_guidance` in **Permit & Fees**.\n\n"
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
