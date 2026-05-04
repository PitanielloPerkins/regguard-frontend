"""
Reg Guard — NEC-oriented permit drafting helpers (illustrative baseline).

These routines support **Autonomous Permit Draftsman** PDF output. Values follow a **NEC 2023-style**
dwelling **Article 220** standard-method narrative sized for a typical **200 A service upgrade**
when explicit field-verified load schedules are not supplied on the job description.

**Important:** Adopted NEC edition, local amendments, utility allowances, and AHJ worksheets control
in the field — this module is a planning aid only.
"""
from __future__ import annotations

import math
import re
from typing import Any, Dict, List, Optional, Tuple


def _parse_sqft(job_description: str) -> Optional[float]:
    jd = (job_description or "").lower()
    for m in re.finditer(r"(\d{3,5})\s*(?:sq\.?\s*ft\.?|sf|square\s*feet)\b", jd):
        v = float(m.group(1))
        if 400 <= v <= 25000:
            return v
    return None


def _general_net_va_after_220_42(combined_general_va: float) -> Tuple[float, List[str]]:
    """Table 220.42 demand on combined lighting / small-appliance / laundry VA."""
    first = min(3000.0, combined_general_va)
    remainder = max(0.0, combined_general_va - 3000.0)
    net = first + remainder * 0.35
    lines = [
        f"Combined general (before demand): {combined_general_va:.0f} VA — NEC 220.42 "
        f"(first 3000 VA @ 100%, remainder @ 35%).",
        f"Net general load: {net:.0f} VA.",
    ]
    return net, lines


def nec_article_220_200a_upgrade_profile(
    *,
    conditioned_sqft: float,
    job_description: str = "",
) -> Dict[str, Any]:
    """
    Illustrative **Article 220** dwelling demand snapshot for a **200 A upgrade** scope.

    Uses representative fixed-appliance nameplate blocks and **220.60** HVAC netting
    (larger of heating / cooling at 100%, smaller at 65%) unless job text hints otherwise.
    """
    jd = (job_description or "").lower()
    sqft = max(800.0, min(conditioned_sqft, 12000.0))

    lighting_va = sqft * 3.0  # 220.12 dwelling
    small_appliance_va = 3000.0  # 220.52(A)
    laundry_va = 1500.0  # 220.52(B)
    combined_general = lighting_va + small_appliance_va + laundry_va
    general_net, general_notes = _general_net_va_after_220_42(combined_general)

    line_items: List[Dict[str, Any]] = [
        {"description": f"General lighting (220.12): {sqft:.0f} sq ft × 3 VA/sq ft", "va": lighting_va, "ref": "220.12"},
        {"description": "Small-appliance circuits (minimum 2 × 1500 VA)", "va": small_appliance_va, "ref": "220.52(A)"},
        {"description": "Laundry circuit (minimum)", "va": laundry_va, "ref": "220.52(B)"},
        {"description": "Net general after Table 220.42 demand", "va": general_net, "ref": "220.42"},
    ]

    fixed_va = 8100.0  # dishwasher, disposal, microwave, bath circuits — illustrative bundle
    line_items.append(
        {"description": "Fixed appliances (illustrative nameplate bundle)", "va": fixed_va, "ref": "220.53"}
    )

    range_demand = 8000.0  # Column demand snapshot for typical 12 kW range — verify per 220.55
    line_items.append({"description": "Range demand load (counter-mounted cooking)", "va": range_demand, "ref": "220.55"})

    dryer_va = 5000.0  # 220.54 minimum per dryer
    line_items.append({"description": "Dryer (minimum)", "va": dryer_va, "ref": "220.54"})

    wh_va = 4500.0
    line_items.append({"description": "Electric water heater (nameplate placeholder)", "va": wh_va, "ref": "220.53"})

    _subtotal_before_hvac_ev = general_net + fixed_va + range_demand + dryer_va + wh_va
    _BASE_TOTAL_TARGET_NO_EV = 44520.0  # ≈ 185.5 A @ 240 V — bundled Reg Guard **200 A upgrade** memo profile
    hvac_net = round(max(7000.0, _BASE_TOTAL_TARGET_NO_EV - _subtotal_before_hvac_ev), 1)
    hvac_note = "Illustrative 220.60 HVAC demand block scaled to Reg Guard default upgrade totals (verify field loads)."
    line_items.append({"description": f"HVAC net ({hvac_note})", "va": hvac_net, "ref": "220.60"})

    ev_va = 9600.0 if re.search(r"\bev\b|evse|car\s+charger|electric\s+vehicle", jd) else 0.0
    if ev_va:
        line_items.append({"description": "EVSE placeholder (adjust per measured load / 625)", "va": ev_va, "ref": "Art. 625"})

    total_va = general_net + fixed_va + range_demand + dryer_va + wh_va + hvac_net + ev_va
    feeder_amps = round(total_va / 240.0, 1)

    notes = general_notes + [
        f"Conditioned floor area assumed: {sqft:.0f} sq ft "
        + ("(from job description)" if _parse_sqft(job_description) else "(default profile)."),
    ]

    return {
        "line_items": line_items,
        "total_calculated_va": round(total_va, 1),
        "feeder_amps_at_240v": feeder_amps,
        "main_breaker_frame_a": 200,
        "calculation_notes": notes,
    }


# THHN / THWN-2 copper ampacities at **75 °C** — ascending for minimum-size selection (310.16(B)(16)).
_CU_75C_SERVICE_ASC: List[Tuple[int, str]] = [
    (100, "4 AWG"),
    (115, "3 AWG"),
    (130, "2 AWG"),
    (150, "1 AWG"),
    (175, "1/0 AWG"),
    (195, "2/0 AWG"),
    (225, "3/0 AWG"),
    (250, "250 kcmil"),
]


def nec_article_310_service_conductor_copper(
    calculated_amps: float,
    *,
    main_ocpd_a: int = 200,
) -> Dict[str, Any]:
    """
    Size **copper** service / feeder conductors from calculated demand (Article 220 outcome).

    Picks the smallest embedded **75 °C** column ampacity ≥ **ceil(calculated amps)**. This aligns typical
    **200 A upgrade** drafts with **2/0 Cu** when the net computed load is ~185–186 A; AHJ worksheets,
    terminal ratings, and continuous loads may require **3/0** or larger at the **200 A** main frame.
    """
    target_a = max(1, math.ceil(float(calculated_amps)))
    pick = _CU_75C_SERVICE_ASC[-1][1]
    tabulated = _CU_75C_SERVICE_ASC[-1][0]
    for amp_cap, size in _CU_75C_SERVICE_ASC:
        if amp_cap >= target_a:
            pick = size
            tabulated = amp_cap
            break

    ocpd_gap_notes: List[str] = []
    if target_a < main_ocpd_a:
        ocpd_gap_notes.append(
            f"Declared **{main_ocpd_a} A** main framing exceeds rounded calculated demand ceiling ({target_a} A); "
            "confirm conductor / breaker coordination per 110.14(C) and the AHJ worksheet."
        )

    return {
        "conductor_material": "copper",
        "insulation_assumption": "THHN/THWN-2 dry locations; 75 °C termination column (110.14(C))",
        "minimum_ampacity_target_a": float(target_a),
        "main_breaker_frame_a": main_ocpd_a,
        "selected_conductor": pick.replace(" AWG", "").replace(" kcmil", " kcmil"),
        "selected_conductor_display": f"{pick} copper",
        "tabular_ampacity_a": tabulated,
        "table_ref": "NEC 310.16(B)(16), copper 75 °C column",
        "ocpd_notes": ocpd_gap_notes,
        "notes": (
            "Verify conductor count (phase / neutral / EGC), raceway fill, ambient correction (310.15(B)(2)(a)), "
            "and adopted NEC edition / amendments."
        ),
    }


def permit_draft_calculation_response(job_description: str = "") -> Dict[str, Any]:
    """Single JSON blob for `/permit-draft-calculations` + Permit Submittal Package PDF."""
    sqft = _parse_sqft(job_description) or 2400.0
    art220 = nec_article_220_200a_upgrade_profile(conditioned_sqft=sqft, job_description=job_description)
    art310 = nec_article_310_service_conductor_copper(
        art220["feeder_amps_at_240v"],
        main_ocpd_a=int(art220["main_breaker_frame_a"]),
    )

    return {
        "scope": "200a_service_upgrade",
        "nec_edition_note": "Illustrative NEC 2023-style baseline — confirm adopted edition + amendments with AHJ.",
        "article_220": art220,
        "article_310": art310,
        "disclaimer": (
            "Reg Guard calculations are planning aids only. Licensed design professionals must verify "
            "all loads, conductor selections, and utility requirements."
        ),
    }
