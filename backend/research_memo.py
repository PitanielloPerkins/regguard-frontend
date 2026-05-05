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
from typing import Any, Dict, Iterator, List, Optional, Set

from anthropic import Anthropic
from dotenv import load_dotenv

from scraper import future_risk_alerts_from_raw

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")

# Hard-coded field sync — Dallas / Plano fee floors (intentional product constants).
REG_GUARD_DALLAS_MIN_TRADE_PERMIT_TOTAL_USD: float = 167.0
REG_GUARD_PLANO_ELECTRICAL_PERMIT_TOTAL_USD: float = 75.0

# City of Austin — Development Services fee page (safety surcharges, permit calculators).
REG_GUARD_AUSTIN_DEVELOPMENT_SERVICES_FEES_URL: str = "https://www.austintexas.gov/development-services/fees"


def is_out_of_jurisdiction_reference_noise(url: str) -> bool:
    """Drop obvious SERP noise (other Texas jurisdictions / agencies) from reference lists and digest rows."""
    u = (url or "").strip().lower()
    if not u:
        return False
    if "tdcj" in u:
        return True
    if "cityofhumble" in u or "humbletx" in u:
        return True
    if "humble" in u and ("texas.gov" in u or ".tx.us" in u or "humblecity" in u):
        return True
    return False


def filter_source_urls(urls: List[str]) -> List[str]:
    return [u for u in urls if u and not is_out_of_jurisdiction_reference_noise(u)]


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
    for key in ("step_jurisdiction", "step_building_permits", "step_building_codes", "step_federal_fast41"):
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
    is_austin_tx = city.lower() == "austin" and (state or "").strip().upper() in ("TX",)
    zip_project = str(raw.get("zip") or ju.get("zip") or "").strip()
    empty_scout = scout_has_no_trusted_results(raw)
    _pf_amt = f"${REG_GUARD_PLANO_ELECTRICAL_PERMIT_TOTAL_USD:.2f}"
    _df_amt = f"${REG_GUARD_DALLAS_MIN_TRADE_PERMIT_TOTAL_USD:.2f}"

    consultant_role = (
        f"Act as a Master Electrician for **{loc_focus}** (the specific city or county for this job). "
        "Output ONLY a technical punch list using Markdown checkboxes (`- [ ] `). "
        "Ignore results from other U.S. states (e.g. Washington) or unrelated jurisdictions unless the text is clearly generic NEC with no locality claims."
    )
    if is_plano_tx:
        consultant_role += (
            " For **Plano, Texas**, use only **City of Plano** **.gov** and **Municode** hits in this digest when stating local rules; "
            f"anchor tasks to {addr} and Plano, TX."
            f" **2026 data fence:** cite **{_pf_amt}** total electrical permit (**$65.00** base + **$10.00** laborer) from the official fee table "
            "and **Ordinance 250.50**: **two 8-foot grounding rods** **20 feet** apart **connected by 2/0 AWG** between rods (**not** **6-foot** NEC-spacing narrative)."
        )
    if is_austin_tx:
        ztxt = f" **ZIP {zip_project}**" if zip_project else ""
        consultant_role += (
            " For **Austin, Texas** service upgrades (including **78704** and broader **787** Austin ZIPs), apply **City of Austin Design Criteria** "
            "and **Electrical Service Requirements** — not generic NEC-only narratives for clearances or bus/main sizing."
            f"{ztxt}: treat as **Austin AHJ** scope for **Design Criteria** punch-list items."
        )
    if empty_scout:
        consultant_role += (
            " **Empty scout:** there are no trusted `.gov` / Municode rows in this digest—complete **Technical Punch List** "
            "and **Inspection Must-Haves** using **NEC 2023** model knowledge for a **200A** service/panel upgrade, "
            "with each relevant `- [ ]` line noting verification of adopted edition with the AHJ."
        )

    sp = raw.get("scout_profile") if isinstance(raw.get("scout_profile"), dict) else {}
    trades_list = [str(t).strip().lower() for t in (sp.get("trades") or []) if str(t).strip()]
    vert_sp = str(sp.get("vertical") or "").strip().lower()
    mc_sp = bool(sp.get("mission_critical_dc"))
    if trades_list:
        consultant_role += (
            f" **Universal Scout trades toggled:** {', '.join(trades_list)} — extend the punch list for each selected trade "
            "(IPC/UPC plumbing, IMC / energy code / Manual J-class HVAC evidence, NEC electrical) using only trusted `.gov` / Municode rows in this digest for locality claims."
        )
    if mc_sp:
        consultant_role += (
            " **Mission-critical data center scout:** add checklist items for **Tier III/IV redundancy** themes, **concurrent maintainability**, "
            "and **liquid cooling / containment** (CDU, data-hall mechanical-electrical interfaces) when sources in the digest support them."
        )
    if vert_sp in ("data_center", "infrastructure"):
        consultant_role += (
            " **Project vertical (data center / infrastructure):** if `step_federal_fast41` hits reference **FAST-41** or **Title 41 Permitting Council**, "
            "include federal permitting coordination `- [ ]` tasks; otherwise note counsel / program verification."
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
            "Plano Ordinance 250.50** with `- [ ]` tasks requiring **two 8-foot grounding rods** spaced **20 feet** apart, "
            "**connected by a 2/0 AWG conductor** between rods (Plano **local** rule — **not** the typical **6-foot** NEC minimum-spacing narrative "
            "some crews assume). Cross-check wording on current Plano codified ordinance / Municode when reconciling.\n"
            f"**Permit Costs — Plano:** include an explicit `- [ ]` line stating **{_pf_amt}** total (**$65.00** base + **$10.00** laborer) "
            "per **Reg Guard 2026 sync**, with AHJ confirmation on the official fee schedule.\n"
            "Identify other **City of Plano** local amendments that **differ from** or **add to** the adopted NEC only when "
            "the digest text supports them."
        )
    elif is_dallas_tx:
        gotchas_guidance = (
            "**MANDATORY — Dallas / Oncor:** Under **Technical Punch List**, include **MANDATORY GOTCHA: Oncor coordination** "
            "with `- [ ]` tasks requiring **mandatory Oncor notification / coordination** before **service disconnect**, **meter seal**, "
            "or **utility-side** work; confirm current Oncor contractor rules and scheduled outage / reconnect steps.\n"
            f"**Permit Costs — Dallas:** include an explicit `- [ ]` line for the **{_df_amt}** total minimum **trade** permit "
            "(incl. **administrative fees**) per **Reg Guard sync**, with confirmation on official Dallas permit / fee pages."
        )
    elif is_austin_tx:
        gotchas_guidance = (
            "**MANDATORY — Austin Design Criteria:** Under **### Technical Punch List**, include **MANDATORY GOTCHA: City of Austin Design Criteria** "
            "with `- [ ]` tasks that **must** cover:\n"
            "- **Gas relief clearance:** **36-inch** minimum clearance from **gas relief valves** (and associated gas-meter / relief appurtenances) per **Austin** "
            "**Design Criteria** — field-verify against current adopted language.\n"
            "- **Solar-ready / bus (service upgrades):** for typical **200A** class **service upgrades** in **Austin** (incl. **78704**), plan **225A** interior **panel bus** "
            "with **200A** main / **OCPD** where **Solar-Ready** / **Design Criteria** require it—confirm ratings against current **Electrical Service Requirements**.\n"
            f"**Permit Costs — Austin:** itemize **Development Services** permit fees and explicitly add line items for **Safety Surcharges** per the official page "
            f"**{REG_GUARD_AUSTIN_DEVELOPMENT_SERVICES_FEES_URL}** (Reg Guard sync — do not use other Texas cities’ fee tables)."
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
    if is_plano_tx:
        logic_steps.insert(
            2,
            (
                "Step 2b — **Technical Punch List (Plano Ordinance 250.50):** Under **### Technical Punch List**, you MUST emit "
                "**MANDATORY GOTCHA: Plano Ordinance 250.50** with `- [ ]` tasks for **two 8-foot grounding rods** spaced "
                "**20 feet** apart **connected by 2/0 AWG** between rods (Plano **local**; **not** generic **6-foot** NEC rod-spacing narrative). "
                "Verify codified wording on official Plano / Municode."
            ),
        )
    if is_austin_tx:
        logic_steps.insert(
            2,
            (
                "Step 2b — **Technical Punch List (Austin Design Criteria):** Under **### Technical Punch List**, emit **MANDATORY GOTCHA: City of Austin Design Criteria** "
                "with `- [ ]` tasks for **36-inch** clearance at **gas relief valves** and for **service upgrades** the **225A** bus / **200A** main "
                "**Solar-Ready** pattern where Austin requires it (confirm **78704** / **787** projects against current **Design Criteria**)."
            ),
        )

    fee_extra = ""
    if is_plano_tx:
        fee_extra = (
            f" **Reg Guard 2026 sync (Plano, TX):** Electrical permit **{_pf_amt}** total (**$65.00** base + **$10.00** laborer) — "
            "confirm on the official City of Plano fee schedule. Tie to **Ordinance 250.50** (**20-foot** rod spacing, **2/0 AWG** between rods)."
        )
    elif is_dallas_tx:
        fee_extra = (
            f" **Reg Guard sync (Dallas, TX):** Minimum **trade** permit **{_df_amt}** total including **administrative fees** "
            "(confirm on official Dallas permit / fee pages). **Oncor** utility coordination is **mandatory** for **disconnects** / meter work."
        )
    elif is_austin_tx:
        fee_extra = (
            f" **Reg Guard sync (Austin, TX):** Under **Permit Costs**, use **City of Austin Development Services** fee documentation, including **Safety Surcharges** at "
            f"**{REG_GUARD_AUSTIN_DEVELOPMENT_SERVICES_FEES_URL}** — confirm calculator outputs against the posted schedule."
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


def build_research_digest(
    raw: Dict[str, Any],
    source_urls: List[str],
    enhanced_query: str,
    *,
    future_risk: Optional[Dict[str, Any]] = None,
    community_scout_notes: Optional[List[Dict[str, Any]]] = None,
    bim_clash_report: Optional[Dict[str, Any]] = None,
) -> str:
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
    for key in ("step_jurisdiction", "step_building_permits", "step_building_codes", "step_federal_fast41"):
        if key == "step_federal_fast41" and key not in raw:
            continue
        block = raw.get(key) or {}
        if not isinstance(block, dict):
            continue
        rows = []
        for item in (block.get("results") or [])[:12]:
            if not isinstance(item, dict):
                continue
            title_u = str(item.get("title") or "")
            url_u = str(item.get("url") or "")
            if is_out_of_jurisdiction_reference_noise(url_u):
                continue
            row: Dict[str, Any] = {
                "url": item.get("url"),
                "title": item.get("title"),
                "hint_tags": _scout_hit_tags(title_u, url_u, city_guess, state_guess, county_guess),
            }
            rows.append(row)
        steps_digest.append({"step": key, "query": block.get("query"), "hits": rows})

    tagged_priority_hits = _merge_tagged_hits(steps_digest)

    fr = future_risk if future_risk is not None else future_risk_alerts_from_raw(raw)

    directive = dict(_build_inspector_digest_directive(raw))
    if fr.get("active"):
        directive["future_risk_watchdog"] = (
            "The digest includes `future_code_change_watchdog` with active=true. Open the Contractor Action Plan with "
            'a prominent "### FUTURE RISK ALERT" section citing watchdog URLs and NEC-edition signals before routine '
            "permit fee narrative."
        )

    comm_raw = community_scout_notes if community_scout_notes else []
    comm: List[Dict[str, Any]] = []
    for item in comm_raw:
        if not isinstance(item, dict):
            continue
        t = str(item.get("text") or "").strip()
        if not t:
            continue
        comm.append(
            {
                "text": t,
                "created_at": str(item.get("created_at") or ""),
            }
        )
    z_display = str(raw.get("zip") or "").strip()
    if comm:
        directive["community_inspector_moat"] = (
            "HARD REQUIREMENT: Under **### Technical Punch List**, immediately after that heading, on its own line output "
            "exactly: **COMMUNITY ALERT: Recent Inspector Feedback** then one `- [ ]` line per object in "
            "`community_scout_inspector_notes`, quoting the **text** and suffixing each line with **(crowdsourced — verify with AHJ)**. "
            "These are field-reported tips for this ZIP"
            + (f" (**{z_display}**)" if z_display else "")
            + ", not codified law—do not imply they are ordinance."
        )

    bim_payload: Dict[str, Any] = {}
    if isinstance(bim_clash_report, dict):
        cz = bim_clash_report.get("clash_zones")
        scr = bim_clash_report.get("scout_cross_reference")
        if isinstance(cz, list) and cz:
            directive["bim_clash_zone_moat"] = (
                "HARD REQUIREMENT: Under **### Technical Punch List**, after any **COMMUNITY ALERT** block (if present), "
                "emit **CLASH ZONES (BIM vs Universal Scout)** as its own bold line, then one `- [ ]` line per object in "
                "`bim_clash_zones` citing conduit vs gas element ids, modeled clearance vs **36-inch** Austin Design Criteria "
                "(gas relief / meter envelope), and explicit **field-verify / reroute** language. Treat values as model heuristics."
            )
            bim_payload["bim_clash_zones"] = cz
        if isinstance(scr, dict):
            bim_payload["bim_scout_cross_reference"] = scr
        bz = str(bim_clash_report.get("zip") or "").strip()
        if bz:
            bim_payload["bim_bridge_zip"] = bz
        if isinstance(scr, dict) and scr.get("archive_hit") and not (isinstance(cz, list) and cz):
            directive["bim_integration_crossref"] = (
                "The digest includes `bim_scout_cross_reference` from the BIM export. Add one `- [ ]` under **### Technical Punch List** "
                "to reconcile the federated model against the archived **Universal Scout** `.gov` anchors (cross-reference block) "
                "before finalizing conduit routing."
            )

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
        "future_code_change_watchdog": fr,
        "inspector_digest_directive": directive,
        "community_scout_inspector_notes": comm,
    }
    payload.update(bim_payload)
    if scout_has_no_trusted_results(raw):
        payload["empty_scout_nec_2023_fallback"] = True
    if city_guess.lower() == "dallas" and (state_guess or "").strip().upper() in ("TX",):
        payload["dallas_minimum_trade_permit_usd"] = REG_GUARD_DALLAS_MIN_TRADE_PERMIT_TOTAL_USD
        df = f"${REG_GUARD_DALLAS_MIN_TRADE_PERMIT_TOTAL_USD:.2f}"
        payload["dallas_minimum_trade_permit_note"] = (
            f"Reg Guard sync: Dallas, TX minimum **trade** permit **{df}** total including administrative fees (confirm on official city pages)."
        )
        payload["dallas_oncor_disconnect_coordination"] = (
            "HARD REQUIREMENT (Dallas, TX): Include **MANDATORY GOTCHA: Oncor coordination** under **Technical Punch List** — "
            "**mandatory Oncor** notification and coordination for **service disconnect**, **meter**, and **utility-side** sequences "
            "before energizing or cutting service."
        )
    if city_guess.lower() == "plano" and (state_guess or "").strip().upper() in ("TX",):
        payload["plano_electrical_permit_fee_sync_usd"] = REG_GUARD_PLANO_ELECTRICAL_PERMIT_TOTAL_USD
        pf = f"${REG_GUARD_PLANO_ELECTRICAL_PERMIT_TOTAL_USD:.2f}"
        payload["plano_electrical_permit_fee_2026_note"] = (
            f"Reg Guard 2026 data fence: City of Plano electrical permit **{pf}** total — **$65.00** base permit + **$10.00** laborer fee. "
            "Confirm on the official City of Plano fee schedule."
        )
        payload["plano_ord_250_50_requirement"] = (
            "HARD REQUIREMENT (Plano, TX): Under **### Technical Punch List**, include **MANDATORY GOTCHA: Plano Ordinance 250.50** "
            "with `- [ ]` tasks for **two 8-foot grounding rods** **20 feet** apart **connected by 2/0 AWG** between rods (**not** **6-foot** "
            f"rod-spacing from generic NEC narrative). Under **Permit Costs**, state the **{pf}** sync fee line."
        )
    if city_guess.lower() == "austin" and (state_guess or "").strip().upper() in ("TX",):
        z = str(raw.get("zip") or ju_blob.get("zip") or "").strip()
        payload["austin_design_criteria_requirement"] = (
            "HARD REQUIREMENT (Austin, TX): Under **### Technical Punch List**, **MANDATORY GOTCHA: City of Austin Design Criteria** — "
            "(1) **36-inch** minimum clearance from **gas relief valves**; (2) **service upgrades:** **225A** interior **panel bus** with **200A** main / **Solar-Ready** "
            "pattern where Austin **Design Criteria** / **Electrical Service Requirements** apply (verify for **78704** and other **787** Austin ZIPs)."
        )
        payload["austin_development_services_fees_url"] = REG_GUARD_AUSTIN_DEVELOPMENT_SERVICES_FEES_URL
        payload["austin_safety_surcharge_note"] = (
            "Reg Guard sync: In **Permit Costs**, include **Safety Surcharges** and permit line items from City of Austin **Development Services** fees at "
            f"{REG_GUARD_AUSTIN_DEVELOPMENT_SERVICES_FEES_URL}."
        )
        if z == "78704" or (len(z) == 5 and z.startswith("787")):
            payload["austin_central_zip_service_upgrade"] = True
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
                        "`gotchas_guidance`, `output_format`, `community_inspector_moat`, `bim_clash_zone_moat`, and `bim_integration_crossref` if present), then `plano_ord_250_50_requirement`, "
                        "`plano_electrical_permit_fee_sync_usd` / `plano_electrical_permit_fee_2026_note`, "
                        "`dallas_minimum_trade_permit_usd` / `dallas_minimum_trade_permit_note`, `dallas_oncor_disconnect_coordination`, "
                        "`austin_design_criteria_requirement`, `austin_development_services_fees_url`, `austin_safety_surcharge_note`, "
                        "`austin_central_zip_service_upgrade`, "
                        "and `empty_scout_nec_2023_fallback` if present, then "
                        "`community_scout_inspector_notes` (when non-empty you MUST satisfy `community_inspector_moat` under **### Technical Punch List**), "
                        "`bim_clash_zones` / `bim_scout_cross_reference` when present (satisfy `bim_clash_zone_moat` and/or `bim_integration_crossref`), "
                        "`tagged_priority_hits` and the rest of the JSON. "
                        "Follow the role and logic steps; obey `output_format` and `gotchas_guidance`. "
                        f"When `plano_ord_250_50_requirement` is set, you MUST satisfy it under **### Technical Punch List** "
                        f"and include the **${REG_GUARD_PLANO_ELECTRICAL_PERMIT_TOTAL_USD:.2f}** permit-cost line from `plano_electrical_permit_fee_2026_note`. "
                        "When `empty_scout_nec_2023_fallback` is true, apply the system prompt: fill Technical + Inspection "
                        "using NEC 2023 training knowledge for 200A scope. "
                        f"When Dallas fee fields are set, include the **${REG_GUARD_DALLAS_MIN_TRADE_PERMIT_TOTAL_USD:.2f}** floor in **Permit Costs**. "
                        "When `dallas_oncor_disconnect_coordination` is set, include **Oncor coordination** gotchas under **Technical Punch List**. "
                        "When `austin_design_criteria_requirement` is set, satisfy **Design Criteria** gotchas (gas relief **36-inch**, **225A**/ **200A** **Solar-Ready** bus pattern) under **### Technical Punch List**, "
                        "and apply `austin_safety_surcharge_note` / `austin_development_services_fees_url` in **Permit Costs**. "
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
