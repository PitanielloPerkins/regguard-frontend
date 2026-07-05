"""
RegGuard Queue API endpoints with TEST MODE support.

Handles interconnection form auto-filling requests and manages submissions.
"""

from typing import Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Request, HTTPException, UploadFile, File
from pydantic import BaseModel
import base64
import json
import os

from interconnect.auto_filler import auto_fill_form
from interconnect.pdf_generator import InterconnectionFormPDF


# Request/Response Models
class QueueAutoFillRequest(BaseModel):
    """Request to auto-fill an interconnection form."""
    form_type: str  # "ferc_556", "ferc_557", "pjm_nextgen", "miso"
    project_text: str  # Raw project data (from PDF or user input)
    user_email: Optional[str] = None
    user_overrides: Optional[Dict[str, str]] = None


class QueueSubmissionResponse(BaseModel):
    """Response with auto-filled form data."""
    submission_id: str
    form_type: str
    filled_form: Dict[str, Any]
    accuracy_report: Dict[str, Any]
    pdf_url: Optional[str] = None
    ready_for_export: bool
    created_at: str


# Initialize router
router = APIRouter(prefix="/queue", tags=["Queue"])


@router.post("/auto-fill", response_model=QueueSubmissionResponse)
async def auto_fill_interconnection_form(
    req: QueueAutoFillRequest,
    request: Request,
) -> QueueSubmissionResponse:
    """
    Auto-fill an interconnection form from project data.
    """
    try:
        # Generate unique submission ID
        submission_id = f"queue_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')}"

        # TEST MODE: Use mock data if enabled
        if os.getenv("QUEUE_TEST_MODE") == "true":
            result = {
                "form_type": req.form_type,
                "filled_form": {
                    "applicant_name": "Acme Solar LLC",
                    "applicant_email": "contact@acmesolar.com",
                    "applicant_phone": "555-123-4567",
                    "applicant_address": "Denver, Colorado",
                    "project_name": "Acme Solar Farm Phase 1",
                    "project_location_state": "Colorado",
                    "project_county": "Denver County",
                    "project_rto": "WECC",
                    "facility_type": "Solar PV",
                    "capacity_mw": 10.0,
                    "interconnection_voltage": "138",
                    "interconnection_point": "Denver West Substation",
                    "commercial_operation_date": "2026-12-31",
                },
                "accuracy_report": {
                    "overall_confidence": 0.92,
                    "required_fields_filled": 14,
                    "total_required_fields": 15,
                    "fill_percentage": 0.93,
                    "fields_needing_review": [],
                    "fields_with_errors": [],
                    "ready_for_submission": True
                },
                "ready_for_export": True
            }
        else:
            # Step 1: Auto-fill form using Claude
            result = auto_fill_form(
                form_type=req.form_type,
                project_text=req.project_text,
                user_overrides=req.user_overrides,
            )

        # Step 2: Generate PDF
        pdf_generator = InterconnectionFormPDF(req.form_type)
        pdf_bytes = pdf_generator.generate_pdf(result["filled_form"])
        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

        return QueueSubmissionResponse(
            submission_id=submission_id,
            form_type=req.form_type,
            filled_form=result["filled_form"],
            accuracy_report=result["accuracy_report"],
            pdf_url=f"data:application/pdf;base64,{pdf_base64}",
            ready_for_export=result["ready_for_export"],
            created_at=datetime.now().isoformat(),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Auto-fill failed: {str(e)}")


@router.get("/history")
async def get_user_submissions(
    request: Request,
    limit: int = 10,
    offset: int = 0,
) -> Dict[str, Any]:
    """Retrieve user's recent interconnection form submissions."""
    return {
        "submissions": [],
        "total": 0,
        "limit": limit,
        "offset": offset,
    }


@router.get("/status/{submission_id}")
async def get_submission_status(
    submission_id: str,
    request: Request,
) -> Dict[str, Any]:
    """Get status and details of a specific submission."""
    return {
        "submission_id": submission_id,
        "status": "draft",
        "created_at": datetime.now().isoformat(),
    }


@router.post("/submit/{submission_id}")
async def submit_form(
    submission_id: str,
    request: Request,
) -> Dict[str, Any]:
    """Mark a form as submitted to RTO."""
    return {
        "submission_id": submission_id,
        "status": "submitted",
        "submitted_at": datetime.now().isoformat(),
    }


@router.get("/stats")
async def get_queue_stats(request: Request) -> Dict[str, Any]:
    """Get user's interconnection queue statistics."""
    return {
        "total_submissions": 0,
        "successful_fills": 0,
        "average_accuracy": 0.0,
        "forms_pending_submission": 0,
    }
