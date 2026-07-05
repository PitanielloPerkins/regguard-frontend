"""
PDF generation for auto-filled interconnection forms.

Creates professional, downloadable PDF forms that can be submitted to RTOs.
Supports both direct PDF generation and filling official FERC form templates.
"""

from io import BytesIO
from typing import Dict, Any, Optional
from datetime import datetime
from fpdf import FPDF
import requests
import os

# Try to import PyPDF for form filling
try:
    from PyPDF2 import PdfReader, PdfWriter
    HAS_PYPDF = True
except ImportError:
    HAS_PYPDF = False


class InterconnectionFormPDF:
    """Generate professional PDF forms for interconnection applications."""

    def __init__(self, form_type: str):
        self.form_type = form_type
        self.pdf = FPDF()
        self.pdf.add_page()
        self.pdf.set_font("Arial", size=10)

    def add_header(self, title: str, form_number: Optional[str] = None):
        """Add header to form."""
        self.pdf.set_font("Arial", "B", 14)
        self.pdf.cell(0, 10, title, ln=True, align="C")

        if form_number:
            self.pdf.set_font("Arial", "", 9)
            self.pdf.cell(
                0, 5, f"Form: {form_number}", ln=True, align="R"
            )
            self.pdf.cell(0, 5, f"Generated: {datetime.now().strftime('%Y-%m-%d')}", ln=True, align="R")

        self.pdf.ln(5)

    def add_section(self, section_title: str):
        """Add a section header."""
        self.pdf.set_font("Arial", "B", 11)
        self.pdf.set_fill_color(200, 200, 200)
        self.pdf.cell(0, 8, section_title, ln=True, fill=True)
        self.pdf.set_font("Arial", "", 10)

    def add_field(self, label: str, value: Any, width: int = 100):
        """Add a field to the form."""
        self.pdf.set_font("Arial", "B", 9)
        self.pdf.cell(width, 7, f"{label}:", border=1)

        self.pdf.set_font("Arial", "", 9)
        self.pdf.cell(190 - width, 7, str(value or ""), border=1, ln=True)

    def add_two_column_field(self, label1: str, value1: Any, label2: str, value2: Any):
        """Add two fields side by side."""
        col_width = 95

        self.pdf.set_font("Arial", "B", 9)
        self.pdf.cell(col_width, 7, f"{label1}:", border=1)
        self.pdf.set_font("Arial", "", 9)
        self.pdf.cell(col_width, 7, str(value1 or ""), border=1)
        self.pdf.ln()

        self.pdf.set_font("Arial", "B", 9)
        self.pdf.cell(col_width, 7, f"{label2}:", border=1)
        self.pdf.set_font("Arial", "", 9)
        self.pdf.cell(col_width, 7, str(value2 or ""), border=1)
        self.pdf.ln()

    def generate_ferc_556_pdf(self, form_data: Dict[str, Any]) -> bytes:
        """Generate FERC Form 556 PDF."""
        self.add_header("FERC Form 556: Large Generator Interconnection Application", "FERC 556")

        # Section 1: Applicant Information
        self.add_section("1. APPLICANT INFORMATION")
        self.add_field("Applicant Name", form_data.get("applicant_name"))
        self.add_field("Email", form_data.get("applicant_email"))
        self.add_field("Phone", form_data.get("applicant_phone"))
        self.add_field("Address", form_data.get("applicant_address"))

        # Section 2: Project Information
        self.add_section("2. PROJECT INFORMATION")
        self.add_field("Project Name", form_data.get("project_name"))
        self.add_two_column_field(
            "State", form_data.get("project_location_state"),
            "County", form_data.get("project_county")
        )
        self.add_field("RTO/ISO", form_data.get("project_rto"))

        # Section 3: Facility Details
        self.add_section("3. FACILITY DETAILS")
        self.add_two_column_field(
            "Facility Type", form_data.get("facility_type"),
            "Capacity (MW)", form_data.get("capacity_mw")
        )
        self.add_field("Interconnection Voltage (kV)", form_data.get("interconnection_voltage"))
        self.add_field("Point of Interconnection", form_data.get("interconnection_point"))

        # Section 4: Timeline
        self.add_section("4. COMMERCIAL OPERATION")
        self.add_field("Expected COD", form_data.get("commercial_operation_date"))

        # Section 5: Environmental
        if form_data.get("environmental_considerations"):
            self.add_section("5. ENVIRONMENTAL CONSIDERATIONS")
            self.add_field("Considerations", form_data.get("environmental_considerations"))

        # Footer
        self.pdf.ln(10)
        self.pdf.set_font("Arial", "", 8)
        self.pdf.cell(0, 5, "This form was auto-filled by RegGuard Queue. Please review carefully before submission.", ln=True)
        self.pdf.cell(0, 5, "For questions, visit regguard.io/queue", ln=True)

        return self.pdf.output(dest="S")

    def generate_pjm_nextgen_pdf(self, form_data: Dict[str, Any]) -> bytes:
        """Generate PJM NextGen Interconnection PDF."""
        self.add_header("PJM NextGen Interconnection Application", "PJM NEXTGEN")

        # Section 1: Applicant
        self.add_section("1. APPLICANT INFORMATION")
        self.add_field("Company Name", form_data.get("applicant_name"))
        self.add_field("Contact Email", form_data.get("applicant_email"))
        self.add_field("Contact Phone", form_data.get("applicant_phone"))

        # Section 2: Project
        self.add_section("2. PROJECT DETAILS")
        self.add_field("Project Name", form_data.get("project_name"))
        self.add_two_column_field(
            "Technology Type", form_data.get("facility_type"),
            "Capacity (MW)", form_data.get("capacity_mw")
        )

        # Section 3: Location
        self.add_section("3. LOCATION")
        self.add_two_column_field(
            "County", form_data.get("project_county"),
            "State", form_data.get("project_location_state")
        )

        # Section 4: Timeline
        self.add_section("4. COMMERCIAL OPERATION DATE")
        self.add_field("Target COD", form_data.get("commercial_operation_date"))

        # Footer
        self.pdf.ln(10)
        self.pdf.set_font("Arial", "", 8)
        self.pdf.cell(0, 5, "Auto-filled by RegGuard Queue. Review before submission.", ln=True)

        return self.pdf.output(dest="S")

    def generate_miso_pdf(self, form_data: Dict[str, Any]) -> bytes:
        """Generate MISO Interconnection PDF."""
        self.add_header("MISO Interconnection Application", "MISO")

        # Section 1: Organization
        self.add_section("1. ORGANIZATION INFORMATION")
        self.add_field("Organization Name", form_data.get("applicant_name"))
        self.add_field("Primary Contact", form_data.get("applicant_contact"))
        self.add_field("Email", form_data.get("applicant_email"))
        self.add_field("Phone", form_data.get("applicant_phone"))

        # Section 2: Resource
        self.add_section("2. RESOURCE INFORMATION")
        self.add_two_column_field(
            "Resource Type", form_data.get("facility_type"),
            "Capacity (MW)", form_data.get("capacity_mw")
        )

        # Section 3: Location
        self.add_section("3. LOCATION")
        self.add_two_column_field(
            "County", form_data.get("project_county"),
            "State", form_data.get("project_state")
        )

        # Footer
        self.pdf.ln(10)
        self.pdf.set_font("Arial", "", 8)
        self.pdf.cell(0, 5, "Auto-filled by RegGuard Queue. Verify accuracy before submission.", ln=True)

        return self.pdf.output(dest="S")

    def generate_pdf(self, form_data: Dict[str, Any]) -> bytes:
        """Generate PDF based on form type."""
        if self.form_type == "ferc_556":
            return self.generate_ferc_556_pdf(form_data)
        elif self.form_type == "pjm_nextgen":
            return self.generate_pjm_nextgen_pdf(form_data)
        elif self.form_type == "miso":
            return self.generate_miso_pdf(form_data)
        else:
            raise ValueError(f"Unsupported form type: {self.form_type}")
