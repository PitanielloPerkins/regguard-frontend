"""
Reg Guard — Dallas Building Inspection–style permit application worksheet (PDF).

Maps research context (address, scope, fees, trade) into a structured intake document.
For **722 Munger Ave**, adds **setback**, **May 2025 parking reform**, **Oncor**, and **BDA / zoning** notices.
All Dallas worksheets include the **USD $167.00** base building permit planning line (2026 Reg Guard sync).
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Dict

from fpdf import FPDF

from calculations import permit_draft_calculation_response

# Long action-plan excerpts slow regex in ``permit_draft_calculation_response`` — cap input for the NEC snapshot only.
_CALC_SCOPE_CHAR_MAX = 8192


def _trade_is_hvac_mechanical(trade: str) -> bool:
    t = (trade or "").lower()
    return "hvac" in t or "mechanical" in t


def _ascii_pdf_text(s: str) -> str:
    """fpdf core fonts are latin-1; strip/replace characters NEC strings may contain."""
    if not s:
        return ""
    t = (
        s.replace("\u2014", "-")
        .replace("\u2013", "-")
        .replace("\u2212", "-")
        .replace("\u00b0", " deg ")
        .replace("\u2019", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
    )
    return t.encode("latin-1", errors="replace").decode("latin-1")


class _DallasPermitPdf(FPDF):
    def footer(self) -> None:  # type: ignore[override]
        self.set_y(-14)
        self.set_font("Helvetica", "I", 7.5)
        self.set_text_color(75, 78, 85)
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        self.cell(
            0,
            8,
            f"Page {self.page_no()}/{{nb}} - Reg Guard - Dallas permit worksheet - {ts}",
            align="C",
        )


def is_722_munger_ave(site_address: str) -> bool:
    """Site-specific notices for 722 Munger Ave, Dallas (Deep Ellum / downtown edge)."""
    s = (site_address or "").lower()
    if "munger" not in s:
        return False
    return bool(re.search(r"\b722\b", s))


def build_permit_package_pdf(
    *,
    site_address: str,
    scope: str,
    fee_summary: str,
    trade: str,
    zip_code: str = "",
    city: str = "",
    county: str = "",
    ahj_label: str = "",
) -> bytes:
    jd = (scope or "").strip()
    jd_calc = jd if len(jd) <= _CALC_SCOPE_CHAR_MAX else jd[:_CALC_SCOPE_CHAR_MAX]
    calc: Dict[str, Any] = permit_draft_calculation_response(jd_calc)
    a220: Dict[str, Any] = calc["article_220"]
    a310: Dict[str, Any] = calc["article_310"]

    pdf = _DallasPermitPdf()
    pdf.alias_nb_pages()
    pdf.set_auto_page_break(auto=True, margin=16)
    pdf.set_margins(14, 14, 14)
    pdf.add_page()
    col_w = pdf.epw

    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(13, 27, 42)
    pdf.multi_cell(col_w, 7, "City of Dallas, Texas")
    pdf.set_font("Helvetica", "B", 11)
    pdf.multi_cell(col_w, 6, "Building Inspection Department - Permit application worksheet")
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(55, 60, 70)
    pdf.multi_cell(
        col_w,
        4,
        "Reg Guard intake format aligned with common Dallas permit application data fields. "
        "Official filing, e-plan uploads, contractor registration, and payment remain on City systems.",
    )
    pdf.ln(1)
    pdf.set_text_color(33, 38, 48)

    addr = (site_address or "").strip() or "_______________________________"
    loc_bits = [x for x in [city.strip() if city else "", county.strip() if county else ""] if x]
    loc_suffix = ", ".join(loc_bits)
    zip_part = f"ZIP {zip_code.strip()}" if (zip_code or "").strip() else ""

    # I. Property
    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(col_w, 5, "I. PROPERTY / JOB SITE")
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(col_w, 5, _ascii_pdf_text(f"Address: {addr}"))
    line2 = " | ".join(p for p in [loc_suffix, zip_part] if p)
    pdf.multi_cell(
        col_w,
        5,
        _ascii_pdf_text(line2 or "City / County / ZIP: _________________________________________"),
    )
    pdf.ln(1)

    # II. Scope
    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(col_w, 5, "II. DESCRIPTION OF WORK (scope)")
    pdf.set_font("Helvetica", "", 9)
    body = jd or "(no scope text provided)"
    pdf.multi_cell(col_w, 5, _ascii_pdf_text(body[:12_000]))
    pdf.ln(1)

    # III. Trade
    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(col_w, 5, "III. PERMIT TYPE / PRIMARY TRADE")
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(col_w, 5, _ascii_pdf_text((trade or "_________________________________________").strip()))
    pdf.ln(1)

    # IV. Fees — Dallas base permit sync (2026) always printed for this worksheet template
    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(col_w, 5, "IV. PERMIT FEES (planning figures - confirm with AHJ)")
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(
        col_w,
        5,
        _ascii_pdf_text(
            "City of Dallas base building permit (Reg Guard 2026 planning sync): USD $167.00. "
            "This is the standard minimum trade permit bundle including administrative fees used in Reg Guard runbooks; "
            "confirm line items, tiers, and surcharges on the official City of Dallas Development Services / "
            "Building Inspection fee schedule before posting payment."
        ),
    )
    if (fee_summary or "").strip():
        pdf.multi_cell(col_w, 5, _ascii_pdf_text(fee_summary.strip()))
    if _trade_is_hvac_mechanical(trade):
        pdf.multi_cell(
            col_w,
            5,
            _ascii_pdf_text(
                "HVAC / mechanical (Dallas): confirm mechanical trade permit, plan review, and IMC-related "
                "fee line items on the official City of Dallas Development Services fee schedule. Reg Guard "
                "still anchors to the USD $167.00 trade-permit planning floor until the AHJ itemizes mechanical adders."
            ),
        )
    pdf.ln(1)

    # V. AHJ
    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(col_w, 5, "V. AUTHORITY HAVING JURISDICTION")
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(
        col_w,
        5,
        _ascii_pdf_text(
            (ahj_label or "City of Dallas Building Inspection - verify current subdivision / inspection area").strip(),
        ),
    )
    pdf.ln(2)

    if is_722_munger_ave(site_address):
        pdf.set_font("Helvetica", "B", 10)
        pdf.set_text_color(120, 55, 15)
        pdf.multi_cell(col_w, 6, "722 MUNGER AVE INTELLIGENCE - DALLAS, TX (REG GUARD)")
        pdf.set_text_color(33, 38, 48)
        pdf.ln(0.5)

        pdf.set_font("Helvetica", "B", 9)
        pdf.multi_cell(col_w, 5, "Setback alert (rear yard / BDA variance risk)")
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(
            col_w,
            5,
            _ascii_pdf_text(
                "ALERT: A 3 ft rear setback likely fails the more typical 5 ft rear-yard building line "
                "expectation for many Dallas residential-style lots (verify exact zoning district, Form District, "
                "and adopted yard tables). If the improvement does not comply, a Board of Adjustment (BDA) variance "
                "or other zoning relief may be required before a certificate of occupancy or final release."
            ),
        )
        pdf.ln(1)

        pdf.set_font("Helvetica", "B", 9)
        pdf.multi_cell(col_w, 5, "Parking reform victory (May 2025) - small projects / ADU")
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(
            col_w,
            5,
            _ascii_pdf_text(
                "Parking reform victory (May 2025): Dallas reforms exempt many small projects from legacy stall minima — "
                "developments with 20 dwelling units or fewer (including typical ADU scenarios) generally have no minimum "
                "off-street parking. Confirm applicability against zoning, PD overlays, and TIF/overlay conditions with "
                "Dallas Planning before omitting stalls on cover sheets."
            ),
        )
        pdf.ln(1)

        pdf.set_font("Helvetica", "B", 9)
        pdf.multi_cell(col_w, 5, "Oncor Electric Delivery - coordination required")
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(
            col_w,
            5,
            "WARNING: Before any service disconnect, meter seal release, temporary service, "
            "service upgrade, or line-side work, coordinate with Oncor Electric Delivery. "
            "A Dallas building permit does not replace Oncor clearance or field scheduling. "
            "Uncoordinated utility work can delay inspection, metering, or energization.",
        )
        pdf.ln(1)

        pdf.set_font("Helvetica", "B", 9)
        pdf.multi_cell(col_w, 5, "Land use / zoning clearance")
        pdf.set_font("Helvetica", "", 9)
        pdf.multi_cell(
            col_w,
            5,
            _ascii_pdf_text(
                "Use standards, PD overlays, and neighborhood-specific walk-overs can still require administrative "
                "or Board of Adjustment relief even when building permits issue; integrate Planning review with "
                "Building Inspection milestones."
            ),
        )
        pdf.ln(2)

    pdf.set_font("Helvetica", "B", 10)
    pdf.multi_cell(col_w, 5, "VI. ELECTRICAL PLANNING MEMO (Reg Guard NEC snapshot)")
    pdf.set_font("Helvetica", "I", 8)
    pdf.multi_cell(col_w, 4, _ascii_pdf_text(str(calc.get("nec_edition_note", ""))))
    pdf.set_font("Helvetica", "", 9)
    pdf.multi_cell(
        col_w,
        5,
        f"Total calculated VA: {a220['total_calculated_va']} | Feeder @ 240 V: {a220['feeder_amps_at_240v']} A | "
        f"Main frame (planning): {a220['main_breaker_frame_a']} A",
    )
    cond = str(a310.get("selected_conductor_display", ""))
    tab = str(a310.get("table_ref", ""))
    pdf.multi_cell(col_w, 5, _ascii_pdf_text(f"Service conductors (planning): {cond} ({tab})"))
    pdf.ln(1)
    pdf.set_font("Helvetica", "I", 7.5)
    pdf.set_text_color(70, 74, 82)
    pdf.multi_cell(col_w, 4, _ascii_pdf_text(str(calc.get("disclaimer", ""))))

    raw = pdf.output(dest="S")
    if isinstance(raw, bytearray):
        return bytes(raw)
    if isinstance(raw, bytes):
        return raw
    return str(raw).encode("latin-1", errors="replace")
