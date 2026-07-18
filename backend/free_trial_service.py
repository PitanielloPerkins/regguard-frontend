"""
Free Trial Service: Handles free trial research generation and email delivery
Uses direct HTTP calls to Supabase instead of supabase package (to avoid dependency issues)
"""

import os
import json
import asyncio
import httpx
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class FreeTrial:
    """Free trial database model"""

    def __init__(
        self,
        id: str,
        email: str,
        address: str,
        project_type: str,
        created_at: datetime,
        memo_sent: bool = False,
        converted_to_paid: bool = False,
        paid_order_id: Optional[str] = None,
    ):
        self.id = id
        self.email = email
        self.address = address
        self.project_type = project_type
        self.created_at = created_at
        self.memo_sent = memo_sent
        self.converted_to_paid = converted_to_paid
        self.paid_order_id = paid_order_id


def create_free_trial(
    email: str,
    address: str,
    project_type: str,
) -> Optional[FreeTrial]:
    """
    Create a free trial record in Supabase using direct HTTP API.
    Returns: FreeTrial object or None if failed
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    logger.info(f"Creating free trial: url={'set' if url else 'NOT SET'}, key={'set' if key else 'NOT SET'}")
    
    if not url or not key:
        logger.error("❌ SUPABASE_URL or SUPABASE_KEY not set")
        return None

    try:
        import uuid
        trial_id = str(uuid.uuid4())
        from datetime import timezone
        now = datetime.now(timezone.utc).isoformat()

        # Use Supabase REST API directly (no package needed)
        supabase_api_url = f"{url}/rest/v1/free_trials"
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

        payload = {
            "id": trial_id,
            "email": email,
            "address": address,
            "project_type": project_type,
            "created_at": now,
            "memo_sent": False,
            "converted_to_paid": False,
            "paid_order_id": None,
        }

        # Make synchronous HTTP request
        with httpx.Client() as client:
            response = client.post(supabase_api_url, json=payload, headers=headers, timeout=10.0)
            
            logger.info(f"Supabase response: {response.status_code}")
            
            if response.status_code in [200, 201]:
                logger.info(f"✅ Free trial created: {trial_id}")
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    trial_data = data[0]
                    return FreeTrial(
                        id=trial_data["id"],
                        email=trial_data["email"],
                        address=trial_data["address"],
                        project_type=trial_data["project_type"],
                        created_at=datetime.fromisoformat(trial_data["created_at"]),
                        memo_sent=trial_data.get("memo_sent", False),
                        converted_to_paid=trial_data.get("converted_to_paid", False),
                        paid_order_id=trial_data.get("paid_order_id"),
                    )
            else:
                logger.error(f"❌ Supabase API error: {response.status_code} - {response.text}")
                return None

    except Exception as e:
        import traceback
        logger.error(f"❌ Error creating free trial: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None



def mark_memo_sent(trial_id: str) -> bool:
    """
    Mark a free trial's memo as sent using Supabase REST API.
    Returns: True if successful, False otherwise
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        logger.error("❌ SUPABASE_URL or SUPABASE_KEY not set")
        return False

    try:
        supabase_api_url = f"{url}/rest/v1/free_trials?id=eq.{trial_id}"
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

        with httpx.Client() as client:
            response = client.patch(supabase_api_url, json={"memo_sent": True}, headers=headers, timeout=10.0)
            
            if response.status_code in [200, 204]:
                logger.info(f"✅ Marked memo as sent for trial {trial_id}")
                return True
            else:
                logger.error(f"❌ Failed to update trial: {response.status_code}")
                return False

    except Exception as e:
        logger.error(f"❌ Error marking memo as sent: {e}")
        return False


def mark_converted_to_paid(trial_id: str, order_id: str) -> bool:
    """
    Mark a free trial as converted to paid using Supabase REST API.
    Returns: True if successful, False otherwise
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        logger.error("❌ SUPABASE_URL or SUPABASE_KEY not set")
        return False

    try:
        supabase_api_url = f"{url}/rest/v1/free_trials?id=eq.{trial_id}"
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }

        with httpx.Client() as client:
            response = client.patch(
                supabase_api_url,
                json={"converted_to_paid": True, "paid_order_id": order_id},
                headers=headers,
                timeout=10.0
            )
            
            if response.status_code in [200, 204]:
                logger.info(f"✅ Marked trial {trial_id} as converted to paid")
                return True
            else:
                logger.error(f"❌ Failed to update trial: {response.status_code}")
                return False

    except Exception as e:
        logger.error(f"❌ Error marking trial as converted: {e}")
        return False


def get_free_trial(trial_id: str) -> Optional[FreeTrial]:
    """
    Retrieve a free trial record using Supabase REST API.
    Returns: FreeTrial object or None if not found
    """
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        logger.error("❌ SUPABASE_URL or SUPABASE_KEY not set")
        return None

    try:
        supabase_api_url = f"{url}/rest/v1/free_trials?id=eq.{trial_id}"
        headers = {
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        }

        with httpx.Client() as client:
            response = client.get(supabase_api_url, headers=headers, timeout=10.0)
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    trial_data = data[0]
                    return FreeTrial(
                        id=trial_data["id"],
                        email=trial_data["email"],
                        address=trial_data["address"],
                        project_type=trial_data["project_type"],
                        created_at=datetime.fromisoformat(trial_data["created_at"]),
                        memo_sent=trial_data.get("memo_sent", False),
                        converted_to_paid=trial_data.get("converted_to_paid", False),
                        paid_order_id=trial_data.get("paid_order_id"),
                    )
            else:
                logger.error(f"❌ Failed to retrieve trial: {response.status_code}")
                return None

    except Exception as e:
        logger.error(f"❌ Error retrieving free trial: {e}")
        return None
