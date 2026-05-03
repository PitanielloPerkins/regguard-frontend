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


def scout_has_no_trusted_results(raw: Dict[str, Any]) -> bool:
    """True when all three Universal Scout steps have zero ``results`` rows (no SERP hits in batch)."""
    for key in ("step_jurisdiction", "step_building_permits", "step_building_codes"):
        block = raw.get(key)
        if isinstance(block, dict) and (block.get("results") or []):
            return False
    return True


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

    is_plano_tx = city.lower() == "plano" and (state or "").strip().upper() in ("TX",)
    is_dallas_tx = city.lower() == "dallas" and (state or "").strip().upper() in ("TX",)
    empty_scout = scout_has_no_trusted_results(raw)

    consultant_role = (
        f"Act as a Master Electrician for **{loc_focus}** (the specific city or county for this job). "
        "Output ONLY a technical punch list using Markdown checkboxes (`- [ ] `). "
        "Ignore results from other U.S. states (e.g. Washington) or unrelated jurisdictions unless the text is clearly generic NEC with no locality claims."
    )
    if is_plano_tx:
        consultant_role += (
            " For **Plano, Texas**, use only **City of Plano** **.gov** and **Municode** hits in this digest when stating local rules; "
            f"anchor tasks to {addr} and Plano, TX."
        )
    if empty_scout:
        consultant_role += (
            " **Empty scout:** there are no trusted `.gov` / Municode rows in this digest—complete **Technical Punch List** "
            "and **Inspection Must-Haves** using **NEC 2023** model knowledge for a **200A** service/panel upgrade, "
            "with each relevant `- [ ]` line noting verification of adopted edition with the AHJ."
        )

    if city and state:
        consultant_role += (
            f" Universal Scout included explicit discovery phrases **{city}, {state} official building permit fees 2026** "
            f"and **{city}, {state} NEC 2023 amendments** — weight matching `.gov` / Municode hits accordingly."
        )
    elif county_disp and state:
        consultant_role += (
            f" Universal Scout included explicit discovery phrases **{county_disp}, {state} official building permit fees 2026** "
            f"and **{county_disp}, {state} NEC 2023 amendments** — weight matching `.gov` / Municode hits accordingly."
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

    if is_plano_tx:
        gotchas_guidance = (
            "**MANDATORY — Plano Ordinance 250.50:** Under **Technical Punch List**, include **MANDATORY GOTCHA: "
            "Plano Ordinance 250.50** with `- [ ]` tasks requiring **two 8-foot ground rods** installed with **20 feet** "
            "separation between rods (Plano **local** amendment — **not** the typical **6-foot** NEC minimum-spacing narrative "
            "some crews assume). Cross-check wording on current Plano codified ordinance / Municode when reconciling.\n"
            "Identify other **City of Plano** local amendments that **differ from** or **add to** the adopted NEC only when "
            "the digest text supports them."
        )
    else:
        gotchas_guidance = (
            "Where local amendments **tighten** or **modify** the base NEC, call that out under **Technical Punch List** "
            "using **MANDATORY GOTCHA:** plus `- [ ]` tasks—only when the digest supports it."
        )

    logic_steps: List[Any] = (
        [
            (
                "Step 1 — Extraction: Use only scout hits whose URLs are **.gov** or **Municode** and that clearly apply "
                f"to **{loc_focus}** (and {addr}). Prefer `tagged_priority_hits`. Discard other states or unrelated cities."
            ),
            (
                "Step 2 — Synthesis: Map `enhanced_job_context` to **permit costs**, **NEC vs local amendment deltas**, "
                "and inspection expectations **only** as stated in results—unless `empty_scout_nec_2023_fallback` is true "
                "in the digest JSON, in which case treat **NEC 2023** training knowledge as allowed for **200A** technical "
                "and inspection tasks (with AHJ-verify tagging), not for inventing local fees."
            ),
            (
                "Step 3 — Output: Under **Permit Costs**, **Technical Punch List** (apply `gotchas_guidance` here), and "
                "**Inspection Must-Haves**, use **only** `- [ ] ` lines. No narrative paragraphs."
            ),
        ]
        if empty_scout
        else [
            (
                "Step 1 — Extraction: Use only scout hits whose URLs are **.gov** or **Municode** and that clearly apply "
                f"to **{loc_focus}** (and {addr}). Prefer `tagged_priority_hits`. Discard other states or unrelated cities."
            ),
            (
                "Step 2 — Synthesis: Map `enhanced_job_context` to **permit costs**, **NEC vs local amendment deltas**, "
                "and inspection expectations **only** as stated in results."
            ),
            (
                "Step 3 — Output: Under **Permit Costs**, **Technical Punch List** (apply `gotchas_guidance` here), and "
                "**Inspection Must-Haves**, use **only** `- [ ] ` lines. No narrative paragraphs."
            ),
        ]
    )

    fee_extra = ""
    if is_plano_tx:
        fee_extra = " For Plano, prioritize **Plano building fee schedule** language found in the digest."
    elif is_dallas_tx:
        fee_extra = (
            " **Reg Guard sync (Dallas, TX):** Minimum **trade** permit total is **$167.00** including **administrative fees** "
            "(floor for planning—confirm on official Dallas permit / fee pages)."
        )
    else:
        fee_extra = " Base technical items on the NEC/adoption language in the digest."

    return {
        "consultant_role": consultant_role,
        "logic_steps": logic_steps,
        "required_checklist_headings": [
            "### Permit Costs",
            "### Technical Punch List",
            "### Inspection Must-Haves",
        ],
        "output_format": (
            "Technical punch list only: every actionable line is `- [ ] ` (Markdown checkbox + space) under the headings in "
            "`required_checklist_headings`, in order. Optional single-line **MANDATORY GOTCHA:** immediately before related "
            "checkboxes. Then **### Reference Links** for `unique_source_urls`."
        ),
        "gotchas_guidance": gotchas_guidance,
        "fee_and_code_guidance": (
            "Identify **specific permit fees** and **fee schedules** (e.g. 2026 updates when present in results) "
            "and **local NEC adoptions** only when explicitly stated for this jurisdiction. "
            + fee_verify_exact
            + fee_extra
        ),
    }


def build_research_digest(raw: Dict[str, Any], source_urls: List[str], enhanced_query: str) -> str:
    """Compact research context for the action-plan model (no full page bodies)."""
    ju = raw.get("jurisdiction")
    ju_blob: Dict[str, Any] = ju if isinstance(ju, dict) else {}
    city_guess = str(ju_blob.get("city") or "").strip()
    state_guess = str(ju_blob.get("state") or ju_blob.get("state_short") or "").strip()
    county_guess = str(ju_blob.get("county") or "").strip()

    universal_expert_scout_targets: Dict[str, str] = {}
    if city_guess and state_guess:
        universal_expert_scout_targets["official_building_permit_fees_2026"] = (
            f"{city_guess}, {state_guess} official building permit fees 2026"
        )
        universal_expert_scout_targets["nec_2023_amendments"] = f"{city_guess}, {state_guess} NEC 2023 amendments"
    elif county_guess and state_guess:
        cdn = (
            f"{county_guess} County"
            if county_guess and not county_guess.lower().endswith("county")
            else county_guess
        )
        universal_expert_scout_targets["official_building_permit_fees_2026"] = (
            f"{cdn}, {state_guess} official building permit fees 2026"
        )
        universal_expert_scout_targets["nec_2023_amendments"] = f"{cdn}, {state_guess} NEC 2023 amendments"

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

    payload: Dict[str, Any] = {
        "zip": raw.get("zip"),
        "site_address": raw.get("site_address"),
        "jurisdiction": ju_blob,
        "agentic_workflow": raw.get("agentic_workflow") or [],
        "scout_steps": steps_digest,
        "tagged_priority_hits": tagged_priority_hits,
        "unique_source_urls": source_urls,
        "enhanced_job_context": (enhanced_query or "").strip(),
        "universal_expert_scout_targets": universal_expert_scout_targets,
        "inspector_digest_directive": _build_inspector_digest_directive(raw),
    }
    if scout_has_no_trusted_results(raw):
        payload["empty_scout_nec_2023_fallback"] = True
    if city_guess.lower() == "dallas" and (state_guess or "").strip().upper() in ("TX",):
        payload["dallas_minimum_trade_permit_usd"] = 167.0
        payload["dallas_minimum_trade_permit_note"] = (
            "Reg Guard sync: Dallas, TX minimum trade permit $167.00 including administrative fees (confirm on official city pages)."
        )
    if city_guess.lower() == "plano" and (state_guess or "").strip().upper() in ("TX",):
        payload["plano_ord_250_50_requirement"] = (
            "HARD REQUIREMENT (Plano, TX): Under **Technical Punch List**, include **MANDATORY GOTCHA: Plano Ordinance 250.50** "
            "with `- [ ]` tasks for **two 8-foot ground rods** at **20 feet** separation between rods (Plano ordinance — "
            "**not** the **6-foot** rod-spacing assumption from generic NEC discussion)."
        )
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
                        "`gotchas_guidance`, `output_format`), then `plano_ord_250_50_requirement`, "
                        "`dallas_minimum_trade_permit_usd` / `dallas_minimum_trade_permit_note`, and "
                        "`empty_scout_nec_2023_fallback` if present, then "
                        "`tagged_priority_hits` and the rest of the JSON. "
                        "Follow the role and logic steps; obey `output_format` and `gotchas_guidance`. "
                        "When `plano_ord_250_50_requirement` is set, you MUST satisfy it under **Technical Punch List**. "
                        "When `empty_scout_nec_2023_fallback` is true, apply the system prompt: fill Technical + Inspection "
                        "using NEC 2023 training knowledge for 200A scope. "
                        "When Dallas fee fields are set, include the $167.00 floor in **Permit Costs**. "
                        "Use ONLY checklist lines (`- [ ] `) under the headings in `required_checklist_headings`, "
                        "then add **### Reference Links** listing `unique_source_urls`. "
                        "Apply `fee_and_code_guidance` in **Permit Costs**.\n\n"
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
