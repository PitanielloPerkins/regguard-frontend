"""
Data Center Intelligence Module — Conflict Intelligence Engine (federal/state permitting heuristics).

Figures are **planning estimates only**; interconnect deposits and rider tariffs vary by utility tariff filing.

Federal framing reflects **May 5, 2026**: EO **14141** rescinded — **FAST-41 Transparency Project** gates apply at **>100 MW**.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

# Legacy scrutiny states for grid-cost / rider overlays (supplemented by moratorium high-alert list).
STATE_ENERGY_SCRUTINY: Tuple[str, ...] = ("CA", "OH", "UT", "VA")

# States tracked for **High Alert** moratorium / session-risk narratives (Conflict Intelligence Engine).
STATE_MORATORIUM_HIGH_ALERT: Tuple[str, ...] = ("VA", "NY", "OK", "GA", "OH")

MORATORIUM_BOTTOM_RED_WARNING_BODY = (
    "State Moratorium Bill in session. Federal FAST-41 may conflict with local block. "
    "Consult counsel before breaking ground."
)

MORATORIUM_BOTTOM_RED_WARNING_TEXT = f"WARNING: {MORATORIUM_BOTTOM_RED_WARNING_BODY}"


def normalize_us_state(st: Optional[str]) -> str:
    return (st or "").strip().upper()[:2]


def parse_dc_scale_from_text(*blobs: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Best-effort parse of IT/load MW and capex USD from job voice context.

    Returns (megawatts_or_none, capex_usd_or_none).
    """
    blob = " ".join((b or "").strip() for b in blobs if (b or "").strip())
    if not blob:
        return None, None

    mw_val: Optional[float] = None
    m_mw = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:MW|M[wW])\b", blob)
    if not m_mw:
        m_mw = re.search(r"\b(\d+(?:\.\d+)?)\s*mega\s*watts?\b", blob, re.I)
    if m_mw:
        mw_val = float(m_mw.group(1))

    capex: Optional[float] = None

    def _grab_money_groups(pattern: str) -> Optional[float]:
        mm = re.search(pattern, blob, re.I)
        if not mm:
            return None
        raw = mm.group(1).replace(",", "")
        try:
            n = float(raw)
        except ValueError:
            return None
        suffix = (mm.group(2) or "").lower()
        if suffix.startswith("b") or "billion" in suffix:
            return n * 1_000_000_000
        if suffix.startswith("m") or "million" in suffix:
            return n * 1_000_000
        if suffix.startswith("k") or "thousand" in suffix:
            return n * 1_000
        if n >= 1_000_000:
            return n
        return None

    for pat in (
        r"\$\s*(\d+(?:\.\d+)?)\s*([BbMm])\b",
        r"\b(\d+(?:\.\d+)?)\s*(million|billion)\s+(?:USD|usd|dollars?)?",
        r"(?:USD|usd)\s*\$?\s*(\d+(?:\.\d+)?)\s*([BbMm])\b",
    ):
        got = _grab_money_groups(pat)
        if got is not None:
            capex = got
            break

    return mw_val, capex


def fast41_transparency_project_candidate(mw: Optional[float]) -> bool:
    """FAST-41 **Transparency Project** product gate: strictly **>100 MW** nameplate / IT-load hints."""
    return mw is not None and mw > 100


def federal_permitting_post_proclamation_note() -> str:
    """May 5, 2026 posture — verify against official White House / Federal Register releases."""
    return (
        "**Presidential action (May 5, 2026 — verify official text):** prior **Executive Order 14141** is **rescinded**. "
        "There is **no** EO **14141** “clean energy” acceleration mandate to cite for new filings — steer diligence to the "
        "**FAST-41 Transparency Project** track for qualifying **>100 MW** scale projects and Permitting Council transparency dashboards."
    )


def state_energy_law_cues(state: str) -> List[str]:
    """Prompt/scout anchors — not legal advice."""
    st = normalize_us_state(state)
    library: Dict[str, List[str]] = {
        "CA": [
            "CPUC rulemaking load serving entity cost allocation data center",
            "California ratepayer protection pledge utility infrastructure data center",
            "CEC electricity demand forecasts grid upgrade cost sharing hyperscale",
        ],
        "OH": [
            "Ohio 2026 ballot initiative data center moratorium greater than 25 MW ban petition",
            "Ohio utility commission rider data center economic development transmission charge",
            "Ohio ratepayer protection pledge industrial electric load data center",
        ],
        "UT": [
            "Utah PSC tariff rider large load data center transmission allocation",
            "Rocky Mountain Power rate case data center infrastructure surcharge",
        ],
        "VA": [
            "Virginia HB 1515 data center interconnection moratorium block utility study",
            "Virginia SCC rider large electric customer data center route policy act",
            "Virginia ratepayer protection data center grid upgrade cost allocation",
        ],
        "NY": [
            "New York PSC large load data center moratorium 2026 bill session interconnect queue",
            "New York ratepayer protection pledge hyperscale electric facility moratorium",
        ],
        "OK": [
            "Oklahoma legislature data center moratorium 2026 rural electric cooperative large load",
            "Oklahoma corporation commission transmission cost allocation data center",
        ],
        "GA": [
            "Georgia legislature data center moratorium 2026 PSC certificate necessity large load",
            "Georgia electric membership corporation large load data center surcharge",
        ],
    }
    return library.get(st, [])


def moratorium_high_alert_for_state(state: str) -> bool:
    return normalize_us_state(state) in STATE_MORATORIUM_HIGH_ALERT


def moratorium_state_bottom_line_alert_active(state: str, vertical: str) -> bool:
    """Red Bottom-Line banner when project sits in a tracked moratorium-jurisdiction state (data-center vertical)."""
    return (vertical or "").strip().lower() == "data_center" and moratorium_high_alert_for_state(state)


def bill_specific_conflict_notes(state: str) -> Dict[str, str]:
    """Static product flags — always verify bill status with counsel."""
    st = normalize_us_state(state)
    out: Dict[str, str] = {}
    if st == "VA":
        out["virginia_hb_1515_interconnection_block"] = (
            "**Virginia HB 1515** — monitor **interconnection / queue blocking** provisions affecting hyperscale data centers "
            "(session status and enrolled language — verify live)."
        )
    if st == "OH":
        out["ohio_2026_ballot_over_25mw_ban"] = (
            "**Ohio 2026 ballot initiative** — rumor-track / petition-phase narratives referencing **>25 MW** facility bans "
            "or moratoria — verify Ohio Secretary of State / AG summaries before reliance."
        )
    return out


def estimate_infrastructure_surcharge_band_usd(
    state: str,
    *,
    mw: Optional[float],
    capex_usd: Optional[float],
) -> Dict[str, Any]:
    """
    Illustrative **developer-paid grid reinforcement** band (deposit + uplifts), not a tariff quote.

    Uses MW proxy when present; otherwise scales lightly off capex headroom.
    """
    st = normalize_us_state(state)
    mw_eff = mw if mw is not None else 35.0
    mw_eff = max(mw_eff, 5.0)

    base_per_kw: Dict[str, float] = {
        "CA": 92.0,
        "OH": 58.0,
        "OK": 54.0,
        "NY": 88.0,
        "GA": 56.0,
        "UT": 48.0,
        "VA": 62.0,
    }
    rate = base_per_kw.get(st, 52.0)

    kw = mw_eff * 1000.0
    core = kw * rate

    scrutiny_mult = 1.28 if st in STATE_ENERGY_SCRUTINY or moratorium_high_alert_for_state(st) else 1.0
    if capex_usd is not None and capex_usd >= 250_000_000:
        scrutiny_mult *= 1.08

    low = round(core * scrutiny_mult * 0.82, -4)
    high = round(core * scrutiny_mult * 1.22, -4)

    return {
        "estimated_low_usd": int(low),
        "estimated_high_usd": int(high),
        "methodology": (
            f"Illustrative band using ~${rate:.0f}/kW reinforcement allocation proxy × **{mw_eff:.1f} MW** equivalent load "
            f"({'scrutiny / moratorium-alert uplift applied' if scrutiny_mult > 1.0 else 'baseline'}). "
            "Confirm with the serving utility **LGIA** / **interconnection study** and filed tariff riders."
        ),
        "mw_used_for_model": mw_eff,
        "state": st or None,
    }


def permit_conflict_alert(
    *,
    vertical: str,
    transparency_candidate: bool,
    state: str,
    moratorium_hit_count: int,
) -> Tuple[bool, str]:
    """
    **Permit Conflict Alert** — FAST-41 Transparency posture vs state/local friction signals.

    Returns (active, one-line rationale for memo injection).
    """
    if (vertical or "").strip().lower() != "data_center":
        return False, ""

    st = normalize_us_state(state)
    conflict = False
    reasons: List[str] = []

    if transparency_candidate and moratorium_high_alert_for_state(st):
        conflict = True
        reasons.append(
            f"{st} is on the **moratorium High Alert** list — session bills / ballot narratives may **override** federal FAST-41 assumptions."
        )

    if transparency_candidate and st in STATE_ENERGY_SCRUTINY and not moratorium_high_alert_for_state(st):
        conflict = True
        reasons.append(
            f"{st} grid-cost / ratepayer-protection proceedings can **slow or condition** upgrades despite FAST-41 transparency tracks — reconcile with counsel and the utility."
        )

    if moratorium_hit_count > 0:
        conflict = True
        reasons.append(
            "Local **2026 moratorium / pause** signals appeared in scout hits — federal FAST-41 transparency does **not** waive township zoning moratoria or water permits."
        )

    if not conflict:
        return False, ""

    return True, " ".join(reasons)


def build_digest_intel_block(
    *,
    vertical: str,
    job_description: str,
    enhanced_query: str,
    state: str,
    moratorium_hit_count: int,
) -> Dict[str, Any]:
    """Structured JSON merged into ``build_research_digest`` for Claude + fallback memos."""
    vert = (vertical or "").strip().lower()
    out: Dict[str, Any] = {"vertical": vert}
    if vert != "data_center":
        return out

    mw, capex = parse_dc_scale_from_text(job_description, enhanced_query)
    transparency = fast41_transparency_project_candidate(mw)
    sur = estimate_infrastructure_surcharge_band_usd(state, mw=mw, capex_usd=capex)
    alert_on, alert_rationale = permit_conflict_alert(
        vertical=vert,
        transparency_candidate=transparency,
        state=state,
        moratorium_hit_count=moratorium_hit_count,
    )
    moratorium_red = moratorium_state_bottom_line_alert_active(state, vert)

    out.update(
        {
            "federal_permitting_may_2026_note": federal_permitting_post_proclamation_note(),
            "parsed_it_load_mw": mw,
            "parsed_capex_usd": capex,
            "fast41_transparency_project_candidate": transparency,
            "fast41_threshold_notes": (
                "**FAST-41 Transparency Project** product gate: parsed job context **>100 MW** hints — "
                "confirm classification with federal counsel and the Permitting Council transparency artifacts."
            ),
            "state_moratorium_high_alert_states": list(STATE_MORATORIUM_HIGH_ALERT),
            "project_state_moratorium_high_alert": moratorium_high_alert_for_state(state),
            "bill_specific_flags": bill_specific_conflict_notes(state),
            "moratorium_state_bottom_line_red_alert": moratorium_red,
            "moratorium_state_bottom_line_warning_text": MORATORIUM_BOTTOM_RED_WARNING_TEXT,
            "ratepayer_protection_and_state_energy_laws": {
                "emphasis_states": list(dict.fromkeys([*STATE_ENERGY_SCRUTINY, *STATE_MORATORIUM_HIGH_ALERT])),
                "project_state": normalize_us_state(state) or None,
                "scout_instruction": (
                    "Cross-check `step_dc_state_energy` hits for **ratepayer protection pledges**, "
                    "**transmission rider** proceedings, PSC/PUC **cost-allocation** dockets, **Virginia HB 1515**, and "
                    "**Ohio 2026 ballot** (>25 MW ban) chatter."
                ),
            },
            "infrastructure_surcharge_estimate_usd": sur,
            "local_moratorium_scout_hits_count": moratorium_hit_count,
            "data_center_permit_conflict_alert": alert_on,
            "data_center_permit_conflict_rationale": alert_rationale,
        }
    )
    return out


def inject_bottom_line_permit_conflict(summary_md: str, *, alert_on: bool, rationale: str) -> str:
    """Append a Bottom Line conflict warning when heuristic fires (idempotent). Memo ends with The Bottom Line."""
    if not alert_on or not (rationale or "").strip():
        return summary_md or ""
    text = summary_md or ""
    if re.search(r"(?i)PERMIT\s+CONFLICT\s+ALERT", text):
        return text
    rationale_clean = " ".join(rationale.split())
    extra = (
        f"**PERMIT CONFLICT ALERT:** {rationale_clean} Treat federal FAST-41 transparency posture and local/state grid rules as **parallel tracks** "
        "until counsel and the utility sign off."
    )
    if not re.search(r"(?im)^#{2,3}\s*the\s+bottom\s+line\b", text):
        return text.rstrip() + "\n\n### The Bottom Line\n\n" + extra + "\n"
    return text.rstrip() + "\n\n" + extra + "\n"


def inject_bottom_line_moratorium_state_red_alert(summary_md: str, *, active: bool, warning_text: str) -> str:
    """Append fixed WARNING line for Moratorium High Alert states (idempotent)."""
    if not active or not (warning_text or "").strip():
        return summary_md or ""
    text = summary_md or ""
    if "WARNING: State Moratorium Bill in session." in text:
        return text
    extra = f"**WARNING:** {MORATORIUM_BOTTOM_RED_WARNING_BODY}"
    if not re.search(r"(?im)^#{2,3}\s*the\s+bottom\s+line\b", text):
        return text.rstrip() + "\n\n### The Bottom Line\n\n" + extra + "\n"
    return text.rstrip() + "\n\n" + extra + "\n"


def sanitize_visual_audit_for_client(audit: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Strip internal FinOps fields (e.g. sub-cent Gemini estimates) before SSE/API clients."""
    if audit is None or not isinstance(audit, dict):
        return audit
    cleaned = {k: v for k, v in audit.items() if k not in ("cost_usd", "input_tokens", "output_tokens")}
    return cleaned
