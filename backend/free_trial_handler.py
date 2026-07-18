"""
Free Trial API Endpoint: /free-trial
Allows users to run RegGuard research for free and receive research memo via email
Includes environmental screening via Firecrawl + Gemini
"""

import asyncio
import logging
from typing import Optional
from datetime import datetime
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
    Background task: Run research (including environmental screening) and send email.
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

        # Step 2: Run environmental screening (new feature)
        environmental_screening = await _run_environmental_screening(address, project_type)

        # Step 3: Send email with research memo + environmental summary
        email_service = get_email_service()
        if not email_service:
            logger.error("Email service not configured")
            return

        combined_memo = _combine_memo_with_environmental(research_memo, environmental_screening)

        success = await email_service.send_research_memo(
            to_email=email,
            address=address,
            research_memo=combined_memo,
            trial_id=trial_id,
        )

        if success:
            # Step 4: Mark memo as sent in database
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
            raw=profile,
            source_urls=[],
            enhanced_query=f"Free trial research for {project_type} at {address}",
            job_description=f"Free trial research for {address}",
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
    return memo.strip()


async def _run_environmental_screening(address: str, project_type: str) -> Optional[dict]:
    """
    Run environmental screening using Firecrawl + Gemini
    **FREE TIER USES CACHED DATA ONLY** (99% cost reduction)
    Firecrawl only called on premium tier
    Returns environmental assessment or None if failed
    """
    try:
        from jurisdiction import geocode_profile_from_address
        import os

        logger.info(f"🌍 Environmental screening starting for: {address}")
        
        # Geocode to get lat/lon
        profile = geocode_profile_from_address(address)

        if not profile:
            logger.warning(f"❌ Could not geocode {address} for environmental screening")
            return None

        # JurisdictionProfile is a dataclass with attributes: zip5, city, state_short, etc.
        zip_code = profile.zip5
        city = profile.city
        state = profile.state_short

        logger.info(f"📍 Geocoded: {city}, {state} ZIP: {zip_code}")

        # **FREE TIER: USE CACHED DATA ONLY (no Firecrawl API calls)**
        # This dramatically reduces costs to essentially $0 (just database lookups)
        cached_result = _get_cached_environmental_data(zip_code, state)
        
        if cached_result:
            logger.info(f"✅ Using cached environmental data for {zip_code}, {state} (FREE TIER - $0 Firecrawl cost)")
            return cached_result
        
        # No cached data available, return basic disclaimer
        logger.info(f"⚠️  No cached environmental data for {zip_code}, {state}. Returning basic template.")
        return {
            "risk_level": "UNKNOWN",
            "synthesis": f"Environmental screening data for {zip_code}, {state} is not yet cached. This feature will be available on the premium tier.",
            "screening_data": {},
            "note": "Free tier: limited to cached data. Upgrade to premium for real-time Firecrawl analysis."
        }

    except Exception as e:
        logger.error(f"❌ Environmental screening failed: {e}")
        return None


def _get_cached_environmental_data(zip_code: str, state: str) -> Optional[dict]:
    """
    Retrieve cached environmental data for a ZIP/state combination
    This completely bypasses Firecrawl API calls for free tier
    Cost: $0 (just database lookup)
    """
    import httpx
    import os
    
    try:
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        
        if not url or not key:
            logger.warning(f"⚠️  Cache lookup: Missing SUPABASE credentials")
            return None
        
        logger.info(f"🔍 Cache lookup for ZIP: {zip_code}, State: {state}")
        
        # Query environmental_cache table by ZIP + state
        supabase_api_url = f"{url}/rest/v1/environmental_cache?zip_code=eq.{zip_code}&state=eq.{state}"
        headers = {
            "apikey": key,
            "Accept": "application/json",
        }
        
        with httpx.Client() as client:
            response = client.get(supabase_api_url, headers=headers, timeout=5.0)
            logger.info(f"📡 Cache API response: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"📦 Cache query returned {len(data)} rows")
                if data and len(data) > 0:
                    logger.info(f"✅ Found cached environmental data: {zip_code}, {state}")
                    return data[0].get("cached_data")
                else:
                    logger.info(f"❌ No cache entry for {zip_code}, {state}")
            else:
                logger.warning(f"⚠️  Cache API error: {response.status_code} - {response.text}")
        
        return None
    except Exception as e:
        logger.warning(f"⚠️  Cache lookup exception: {e}")
        return None


def _combine_memo_with_environmental(research_memo: str, environmental_data: Optional[dict]) -> str:
    """
    Combine research memo with environmental screening summary
    """
    if not environmental_data or environmental_data.get("error"):
        return research_memo

    try:
        risk_level = environmental_data.get("risk_level", "UNKNOWN")
        synthesis = environmental_data.get("synthesis", "No synthesis available")

        environmental_section = f"""

========================================
ENVIRONMENTAL SCREENING ANALYSIS
========================================

Risk Level: {risk_level}

{synthesis}

Data Sources: Firecrawl + Gemini synthesis
Wetlands: {environmental_data.get('screening_data', {}).get('wetlands', {}).get('risk_level', 'UNKNOWN')}
Endangered Species: {environmental_data.get('screening_data', {}).get('endangered_species', {}).get('risk_level', 'UNKNOWN')}
Flood Zones: {environmental_data.get('screening_data', {}).get('flood_zones', {}).get('risk_level', 'UNKNOWN')}
Noise Ordinances: {environmental_data.get('screening_data', {}).get('noise_zones', {}).get('risk_level', 'UNKNOWN')}
NEPA: {environmental_data.get('screening_data', {}).get('nepa', {}).get('risk_level', 'UNKNOWN')}
State Requirements: {environmental_data.get('screening_data', {}).get('state_requirements', {}).get('risk_level', 'UNKNOWN')}

"""
        return research_memo + environmental_section

    except Exception as e:
        logger.error(f"Error combining memo with environmental data: {e}")
        return research_memo
