"""
Utility-Specific Timelines Service
Provides customized interconnection timelines based on utility provider and region
"""

import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class UtilityProvider(str, Enum):
    """Major US utility providers"""
    NERC_ERCOT = "ercot"
    NERC_RFC = "rfc"
    NERC_WECC = "wecc"
    NERC_SERC = "serc"
    NERC_MISO = "miso"
    NERC_SPP = "spp"
    PJM = "pjm"
    ISO_NE = "iso_ne"
    CAISO = "caiso"
    OTHER = "other"


class ProjectType(str, Enum):
    """Project types with different timelines"""
    SMALL_LOAD = "small_load"
    MEDIUM_LOAD = "medium_load"
    LARGE_LOAD = "large_load"
    XLARGE_LOAD = "xlarge_load"
    EXPORT_SOLAR = "export_solar"
    WIND = "wind"
    BATTERY = "battery"


class UtilityTimelineService:
    """Service for generating utility-specific interconnection timelines"""
    
    BASELINE_TIMELINES = {
        "scoping_study": {"small_load": 15, "medium_load": 20, "large_load": 30, "xlarge_load": 45},
        "feasibility_study": {"small_load": 30, "medium_load": 45, "large_load": 60, "xlarge_load": 90},
        "system_impact_study": {"small_load": 60, "medium_load": 90, "large_load": 120, "xlarge_load": 180},
        "facilities_study": {"small_load": 30, "medium_load": 60, "large_load": 90, "xlarge_load": 120}
    }
    
    UTILITY_ADJUSTMENTS = {
        "ercot": 1.0,
        "rfc": 1.2,
        "wecc": 1.3,
        "serc": 1.1,
        "miso": 1.15,
        "spp": 1.0,
        "pjm": 1.4,
        "iso_ne": 1.5,
        "caiso": 1.2,
        "other": 1.2
    }
    
    @staticmethod
    async def get_timeline(
        utility_provider: str,
        project_type: str,
        queue_position: Optional[int] = None,
        is_renewable: bool = False
    ) -> Dict:
        """Generate utility-specific timeline for interconnection"""
        try:
            project_type_lower = project_type.lower()
            utility_lower = utility_provider.lower()
            
            phases = UtilityTimelineService.BASELINE_TIMELINES
            adjustment = UtilityTimelineService.UTILITY_ADJUSTMENTS.get(utility_lower, 1.2)
            
            timeline_data = {
                "utility_provider": utility_provider,
                "project_type": project_type,
                "adjustment_multiplier": adjustment,
                "phases": {},
                "summary": {}
            }
            
            total_days = 0
            start_date = datetime.now()
            
            scoping_days = int(phases["scoping_study"].get(project_type_lower, 20) * adjustment)
            timeline_data["phases"]["scoping_study"] = {
                "name": "Scoping Study",
                "duration_days": scoping_days,
                "cost_estimate": 5000
            }
            total_days += scoping_days
            
            feasibility_days = int(phases["feasibility_study"].get(project_type_lower, 45) * adjustment)
            timeline_data["phases"]["feasibility_study"] = {
                "name": "Feasibility Study",
                "duration_days": feasibility_days,
                "cost_estimate": 15000
            }
            total_days += feasibility_days
            
            timeline_data["summary"] = {
                "total_days": total_days,
                "estimated_completion_date": (start_date + timedelta(days=total_days)).isoformat(),
                "total_study_cost": 65000
            }
            
            logger.info(f"Generated timeline for {utility_provider} {project_type}: {total_days} days")
            
            return timeline_data
            
        except Exception as e:
            logger.error(f"Error generating timeline: {e}")
            return {"error": str(e)}
    
    @staticmethod
    def get_utility_info(utility_provider: str) -> Dict:
        """Get utility-specific information"""
        
        utility_info = {
            "ercot": {
                "name": "ERCOT (Texas)",
                "region": "NERC ERCOT",
                "timeline_days": 155,
                "queue_enabled": True,
                "contact": "interconnection@ercot.com"
            },
            "pjm": {
                "name": "PJM Interconnection",
                "region": "NERC RFC (Mid-Atlantic)",
                "timeline_days": 200,
                "queue_enabled": True,
                "contact": "interconnect@pjm.com"
            }
        }
        
        return utility_info.get(utility_provider.lower(), {"name": "Other Utility"})
