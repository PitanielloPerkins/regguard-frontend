"""
Free Trial Service: Handles free trial research generation and email delivery
"""

import os
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional
import logging

try:
    from supabase import create_client, Client
except ImportError:
    Client = None

logger = logging.getLogger(__name__)


def _supabase_client() -> Optional[Client]:
    """Initialize Supabase client"""
    try:
        from supabase import create_client
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_KEY")
        logger.info(f"Supabase init: url={'set' if url else 'NOT SET'}, key={'set' if key else 'NOT SET'}")
        if not url or not key:
            logger.warning("SUPABASE_URL or SUPABASE_KEY not set")
            return None
        return create_client(url, key)
    except ImportError:
        logger.warning("supabase package not installed")
        return None


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
    Create a free trial record in Supabase.
    Returns: FreeTrial object or None if failed
    """
    sb = _supabase_client()
    if not sb:
        logger.error("Supabase client not available")
        return None

    try:
        from datetime import timezone
        
        # Let Supabase generate the ID, just provide the data
        now = datetime.now(timezone.utc).isoformat()

        # Insert into free_trials table (Supabase will auto-generate ID)
        response = sb.table("free_trials").insert({
            "email": email,
            "address": address,
            "project_type": project_type,
            "created_at": now,
            "memo_sent": False,
            "converted_to_paid": False,
            "paid_order_id": None,
        }).execute()

        if response.data and len(response.data) > 0:
            trial_data = response.data[0]
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
            logger.error("No data returned from insert")
            return None

    except Exception as e:
        import traceback
        logger.error(f"Error creating free trial: {e}")
        logger.error(f"Traceback: {traceback.format_exc()}")
        return None


def mark_memo_sent(trial_id: str) -> bool:
    """
    Mark a free trial's memo as sent.
    Returns: True if successful, False otherwise
    """
    sb = _supabase_client()
    if not sb:
        return False

    try:
        response = sb.table("free_trials").update({
            "memo_sent": True,
        }).eq("id", trial_id).execute()

        return bool(response.data)

    except Exception as e:
        logger.error(f"Error marking memo as sent: {e}")
        return False


def mark_converted_to_paid(trial_id: str, order_id: str) -> bool:
    """
    Mark a free trial as converted to paid.
    Returns: True if successful, False otherwise
    """
    sb = _supabase_client()
    if not sb:
        return False

    try:
        response = sb.table("free_trials").update({
            "converted_to_paid": True,
            "paid_order_id": order_id,
        }).eq("id", trial_id).execute()

        return bool(response.data)

    except Exception as e:
        logger.error(f"Error marking trial as converted: {e}")
        return False


def get_free_trial(trial_id: str) -> Optional[FreeTrial]:
    """
    Retrieve a free trial record from Supabase.
    Returns: FreeTrial object or None if not found
    """
    sb = _supabase_client()
    if not sb:
        return None

    try:
        response = sb.table("free_trials").select("*").eq("id", trial_id).execute()

        if response.data and len(response.data) > 0:
            trial_data = response.data[0]
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
            return None

    except Exception as e:
        logger.error(f"Error retrieving free trial: {e}")
        return None
