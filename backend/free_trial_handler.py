"""
Free Trial API Endpoint: /free-trial
Allows users to run RegGuard research for free and receive research memo via email
"""

import asyncio
import logging
from typing import Optional
from pydantic import BaseModel

logger = logging.getLogger(__name__)


class FreeTrialRequest(BaseModel):
    """Request body for free trial"""
    address: str
    project_type: str
    email: str


class FreeTrialResponse(BaseModel):
    """Response for free trial request"""
    trial_id: str
    message: str
    status: str


async def handle_free_trial(request_data: FreeTrialRequest) -> FreeTrialResponse:
    """
    Handle free trial request:
    1. Create trial record in Supabase
    2. Run research asynchronously
    3. Send research memo via email
    4. Return trial_id for tracking
    """
    from free_trial_service import create_free_trial, mark_memo_sent
    from email_service import get_email_service

    try:
        # Step 1: Create trial record
        trial = create_free_trial(
            email=request_data.email,
            address=request_data.address,
            project_type=request_data.project_type,
        )

        if not trial:
            logger.error("Failed to create free trial record")
            return FreeTrialResponse(
                trial_id="",
                message="Failed to create trial record. Please try again.",
                status="error",
            )

        logger.info(f"Created free trial: {trial.id} for {request_data.email}")

        # Step 2: Run research asynchronously in background
        asyncio.create_task(
            _run_research_and_email(
                trial_id=trial.id,
                email=request_data.email,
                address=request_data.address,
                project_type=request_data.project_type,
            )
        )

        return FreeTrialResponse(
            trial_id=trial.id,
            message="Your research has been queued. Check your email in 24 hours for your research memo.",
            status="success",
        )

    except Exception as e:
        logger.error(f"Error handling free trial: {e}")
        return FreeTrialResponse(
            trial_id="",
            message="An error occurred. Please try again.",
            status="error",
        )


async def _run_research_and_email(
    trial_id: str,
    email: str,
    address: str,
    project_type: str,
) -> None:
    """
    Background task: Run research and send email.
    This runs asynchronously after the endpoint returns.
    """
    from free_trial_service import mark_memo_sent
    from email_service import get_email_service

    try:
        logger.info(f"Starting research for trial {trial_id}: {address}")

        # Step 1: Generate research memo (text format only for free trial)
        research_memo = await _generate_research_memo(
            address=address,
            project_type=project_type,
        )

        if not research_memo:
            logger.error(f"Failed to generate research memo for trial {trial_id}")
            return

        logger.info(f"Generated research memo for trial {trial_id} ({len(research_memo)} chars)")

        # Step 2: Send email with research memo
        email_service = get_email_service()
        if not email_service:
            logger.error("Email service not configured")
            return

        success = await email_service.send_research_memo(
            to_email=email,
            address=address,
            research_memo=research_memo,
            trial_id=trial_id,
        )

        if success:
            # Step 3: Mark memo as sent in database
            mark_memo_sent(trial_id)
            logger.info(f"Successfully sent research memo to {email} for trial {trial_id}")
        else:
            logger.error(f"Failed to send research memo to {email}")

    except Exception as e:
        logger.error(f"Error in research/email background task: {e}")


async def _generate_research_memo(
    address: str,
    project_type: str,
) -> Optional[str]:
    """
    Generate research memo for free trial.
    Returns plaintext memo (PDF generation is premium feature).
    """
    try:
        # Import research functions from existing backend
        from research_memo import build_research_digest
        from jurisdiction import geocode_profile_from_address

        # Geocode address to get jurisdiction profile
        profile = geocode_profile_from_address(address)

        if not profile:
            return "Could not geocode address. Please verify the address and try again."

        # Build research digest (this calls all the research modules)
        digest = build_research_digest(
            job_description=f"Free trial research for {address}",
            project_narrative=f"Project type: {project_type}\nAddress: {address}",
            profile=profile,
        )

        if not digest:
            return "Could not generate research. Please try again."

        # Extract plaintext from digest (strip HTML/markdown if needed)
        memo = _format_memo_plaintext(digest, address, project_type)

        return memo

    except Exception as e:
        logger.error(f"Error generating research memo: {e}")
        return None


def _format_memo_plaintext(
    research_digest: str,
    address: str,
    project_type: str,
) -> str:
    """Format research digest into plaintext memo"""
    memo = f"""
========================================
REGGUARD FREE TRIAL RESEARCH MEMO
========================================

Site: {address}
Project Type: {project_type}
Generated: {datetime.now().isoformat()}

========================================
RESEARCH FINDINGS
========================================

{research_digest}

========================================
NEXT STEPS
========================================

1. Review this research memo
2. If findings are valuable, upgrade to the full package ($15,000)
3. Full package includes:
   - Contractor punch list (actionable items)
   - Permit application package (ready to file)
   - Professional PDF formatting
   - Same-day delivery

========================================
DISCLAIMER
========================================

This research is provided "as-is" for educational purposes.
Have your attorney, engineer, and interconnection consultant
review all findings before relying on them.

RegGuard © 2026
hello@regguard.com

"""
    from datetime import datetime
    return memo.strip()
