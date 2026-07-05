"""
Reg Guard — Data Center Permitting Risk Analysis Engine

Analyzes sites for data center development and scores permitting risk.
Returns: risk_score (0-100), timeline estimate, blockers, political alerts, recommendations.
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime

logger = logging.getLogger(__name__)


class DataCenterPermittingAnalysis:
    """
    Comprehensive permitting risk assessment for data center sites.
    
    Risk factors analyzed:
    - Zoning compliance
    - Political opposition (moratoriums, council votes)
    - Environmental concerns (water, power, emissions)
    - Utility capacity
    - Labor availability
    - Timeline estimate
    """

    # Risk scoring thresholds
    RISK_LEVELS = {
        "low": (0, 30),        # GREEN: Fast-track expected
        "medium": (31, 65),    # YELLOW: Standard timeline, some issues
        "high": (66, 100),     # RED: Significant delays likely
    }

    def __init__(self):
        self.address: str = ""
        self.city: str = ""
        self.state: str = ""
        self.mw: int = 0
        self.risk_factors: Dict[str, Any] = {}

    def analyze_site(
        self,
        address: str,
        city: str,
        state: str,
        projected_mw: int,
    ) -> Dict[str, Any]:
        """
        Analyze a data center site for permitting risk.

        Args:
            address: Street address
            city: City name
            state: State abbreviation (e.g., "TX")
            projected_mw: Projected power draw in megawatts

        Returns:
            Dict with:
            - permitting_risk_score (0-100)
            - risk_level (low/medium/high)
            - estimated_timeline_months
            - critical_blockers (list)
            - political_risk_alerts (list)
            - environmental_concerns (list)
            - utility_capacity_check (dict)
            - labor_availability (dict)
            - estimated_value_usd (audit value estimate)
            - recommendations (list)
        """
        self.address = address
        self.city = city
        self.state = state.upper()
        self.mw = projected_mw

        # Score individual factors (placeholder logic for MVP)
        zoning_score = self._score_zoning()
        political_score = self._score_political_risk()
        environmental_score = self._score_environmental()
        utility_score = self._score_utility_capacity()
        labor_score = self._score_labor()

        # Weighted average
        weights = {
            "zoning": 0.25,
            "political": 0.30,
            "environmental": 0.20,
            "utility": 0.15,
            "labor": 0.10,
        }

        risk_score = (
            zoning_score * weights["zoning"]
            + political_score * weights["political"]
            + environmental_score * weights["environmental"]
            + utility_score * weights["utility"]
            + labor_score * weights["labor"]
        )

        risk_score = int(min(100, max(0, risk_score)))
        risk_level = self._get_risk_level(risk_score)
        timeline = self._estimate_timeline(risk_score, self.mw)

        blockers = self._extract_blockers()
        political_alerts = self._extract_political_alerts()
        environmental = self._extract_environmental_concerns()
        utility_check = self._get_utility_capacity_data()
        labor_data = self._get_labor_availability()
        recommendations = self._generate_recommendations(risk_score, blockers)
        estimated_value = self._calculate_audit_value(risk_score, timeline)

        return {
            "address": address,
            "city": city,
            "state": state,
            "projected_mw": projected_mw,
            "permitting_risk_score": risk_score,
            "risk_level": risk_level,
            "estimated_timeline_months": timeline,
            "critical_blockers": blockers,
            "political_risk_alerts": political_alerts,
            "environmental_concerns": environmental,
            "utility_capacity_check": utility_check,
            "labor_availability": labor_data,
            "estimated_audit_value_usd": estimated_value,
            "recommendations": recommendations,
            "analysis_timestamp": datetime.utcnow().isoformat(),
        }

    def _score_zoning(self) -> float:
        """Score zoning compatibility (0-100 risk)."""
        # MVP: Simple logic based on state/city heuristics
        # In production, this would query municipal zoning databases
        
        data_center_friendly = {
            "TX": 30,  # Texas is data-center friendly
            "VA": 25,  # Virginia (Northern Virginia tech hub)
            "CA": 60,  # California has restrictions
            "NY": 70,  # New York has strict zoning
        }
        
        base_score = data_center_friendly.get(self.state, 50)
        
        # Industrial cities are better
        industrial_cities = ["plano", "irving", "austin", "ashburn", "reston"]
        if self.city.lower() in industrial_cities:
            base_score -= 15
        
        return base_score

    def _score_political_risk(self) -> float:
        """Score political opposition (0-100 risk)."""
        # MVP: Based on known moratoriums and state trends
        
        # States with known moratoriums or recent votes against data centers
        restrictive_states = {
            "CA": 75,   # California has multiple moratoriums
            "NY": 70,   # New York scrutinizing data centers
            "IL": 65,   # Illinois has local opposition
        }
        
        base_score = restrictive_states.get(self.state, 40)
        
        # Major cities have more opposition
        restrictive_cities = ["san_francisco", "new_york", "chicago"]
        if self.city.lower().replace(" ", "_") in restrictive_cities:
            base_score += 20
        
        return base_score

    def _score_environmental(self) -> float:
        """Score environmental concerns (0-100 risk)."""
        # MVP: Based on power draw and regional factors
        
        # Larger projects attract more scrutiny
        if self.mw > 250:
            power_risk = 60
        elif self.mw > 100:
            power_risk = 40
        else:
            power_risk = 20
        
        # Water-stressed regions have higher risk
        water_stressed = ["CA", "AZ", "NM", "TX"]
        if self.state in water_stressed:
            power_risk += 20
        
        return min(100, power_risk)

    def _score_utility_capacity(self) -> float:
        """Score utility infrastructure capacity (0-100 risk)."""
        # MVP: Estimate based on project size
        
        if self.mw > 300:
            return 70  # High power draw = likely upgrades needed
        elif self.mw > 150:
            return 50
        else:
            return 30

    def _score_labor(self) -> float:
        """Score labor availability (0-100 risk)."""
        # MVP: Based on state prevailing wage and contractor availability
        
        high_wage_states = ["CA", "NY", "IL"]
        if self.state in high_wage_states:
            return 60
        else:
            return 30

    def _get_risk_level(self, score: int) -> str:
        """Map score to risk level."""
        for level, (low, high) in self.RISK_LEVELS.items():
            if low <= score <= high:
                return level
        return "high"

    def _estimate_timeline(self, risk_score: int, mw: int) -> int:
        """Estimate permitting timeline in months."""
        base_timeline = 6  # Base 6 months
        
        # Add months based on risk
        if risk_score > 70:
            base_timeline += 6
        elif risk_score > 50:
            base_timeline += 3
        
        # Add months based on project size
        if mw > 250:
            base_timeline += 2
        
        return min(24, base_timeline)

    def _extract_blockers(self) -> List[str]:
        """Extract critical blockers."""
        blockers = []
        
        if self.state in ["CA", "NY"] and self.mw > 100:
            blockers.append("Environmental impact study likely required")
        
        if self.state in ["CA"]:
            blockers.append("State-level data center moratorium considerations")
        
        if self.mw > 250:
            blockers.append("Utility grid upgrades needed (can add 6+ months)")
        
        if self.state in ["CA", "NY", "IL"]:
            blockers.append("Local community opposition anticipated")
        
        return blockers

    def _extract_political_alerts(self) -> List[str]:
        """Extract political risk alerts."""
        alerts = []
        
        if self.state == "CA":
            alerts.append("California has active data center moratorium proposals")
        
        if self.state == "NY":
            alerts.append("New York City considering moratorium on new data centers")
        
        if self.city.lower() == "austin":
            alerts.append("Austin city council scrutinizing large tech projects")
        
        return alerts

    def _extract_environmental_concerns(self) -> List[str]:
        """Extract environmental concerns."""
        concerns = []
        
        if self.state in ["CA", "AZ"]:
            concerns.append("Water usage concerns in water-stressed region")
        
        if self.mw > 200:
            concerns.append("Significant power draw may trigger environmental review")
        
        concerns.append("Cooling system discharge regulations")
        
        return concerns

    def _get_utility_capacity_data(self) -> Dict[str, Any]:
        """Get utility capacity information."""
        return {
            "estimated_power_draw_mw": self.mw,
            "likely_grid_upgrades_needed": self.mw > 150,
            "estimated_upgrade_cost_usd": max(0, (self.mw - 150) * 500000) if self.mw > 150 else 0,
            "estimated_upgrade_timeline_months": 4 if self.mw > 150 else 0,
        }

    def _get_labor_availability(self) -> Dict[str, Any]:
        """Get labor availability information."""
        prevailing_wage_cost = 200 if self.state in ["CA", "NY"] else 150
        
        return {
            "prevailing_wage_jurisdiction": self.state in ["CA", "NY", "IL"],
            "estimated_avg_hourly_cost_usd": prevailing_wage_cost,
            "estimated_total_labor_hours": self.mw * 500,  # Rough estimate
            "estimated_total_labor_cost_usd": prevailing_wage_cost * self.mw * 500 / 100,
        }

    def _generate_recommendations(self, risk_score: int, blockers: List[str]) -> List[str]:
        """Generate actionable recommendations."""
        recs = []
        
        if risk_score > 70:
            recs.append("Engage local community early; consider public forums")
            recs.append("Hire local permitting consultants; build relationships with AHJ")
            recs.append("Prepare environmental impact study proactively")
        elif risk_score > 50:
            recs.append("Coordinate with utility district on grid upgrades")
            recs.append("Document alignment with local economic development goals")
        else:
            recs.append("Expedited permitting path likely available")
        
        if any("water" in b.lower() for b in blockers):
            recs.append("Engage water utility early; explore recycled water options")
        
        if any("utility" in b.lower() for b in blockers):
            recs.append("Conduct detailed power load study before permit submission")
        
        return recs

    def _calculate_audit_value(self, risk_score: int, timeline: int) -> int:
        """Calculate estimated audit value in USD."""
        # Base value: what would consultant charge?
        # $50-150K depending on complexity
        
        base_value = 75000
        
        # Higher risk = higher value (more expertise needed)
        if risk_score > 70:
            base_value = 125000
        elif risk_score > 50:
            base_value = 100000
        
        # Longer timeline = more phases = more value
        if timeline > 12:
            base_value += 25000
        
        return int(base_value)
