"""
FERC Form field definitions and mapping rules.

Defines all FERC Form 556/557 fields needed for interconnection automation.
"""

from typing import Dict, List, Optional
from dataclasses import dataclass


@dataclass
class FERCFormField:
    """Represents a single FERC form field."""
    name: str
    label: str
    field_type: str  # "text", "email", "phone", "address", "numeric", "date", "select"
    required: bool
    description: str
    example: Optional[str] = None
    validation_regex: Optional[str] = None


# FERC Form 556 (Large Generator Interconnection Application)
FERC_556_FIELDS = [
    # Section 1: Applicant Information
    FERCFormField(
        name="applicant_name",
        label="Applicant Name",
        field_type="text",
        required=True,
        description="Legal name of the applicant entity",
        example="Acme Solar LLC",
    ),
    FERCFormField(
        name="applicant_email",
        label="Applicant Email",
        field_type="email",
        required=True,
        description="Primary contact email",
        example="contact@acmesolar.com",
    ),
    FERCFormField(
        name="applicant_phone",
        label="Applicant Phone",
        field_type="phone",
        required=True,
        description="Primary contact phone number",
        example="555-123-4567",
    ),
    FERCFormField(
        name="applicant_address",
        label="Applicant Address",
        field_type="address",
        required=True,
        description="Business address",
        example="123 Solar Lane, Denver, CO 80202",
    ),
    
    # Section 2: Project Information
    FERCFormField(
        name="project_name",
        label="Project Name",
        field_type="text",
        required=True,
        description="Name of the generating facility",
        example="Acme Solar Farm Phase 1",
    ),
    FERCFormField(
        name="project_location_state",
        label="Project State",
        field_type="select",
        required=True,
        description="State where facility is located",
        example="Colorado",
    ),
    FERCFormField(
        name="project_county",
        label="County",
        field_type="text",
        required=True,
        description="County where facility is located",
        example="Denver County",
    ),
    FERCFormField(
        name="project_rto",
        label="RTO/ISO",
        field_type="select",
        required=True,
        description="Regional Transmission Organization",
        example="WECC",
        validation_regex="^(PJM|MISO|WECC|ERCOT|NEISO)$",
    ),
    FERCFormField(
        name="facility_type",
        label="Facility Type",
        field_type="select",
        required=True,
        description="Type of generating facility",
        example="Solar PV",
        validation_regex="^(Solar|Wind|Battery|Hydro|Natural Gas)$",
    ),
    FERCFormField(
        name="capacity_mw",
        label="Facility Capacity (MW)",
        field_type="numeric",
        required=True,
        description="Nameplate capacity in megawatts",
        example="10.5",
    ),
    
    # Section 3: Interconnection Details
    FERCFormField(
        name="interconnection_voltage",
        label="Interconnection Voltage (kV)",
        field_type="numeric",
        required=True,
        description="Proposed interconnection voltage",
        example="138",
    ),
    FERCFormField(
        name="interconnection_point",
        label="Point of Interconnection",
        field_type="text",
        required=True,
        description="Substation or line name",
        example="Denver West Substation",
    ),
    FERCFormField(
        name="commercial_operation_date",
        label="Expected Commercial Operation Date",
        field_type="date",
        required=True,
        description="When facility will be operational",
        example="2026-06-30",
    ),
    
    # Section 4: Environmental/Impact
    FERCFormField(
        name="environmental_considerations",
        label="Environmental Considerations",
        field_type="text",
        required=False,
        description="Any environmental impacts or mitigation measures",
        example="No wetlands or endangered species",
    ),
]

# FERC Form 557 (Small Generator Interconnection Application)
FERC_557_FIELDS = [
    # Simplified version for small generators (<20 MW)
    FERCFormField(
        name="applicant_name",
        label="Applicant Name",
        field_type="text",
        required=True,
        description="Legal name of the applicant entity",
    ),
    FERCFormField(
        name="applicant_email",
        label="Email",
        field_type="email",
        required=True,
        description="Primary contact email",
    ),
    FERCFormField(
        name="applicant_phone",
        label="Phone",
        field_type="phone",
        required=True,
        description="Contact phone",
    ),
    FERCFormField(
        name="project_name",
        label="Facility Name",
        field_type="text",
        required=True,
        description="Name of facility",
    ),
    FERCFormField(
        name="facility_type",
        label="Facility Type",
        field_type="select",
        required=True,
        description="Solar, Wind, Battery, etc.",
    ),
    FERCFormField(
        name="capacity_mw",
        label="Capacity (MW)",
        field_type="numeric",
        required=True,
        description="Nameplate capacity",
    ),
    FERCFormField(
        name="interconnection_point",
        label="POI",
        field_type="text",
        required=True,
        description="Point of interconnection",
    ),
]

# PJM NextGen Interconnection Application Fields
PJM_NEXTGEN_FIELDS = [
    FERCFormField(
        name="applicant_name",
        label="Company Name",
        field_type="text",
        required=True,
        description="Legal entity name",
    ),
    FERCFormField(
        name="applicant_email",
        label="Contact Email",
        field_type="email",
        required=True,
        description="Project manager email",
    ),
    FERCFormField(
        name="project_name",
        label="Project Name",
        field_type="text",
        required=True,
        description="Interconnection project name",
    ),
    FERCFormField(
        name="facility_type",
        label="Technology Type",
        field_type="select",
        required=True,
        description="Solar, Wind, Battery Storage, etc.",
    ),
    FERCFormField(
        name="capacity_mw",
        label="Capacity (MW)",
        field_type="numeric",
        required=True,
        description="Nameplate capacity",
    ),
    FERCFormField(
        name="project_county",
        label="County",
        field_type="text",
        required=True,
        description="Project location county",
    ),
    FERCFormField(
        name="commercial_operation_date",
        label="COD Target",
        field_type="date",
        required=True,
        description="Commercial operation date",
    ),
]

# MISO Interconnection Fields
MISO_FIELDS = [
    FERCFormField(
        name="applicant_name",
        label="Organization Name",
        field_type="text",
        required=True,
        description="Legal entity name",
    ),
    FERCFormField(
        name="applicant_contact",
        label="Primary Contact",
        field_type="text",
        required=True,
        description="Main contact person",
    ),
    FERCFormField(
        name="applicant_email",
        label="Email",
        field_type="email",
        required=True,
        description="Contact email",
    ),
    FERCFormField(
        name="applicant_phone",
        label="Phone",
        field_type="phone",
        required=True,
        description="Contact phone",
    ),
    FERCFormField(
        name="facility_type",
        label="Resource Type",
        field_type="select",
        required=True,
        description="Solar, Wind, Battery, etc.",
    ),
    FERCFormField(
        name="capacity_mw",
        label="Capacity (MW)",
        field_type="numeric",
        required=True,
        description="Maximum output",
    ),
    FERCFormField(
        name="project_county",
        label="County",
        field_type="text",
        required=True,
        description="Located in",
    ),
    FERCFormField(
        name="project_state",
        label="State",
        field_type="text",
        required=True,
        description="State",
    ),
]


# Map form types to field definitions
FORM_DEFINITIONS = {
    "ferc_556": FERC_556_FIELDS,
    "ferc_557": FERC_557_FIELDS,
    "pjm_nextgen": PJM_NEXTGEN_FIELDS,
    "miso": MISO_FIELDS,
}


def get_form_fields(form_type: str) -> List[FERCFormField]:
    """Get field definitions for a specific form type."""
    return FORM_DEFINITIONS.get(form_type, [])


def get_required_fields(form_type: str) -> List[str]:
    """Get names of required fields for a form."""
    fields = get_form_fields(form_type)
    return [f.name for f in fields if f.required]
