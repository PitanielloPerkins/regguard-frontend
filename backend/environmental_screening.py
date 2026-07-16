"""
Environmental Screening Service
Uses Firecrawl web search + Gemini Vision to analyze environmental risks
"""

import os
import json
import asyncio
from datetime import datetime
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class EnvironmentalScreeningService:
    """Environmental screening using Firecrawl web search + Gemini synthesis"""
    
    def __init__(self, firecrawl_client, gemini_client):
        self.firecrawl = firecrawl_client
        self.gemini = gemini_client
    
    async def get_environmental_screening(
        self,
        address: str,
        city: str,
        state: str,
        latitude: float,
        longitude: float,
        project_type: str = "data-center"
    ) -> Dict:
        """
        Main entry point for environmental screening
        Uses Firecrawl to search for data, Gemini to synthesize
        
        Returns comprehensive environmental assessment with risk levels
        """
        try:
            logger.info(f"Starting environmental screening for {address}")
            
            # Run all searches in parallel for speed
            results = await asyncio.gather(
                self._search_wetlands(address, state, latitude, longitude),
                self._search_endangered_species(address, state, latitude, longitude),
                self._search_fema_flood_zones(address, latitude, longitude),
                self._search_noise_ordinances(address, city, state),
                self._search_nepa_requirements(address, state),
                self._search_state_requirements(address, state, project_type)
            )
            
            screening_data = {
                "wetlands": results[0],
                "endangered_species": results[1],
                "flood_zones": results[2],
                "noise_zones": results[3],
                "nepa": results[4],
                "state_requirements": results[5]
            }
            
            # Synthesize with Gemini
            synthesis = await self._synthesize_with_gemini(address, screening_data)
            
            final_report = {
                "address": address,
                "city": city,
                "state": state,
                "project_type": project_type,
                "screening_data": screening_data,
                "synthesis": synthesis,
                "risk_level": self._extract_risk_level(synthesis),
                "timestamp": datetime.now().isoformat(),
                "data_source": "Firecrawl + Gemini synthesis"
            }
            
            logger.info(f"Environmental screening complete for {address}: {final_report['risk_level']}")
            return final_report
            
        except Exception as e:
            logger.error(f"Environmental screening failed: {e}")
            return {
                "error": str(e),
                "address": address,
                "status": "failed"
            }
    
    async def _search_wetlands(
        self,
        address: str,
        state: str,
        latitude: float,
        longitude: float
    ) -> Dict:
        """Search for wetlands near the address"""
        
        search_query = f"wetlands near {address} {state} USGS wetlands map"
        
        try:
            results = await self.firecrawl.search(
                query=search_query,
                location=f"{latitude},{longitude}",
                radius_miles=5,
                max_results=5
            )
            
            wetlands_urls = [r.get('url') for r in results if r]
            
            risk_level = "LOW"
            if len(results) > 0:
                risk_level = "MEDIUM" if len(results) <= 2 else "HIGH"
            
            return {
                "found": len(results) > 0,
                "count": len(results),
                "risk_level": risk_level,
                "urls": wetlands_urls[:3],
                "summary": results[0].get('description', '') if results else "No wetlands detected",
                "recommendation": "Consult wetlands specialist" if risk_level in ["MEDIUM", "HIGH"] else "Low wetland risk"
            }
            
        except Exception as e:
            logger.error(f"Wetlands search failed: {e}")
            return {"error": str(e), "found": False, "risk_level": "UNKNOWN"}
    
    async def _search_endangered_species(
        self,
        address: str,
        state: str,
        latitude: float,
        longitude: float
    ) -> Dict:
        """Search for endangered/threatened species"""
        
        search_query = f"endangered species threatened {address} {state} USFWS habitat"
        
        try:
            results = await self.firecrawl.search(
                query=search_query,
                location=f"{latitude},{longitude}",
                radius_miles=10,
                max_results=5
            )
            
            species_list = []
            for result in results:
                if result:
                    species_list.append({
                        "name": result.get('title', 'Unknown species'),
                        "url": result.get('url'),
                        "snippet": result.get('description', '')[:150]
                    })
            
            risk_level = "LOW"
            if len(species_list) > 0:
                risk_level = "MEDIUM" if len(species_list) <= 2 else "HIGH"
            
            return {
                "found": len(species_list) > 0,
                "count": len(species_list),
                "risk_level": risk_level,
                "species": species_list,
                "recommendation": "Conduct species survey" if risk_level in ["MEDIUM", "HIGH"] else "Low species conflict risk"
            }
            
        except Exception as e:
            logger.error(f"Endangered species search failed: {e}")
            return {"error": str(e), "found": False, "count": 0, "risk_level": "UNKNOWN"}
    
    async def _search_fema_flood_zones(
        self,
        address: str,
        latitude: float,
        longitude: float
    ) -> Dict:
        """Search for FEMA flood zone information"""
        
        search_query = f"FEMA flood zone {address} flood map zone A zone X"
        
        try:
            results = await self.firecrawl.search(
                query=search_query,
                location=f"{latitude},{longitude}",
                radius_miles=2,
                max_results=3
            )
            
            in_flood_zone = False
            zone_type = "X (Low risk)"
            
            if results and len(results) > 0:
                description = results[0].get('description', '').lower()
                if "zone a" in description or "flood zone a" in description:
                    in_flood_zone = True
                    zone_type = "A (High risk)"
                elif "zone ae" in description:
                    in_flood_zone = True
                    zone_type = "AE (High risk)"
            
            return {
                "in_flood_zone": in_flood_zone,
                "zone_type": zone_type,
                "risk_level": "HIGH" if in_flood_zone else "LOW",
                "urls": [r.get('url') for r in results if r][:2],
                "recommendation": "Obtain flood insurance" if in_flood_zone else "Low flood risk"
            }
            
        except Exception as e:
            logger.error(f"Flood zone search failed: {e}")
            return {"error": str(e), "in_flood_zone": False, "risk_level": "UNKNOWN"}
    
    async def _search_noise_ordinances(
        self,
        address: str,
        city: str,
        state: str
    ) -> Dict:
        """Search for local noise ordinances and zoning"""
        
        search_query = f"{city} {state} noise ordinance code decibel limits industrial zoning"
        
        try:
            results = await self.firecrawl.search(
                query=search_query,
                location=city,
                max_results=3
            )
            
            ordinance_urls = [r.get('url') for r in results if r]
            
            # Try to extract decibel limits from results
            decibel_info = "Contact local planning department for specific limits"
            for result in results:
                if result and ("decibel" in result.get('description', '').lower() or "db" in result.get('description', '').lower()):
                    decibel_info = result.get('description', '')[:200]
                    break
            
            return {
                "ordinances_found": len(results),
                "risk_level": "MEDIUM" if len(results) > 0 else "LOW",
                "urls": ordinance_urls[:2],
                "decibel_info": decibel_info,
                "recommendation": "Review local ordinances" if len(results) > 0 else "Check with local planning"
            }
            
        except Exception as e:
            logger.error(f"Noise ordinance search failed: {e}")
            return {"error": str(e), "ordinances_found": 0, "risk_level": "UNKNOWN"}
    
    async def _search_nepa_requirements(
        self,
        address: str,
        state: str
    ) -> Dict:
        """Search for NEPA (National Environmental Policy Act) requirements"""
        
        search_query = f"NEPA environmental assessment {state} federal project requirements"
        
        try:
            results = await self.firecrawl.search(
                query=search_query,
                location=state,
                max_results=3
            )
            
            nepa_required = len(results) > 0
            
            return {
                "required": nepa_required,
                "risk_level": "MEDIUM" if nepa_required else "LOW",
                "urls": [r.get('url') for r in results if r][:2],
                "summary": results[0].get('description', '')[:200] if results else "No NEPA requirement found",
                "recommendation": "Consult environmental attorney" if nepa_required else "Verify NEPA applicability"
            }
            
        except Exception as e:
            logger.error(f"NEPA search failed: {e}")
            return {"error": str(e), "required": False, "risk_level": "UNKNOWN"}
    
    async def _search_state_requirements(
        self,
        address: str,
        state: str,
        project_type: str
    ) -> Dict:
        """Search for state-specific environmental requirements"""
        
        search_query = f"{state} environmental requirements {project_type} project regulations"
        
        try:
            results = await self.firecrawl.search(
                query=search_query,
                location=state,
                max_results=3
            )
            
            requirements = []
            for result in results:
                if result:
                    requirements.append({
                        "title": result.get('title', ''),
                        "url": result.get('url'),
                        "summary": result.get('description', '')[:150]
                    })
            
            return {
                "found": len(requirements) > 0,
                "count": len(requirements),
                "requirements": requirements,
                "risk_level": "MEDIUM" if len(requirements) > 0 else "LOW",
                "recommendation": "Review state requirements" if len(requirements) > 0 else "Check state regulations"
            }
            
        except Exception as e:
            logger.error(f"State requirements search failed: {e}")
            return {"error": str(e), "found": False, "count": 0, "risk_level": "UNKNOWN"}
    
    async def _synthesize_with_gemini(self, address: str, screening_data: Dict) -> str:
        """Use Gemini to synthesize findings into coherent analysis"""
        
        prompt = f"""
You are an environmental compliance expert. Analyze these environmental screening results for {address} and provide a professional synthesis:

WETLANDS:
- Found: {screening_data['wetlands'].get('found', False)}
- Risk Level: {screening_data['wetlands'].get('risk_level', 'UNKNOWN')}
- Summary: {screening_data['wetlands'].get('summary', '')}

ENDANGERED SPECIES:
- Found: {screening_data['endangered_species'].get('found', False)}
- Count: {screening_data['endangered_species'].get('count', 0)}
- Risk Level: {screening_data['endangered_species'].get('risk_level', 'UNKNOWN')}

FLOOD ZONES:
- In Flood Zone: {screening_data['flood_zones'].get('in_flood_zone', False)}
- Zone Type: {screening_data['flood_zones'].get('zone_type', 'UNKNOWN')}

NOISE ORDINANCES:
- Found: {screening_data['noise_zones'].get('ordinances_found', 0)}

NEPA REQUIRED:
- Required: {screening_data['nepa'].get('required', False)}

STATE REQUIREMENTS:
- Count: {screening_data['state_requirements'].get('count', 0)}

Provide a professional analysis with:
1. OVERALL RISK ASSESSMENT: (LOW / MEDIUM / HIGH)
2. KEY FINDINGS: (3-5 bullet points)
3. CRITICAL ISSUES: (if any exist)
4. RECOMMENDED NEXT STEPS: (action items)
5. CONFIDENCE LEVEL: (HIGH / MEDIUM / LOW)

Keep response concise and factual. Use professional language suitable for contractors/developers.
"""
        
        try:
            synthesis = await self.gemini.generate_text(prompt)
            return synthesis
        except Exception as e:
            logger.error(f"Gemini synthesis failed: {e}")
            return "Unable to synthesize. Please review individual findings above."
    
    def _extract_risk_level(self, synthesis: str) -> str:
        """Extract overall risk level from Gemini synthesis"""
        
        synthesis_upper = synthesis.upper()
        
        if "HIGH" in synthesis_upper and "RISK" in synthesis_upper:
            return "HIGH"
        elif "MEDIUM" in synthesis_upper:
            return "MEDIUM"
        else:
            return "LOW"
