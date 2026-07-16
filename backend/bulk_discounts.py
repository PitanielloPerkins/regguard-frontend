"""
Bulk Discounts Service
Manages bulk order pricing and discount calculations
"""

from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class BulkDiscountService:
    """Service for managing bulk order discounts and pricing"""
    
    DISCOUNT_TIERS = {
        3: 0.10,
        5: 0.15,
        10: 0.20,
        25: 0.25,
        50: 0.30,
        100: 0.35,
    }
    
    BASE_PRICE = 12000
    
    @staticmethod
    def calculate_discount(quantity: int) -> Dict[str, float]:
        """Calculate discount percentage and final price for bulk order"""
        try:
            if quantity < 3:
                return {
                    "error": "Minimum 3 reports required for bulk discount",
                    "min_quantity": 3
                }
            
            discount_percentage = 0
            for tier_quantity, discount in sorted(BulkDiscountService.DISCOUNT_TIERS.items()):
                if quantity >= tier_quantity:
                    discount_percentage = discount
            
            if quantity >= 100:
                discount_percentage = min(discount_percentage + 0.05, 0.40)
            
            unit_price = BulkDiscountService.BASE_PRICE
            discount_amount = unit_price * discount_percentage
            discounted_unit_price = unit_price - discount_amount
            
            total_price = discounted_unit_price * quantity
            full_price = unit_price * quantity
            total_savings = full_price - total_price
            
            return {
                "quantity": quantity,
                "discount_percentage": discount_percentage * 100,
                "base_unit_price": unit_price,
                "discount_per_unit": discount_amount,
                "discounted_unit_price": discounted_unit_price,
                "total_price": total_price,
                "full_price": full_price,
                "total_savings": total_savings
            }
            
        except Exception as e:
            logger.error(f"Error calculating bulk discount: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def get_bulk_tiers() -> List[Dict]:
        """Get all available bulk discount tiers"""
        tiers = []
        
        for quantity, discount in sorted(BulkDiscountService.DISCOUNT_TIERS.items()):
            calc = BulkDiscountService.calculate_discount(quantity)
            if "error" not in calc:
                tiers.append({
                    "quantity": quantity,
                    "discount_percentage": calc["discount_percentage"],
                    "unit_price": calc["discounted_unit_price"],
                    "total_price": calc["total_price"],
                    "savings": calc["total_savings"]
                })
        
        return tiers
