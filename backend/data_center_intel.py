"""
Data Center Intelligence Module — Federal/state permitting heuristics and illustrative grid-cost modeling.

Figures are **planning estimates only**; interconnect deposits and rider tariffs vary by utility tariff filing.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

# States emphasized for ratepayer-protection / state-energy-policy overlays vs FAST-41 federal streamlining narrative.
STATE_ENERGY_SCRUTINY: Tuple[str, ...] = ("CA", "OH", "UT", "VA")


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

    # $500M, $500 million, USD 500M
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


def fast41_streamlining_candidate(mw: Optional[float], capex_usd: Optional[float]) -> bool:
    """FAST-41 / Title 41 scale heuristic: >100 MW IT load **or** ≥ $500M capex."""
    if mw is not None and mw > 100:
        return True
    if capex_usd is not None and capex_usd >= 500_000_000:
        return True
    return False


def executive_order_14141_summary() -> str:
    """Short product-facing compliance cue (verify against current Federal Register text)."""
    return (
        "**Executive Order 14141** (July 2025 — verify date/citation on Federal Register): federal acceleration priority "
        "for qualifying **AI/data-center infrastructure**; pair with **FAST-41** Permitting Council coordination where applicable."
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
            "Ohio utility commission rider data center economic development transmission charge",
            "Ohio ratepayer protection pledge industrial electric load data center",
        ],
        "UT": [
            "Utah PSC tariff rider large load data center transmission allocation",
            "Rocky Mountain Power rate case data center infrastructure surcharge",
        ],
        "VA": [
            "Virginia SCC rider large electric customer data center route policy act",
            "Virginia ratepayer protection data center grid upgrade cost allocation",
        ],
    }
    return library.get(st, [])


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

    # Planning $/kW of hypothetical reinforcement allocation (order-of-magnitude for executive dashboards).
    base_per_kw: Dict[str, float] = {
        "CA": 92.0,
        "OH": 58.0,
        "UT": 48.0,
        "VA": 62.0,
    }
    rate = base_per_kw.get(st, 52.0)

    kw = mw_eff * 1000.0
    core = kw * rate

    scrutiny_mult = 1.28 if st in STATE_ENERGY_SCRUTINY else 1.0
    if capex_usd is not None and capex_usd >= 250_000_000:
        scrutiny_mult *= 1.08

    low = round(core * scrutiny_mult * 0.82, -4)
    high = round(core * scrutiny_mult * 1.22, -4)

    return {
        "estimated_low_usd": int(low),
        "estimated_high_usd": int(high),
        "methodology": (
            f"Illustrative band using ~${rate:.0f}/kW reinforcement allocation proxy × **{mw_eff:.1f} MW** equivalent load "
            f"({'scrutiny-state uplift applied' if st in STATE_ENERGY_SCRUTINY else 'baseline'}). "
            "Confirm with the serving utility **LGIA** / **interconnection study** and filed tariff riders."
        ),
        "mw_used_for_model": mw_eff,
        "state": st or None,
    }


def permit_conflict_alert(
    *,
    vertical: str,
    fast41_candidate: bool,
    state: str,
    moratorium_hit_count: int,
) -> Tuple[bool, str]:
    """
    **Permit Conflict Alert** — federal streamlining narrative vs state/local friction signals.

    Returns (active, one-line rationale for memo injection).
    """
    if (vertical or "").strip().lower() != "data_center":
        return False, ""

    st = normalize_us_state(state)
    conflict = False
    reasons: List[str] = []

    if fast41_candidate and st in STATE_ENERGY_SCRUTINY:
        conflict = True
        reasons.append(
            f"{st} grid-cost / ratepayer-protection politics can **slow or condition** upgrades despite FAST-41 federal coordination — reconcile early with counsel and the utility."
        )

    if moratorium_hit_count > 0:
        conflict = True
        reasons.append(
            "Local **2026 moratorium / pause** signals appeared in scout hits — federal acceleration does **not** waive township zoning moratoria or water permits."
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
    cand = fast41_streamlining_candidate(mw, capex)
    sur = estimate_infrastructure_surcharge_band_usd(state, mw=mw, capex_usd=capex)
    alert_on, alert_rationale = permit_conflict_alert(
        vertical=vert,
        fast41_candidate=cand,
        state=state,
        moratorium_hit_count=moratorium_hit_count,
    )

    out.update(
        {
            "executive_order_14141_product_note": executive_order_14141_summary(),
            "parsed_it_load_mw": mw,
            "parsed_capex_usd": capex,
            "fast41_streamlining_scale_candidate": cand,
            "fast41_threshold_notes": (
                "FAST-41 / Permitting Council **cover project** scale heuristic used here: **>100 MW** IT/load-equivalent **or** "
                "**≥ $500M** capex — confirm eligibility with federal counsel and the project dashboard."
            ),
            "ratepayer_protection_and_state_energy_laws": {
                "emphasis_states": list(STATE_ENERGY_SCRUTINY),
                "project_state": normalize_us_state(state) or None,
                "scout_instruction": (
                    "Cross-check `step_dc_state_energy` hits for **ratepayer protection pledges**, "
                    "**transmission rider** proceedings, and PSC/PUC **cost-allocation** dockets."
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
        f"**PERMIT CONFLICT ALERT:** {rationale_clean} Treat federal streamlining and local/state grid rules as **parallel tracks** "
        "until counsel and the utility sign off."
    )
    if not re.search(r"(?im)^#{2,3}\s*the\s+bottom\s+line\b", text):
        return text.rstrip() + "\n\n### The Bottom Line\n\n" + extra + "\n"
    return text.rstrip() + "\n\n" + extra + "\n"
