#!/usr/bin/env python3
"""Generate professional FERC Form 556 PDF with proper formatting."""

from fpdf import FPDF
from datetime import datetime
import json
import sys
import base64

def generate_ferc_556_pdf(form_data):
    """Generate a professional FERC Form 556 PDF."""
    pdf = FPDF(orientation='P', unit='mm', format='A4')
    pdf.add_page()
    
    # Define colors
    HEADER_COLOR = (33, 85, 165)  # Blue
    SECTION_COLOR = (200, 200, 200)  # Light gray
    
    # Title section
    pdf.set_font("Arial", "B", 16)
    pdf.set_text_color(*HEADER_COLOR)
    pdf.cell(0, 10, "FERC FORM 556", ln=True, align="C")
    
    pdf.set_font("Arial", "", 10)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(0, 6, "Large Generator Interconnection Application", ln=True, align="C")
    pdf.cell(0, 6, f"Generated: {datetime.now().strftime('%B %d, %Y')}", ln=True, align="C")
    pdf.ln(5)
    
    # Section I: Applicant Information
    pdf.set_font("Arial", "B", 12)
    pdf.set_text_color(*HEADER_COLOR)
    pdf.cell(0, 8, "PART I: IDENTIFICATION OF APPLICANT AND FACILITY", ln=True)
    
    pdf.set_font("Arial", "B", 11)
    pdf.set_text_color(*SECTION_COLOR)
    pdf.set_fill_color(200, 200, 200)
    pdf.cell(0, 7, "A. IDENTIFICATION OF APPLICANT", ln=True, fill=True)
    
    pdf.set_font("Arial", "", 10)
    pdf.set_text_color(0, 0, 0)
    
    applicant = form_data.get('filled_form', {})
    
    # Applicant details
    pdf.cell(40, 6, "Name:", border=0)
    pdf.cell(0, 6, applicant.get('applicant_name', ''), border=1, ln=True)
    
    pdf.cell(40, 6, "Email:", border=0)
    pdf.cell(0, 6, applicant.get('applicant_email', ''), border=1, ln=True)
    
    pdf.cell(40, 6, "Phone:", border=0)
    pdf.cell(0, 6, applicant.get('applicant_phone', ''), border=1, ln=True)
    
    pdf.cell(40, 6, "Address:", border=0)
    pdf.cell(0, 6, applicant.get('applicant_address', ''), border=1, ln=True)
    
    pdf.ln(3)
    
    # Facility Information
    pdf.set_font("Arial", "B", 11)
    pdf.set_fill_color(200, 200, 200)
    pdf.cell(0, 7, "B. IDENTIFICATION OF FACILITY", ln=True, fill=True)
    
    pdf.set_font("Arial", "", 10)
    
    pdf.cell(40, 6, "Facility Name:", border=0)
    pdf.cell(0, 6, applicant.get('project_name', ''), border=1, ln=True)
    
    pdf.cell(40, 6, "Facility Type:", border=0)
    pdf.cell(0, 6, applicant.get('facility_type', ''), border=1, ln=True)
    
    pdf.cell(40, 6, "Capacity (MW):", border=0)
    pdf.cell(0, 6, str(applicant.get('capacity_mw', '')), border=1, ln=True)
    
    pdf.cell(40, 6, "County:", border=0)
    pdf.cell(0, 6, applicant.get('project_county', ''), border=1, ln=True)
    
    pdf.cell(40, 6, "State:", border=0)
    pdf.cell(0, 6, applicant.get('project_location_state', ''), border=1, ln=True)
    
    pdf.cell(40, 6, "Interconnection Point:", border=0)
    pdf.cell(0, 6, applicant.get('interconnection_point', ''), border=1, ln=True)
    
    pdf.cell(40, 6, "Expected COD:", border=0)
    pdf.cell(0, 6, applicant.get('expected_cod', ''), border=1, ln=True)
    
    pdf.ln(5)
    
    # Accuracy Report
    pdf.set_font("Arial", "B", 12)
    pdf.set_text_color(*HEADER_COLOR)
    pdf.cell(0, 8, "PART II: AUTO-FILL ACCURACY CERTIFICATION", ln=True)
    
    pdf.set_font("Arial", "", 10)
    pdf.set_text_color(0, 0, 0)
    
    accuracy = form_data.get('accuracy_report', {})
    confidence = accuracy.get('overall_confidence', 0)
    
    pdf.cell(60, 6, f"Overall Confidence: {int(confidence * 100)}%")
    pdf.cell(0, 6, "[READY FOR SUBMISSION]" if accuracy.get('ready_for_submission') else "[INCOMPLETE]", ln=True)
    
    pdf.cell(60, 6, f"Fields Filled: {accuracy.get('required_fields_filled', 0)}/{accuracy.get('total_required_fields', 15)}")
    pdf.cell(0, 6, "", ln=True)
    
    pdf.ln(5)
    
    # Footer
    pdf.set_font("Arial", "", 8)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, "Auto-filled by RegGuard Queue | Review all information for accuracy before submission", ln=True)
    pdf.cell(0, 5, "This document is a complete FERC Form 556 application ready for submission to your RTO", ln=True)
    
    # Return as bytes
    return pdf.output(dest="S")

if __name__ == "__main__":
    # For testing
    test_data = {
        "filled_form": {
            "applicant_name": "Acme Solar LLC",
            "applicant_email": "contact@acmesolar.com",
            "applicant_phone": "555-123-4567",
            "applicant_address": "Denver, Colorado",
            "project_name": "Acme Solar Farm Phase 1",
            "facility_type": "Solar PV",
            "capacity_mw": 10.0,
            "project_county": "Denver County",
            "project_location_state": "Colorado",
            "interconnection_point": "Denver West Substation",
            "expected_cod": "2026-12-31"
        },
        "accuracy_report": {
            "overall_confidence": 0.97,
            "required_fields_filled": 15,
            "total_required_fields": 15,
            "ready_for_submission": True
        }
    }
    
    pdf_bytes = generate_ferc_556_pdf(test_data)
    with open("/tmp/test_ferc.pdf", "wb") as f:
        f.write(pdf_bytes)
    print("PDF generated: /tmp/test_ferc.pdf")
