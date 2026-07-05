"""
Form auto-fill engine using Claude LLM.

Extracts project data from user input and intelligently fills FERC/interconnection forms.
"""

import json
import re
from typing import Dict, Any, List, Optional
from anthropic import Anthropic

from interconnect.form_fields import (
    FERCFormField,
    get_form_fields,
    get_required_fields,
)


class FormAutoFiller:
    """Uses Claude to intelligently fill interconnection forms."""

    def __init__(self, api_key: Optional[str] = None):
        """Initialize Claude client."""
        self.client = Anthropic()
        self.model = "claude-3-5-sonnet-20241022"

    def extract_project_data(self, text: str) -> Dict[str, Any]:
        """
        Extract project information from raw text (PDF, document, or user input).

        Args:
            text: Raw project data (typically from PDF parser or manual input)

        Returns:
            Dictionary with extracted project fields
        """
        prompt = f"""
Extract the following information from the project data provided:
- Project/Company name
- Location (city, county, state)
- Facility type (Solar, Wind, Battery Storage, etc.)
- Capacity in MW
- Contact email and phone
- Point of interconnection or substation
- Expected commercial operation date
- RTO/ISO (WECC, PJM, MISO, ERCOT, etc.)

Return ONLY valid JSON with these keys: project_name, company_name, location_city, location_county, location_state, facility_type, capacity_mw, contact_email, contact_phone, interconnection_point, commercial_operation_date, rto

If a field is not found, use null. Only return the JSON, no other text.

Project data:
{text}
"""
        message = self.client.messages.create(
            model=self.model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            extracted = json.loads(message.content[0].text)
            return extracted
        except (json.JSONDecodeError, IndexError):
            return {}

    def fill_form(
        self,
        form_type: str,
        project_data: Dict[str, Any],
        user_provided_values: Optional[Dict[str, str]] = None,
    ) -> Dict[str, Any]:
        """
        Fill a specific interconnection form with extracted project data.

        Args:
            form_type: Type of form ('ferc_556', 'ferc_557', 'pjm_nextgen', 'miso')
            project_data: Extracted project information
            user_provided_values: User-provided overrides for specific fields

        Returns:
            Dictionary with form fields populated
        """
        fields = get_form_fields(form_type)
        filled_form = {}

        # Build field descriptions for Claude
        field_descriptions = []
        for field in fields:
            field_descriptions.append(
                f"- {field.name}: {field.label} (type: {field.type}, required: {field.required}, description: {field.description})"
            )

        prompt = f"""
You are filling out a {form_type} interconnection application form.

Available fields:
{chr(10).join(field_descriptions)}

Project data extracted from the application:
{json.dumps(project_data, indent=2)}

User-provided values (these override extracted data):
{json.dumps(user_provided_values or {}, indent=2)}

For each field, determine the most accurate value based on:
1. User-provided values (highest priority)
2. Extracted project data (medium priority)
3. Logical inference from available data (lowest priority)

Return ONLY a valid JSON object mapping field names to values. For missing required fields, use reasonable defaults or null.

Example output format:
{{"applicant_name": "Acme Solar LLC", "capacity_mw": 10.5, "facility_type": "Solar"}}

Ensure all values are appropriate types (strings, numbers, dates in YYYY-MM-DD format).

Fill the form now:
"""

        message = self.client.messages.create(
            model=self.model,
            max_tokens=2048,
            messages=[{"role": "user", "content": prompt}],
        )

        try:
            filled_form = json.loads(message.content[0].text)
        except (json.JSONDecodeError, IndexError):
            filled_form = {}

        return filled_form

    def validate_form(self, form_type: str, form_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate filled form against field definitions.

        Returns:
            {
                "valid": bool,
                "errors": [list of field validation errors],
                "warnings": [list of optional field warnings],
                "confidence": float (0-1),
            }
        """
        fields = get_form_fields(form_type)
        required_fields = get_required_fields(form_type)

        errors = []
        warnings = []
        confidence = 1.0

        for field in fields:
            value = form_data.get(field.name)

            # Check required fields
            if field.required and (value is None or value == ""):
                errors.append(f"Missing required field: {field.label}")
                confidence -= 0.1
            elif value is not None and field.validation_regex:
                # Validate regex patterns
                if not re.match(field.validation_regex, str(value)):
                    warnings.append(
                        f"Field '{field.label}' may not match expected format"
                    )
                    confidence -= 0.05

        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "warnings": warnings,
            "confidence": max(0, confidence),
        }

    def get_accuracy_report(
        self,
        form_type: str,
        filled_form: Dict[str, Any],
        validation: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Generate a confidence report for the auto-filled form.

        Returns accuracy assessment and fields needing review.
        """
        required_fields = get_required_fields(form_type)
        filled_required = [
            f for f in required_fields if form_data.get(f) not in (None, "")
        ]

        return {
            "overall_confidence": validation["confidence"],
            "required_fields_filled": len(filled_required),
            "total_required_fields": len(required_fields),
            "fill_percentage": len(filled_required) / len(required_fields)
            if required_fields
            else 0,
            "fields_needing_review": validation["warnings"],
            "fields_with_errors": validation["errors"],
            "ready_for_submission": validation["valid"]
            and validation["confidence"] > 0.85,
        }


def auto_fill_form(
    form_type: str,
    project_text: str,
    user_overrides: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    High-level function: Extract from text and fill form in one call.

    Args:
        form_type: 'ferc_556', 'ferc_557', 'pjm_nextgen', 'miso'
        project_text: Raw project data (from PDF or user input)
        user_overrides: User-provided field values

    Returns:
        {
            "form_type": str,
            "filled_form": Dict,
            "validation": Dict,
            "accuracy_report": Dict,
            "ready_for_export": bool,
        }
    """
    filler = FormAutoFiller()

    # Step 1: Extract project data
    project_data = filler.extract_project_data(project_text)

    # Step 2: Fill form
    filled_form = filler.fill_form(form_type, project_data, user_overrides)

    # Step 3: Validate
    validation = filler.validate_form(form_type, filled_form)

    # Step 4: Generate accuracy report
    accuracy_report = filler.get_accuracy_report(form_type, filled_form, validation)

    return {
        "form_type": form_type,
        "filled_form": filled_form,
        "validation": validation,
        "accuracy_report": accuracy_report,
        "ready_for_export": accuracy_report["ready_for_submission"],
    }
