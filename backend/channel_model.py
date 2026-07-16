"""
Channel Model Service
Manages partner/reseller relationships, commissions, and payouts
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class ChannelPartnerTier(str):
    """Channel partner tiers with commission structures"""
    REGISTERED = "registered"
    SILVER = "silver"
    GOLD = "gold"
    PLATINUM = "platinum"


class ChannelPartnerService:
    """Service for managing channel partners and revenue sharing"""
    
    COMMISSION_RATES = {
        "registered": 0.20,
        "silver": 0.25,
        "gold": 0.30,
        "platinum": 0.35
    }
    
    TIER_REQUIREMENTS = {
        "registered": 0,
        "silver": 50000,
        "gold": 150000,
        "platinum": 500000
    }
    
    @staticmethod
    async def register_partner(
        partner_name: str,
        company_name: str,
        contact_email: str,
        contact_phone: str
    ) -> Dict:
        """Register new channel partner"""
        try:
            partner = {
                "partner_name": partner_name,
                "company_name": company_name,
                "contact_email": contact_email,
                "contact_phone": contact_phone,
                "tier": ChannelPartnerTier.REGISTERED,
                "commission_percentage": ChannelPartnerService.COMMISSION_RATES["registered"],
                "is_active": False
            }
            
            logger.info(f"Registered new channel partner: {company_name}")
            
            return {
                "success": True,
                "partner_id": "partner_123",
                "partner_name": partner_name,
                "tier": ChannelPartnerTier.REGISTERED,
                "commission_percentage": 20,
                "status": "pending_approval"
            }
            
        except Exception as e:
            logger.error(f"Error registering partner: {e}")
            return {"error": str(e)}
    
    @staticmethod
    async def record_sale(
        partner_id: str,
        order_id: str,
        customer_email: str,
        sale_amount: float
    ) -> Dict:
        """Record sale from channel partner"""
        try:
            commission_rate = 0.20
            commission_amount = sale_amount * commission_rate
            
            logger.info(f"Recorded sale from partner {partner_id}: ${sale_amount}")
            
            return {
                "success": True,
                "sale_id": "sale_123",
                "sale_amount": sale_amount,
                "commission_amount": commission_amount,
                "commission_rate": commission_rate * 100
            }
            
        except Exception as e:
            logger.error(f"Error recording sale: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def get_commission_table() -> str:
        """Generate markdown table of commission structure"""
        table = "| Tier | Annual Revenue | Commission |\n"
        table += "|------|---|---|\n"
        table += "| Registered | $0 | 20% |\n"
        table += "| Silver | $50K | 25% |\n"
        table += "| Gold | $150K | 30% |\n"
        table += "| Platinum | $500K | 35% |\n"
        
        return table
