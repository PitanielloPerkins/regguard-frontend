"""
Environmental Cache Seeding Utility
Purpose: Populate environmental_cache table with pre-researched data
This makes FREE tier viable by caching results by ZIP code

Usage:
    python cache_seeder.py --seed-sample  # Load sample data
    python cache_seeder.py --add-zip 78701 TX  # Add specific ZIP
"""

import httpx
import os
import json
from typing import Dict, Optional
import logging

logger = logging.getLogger(__name__)


class EnvironmentalCacheSeeder:
    def __init__(self):
        self.supabase_url = os.getenv("SUPABASE_URL")
        self.supabase_key = os.getenv("SUPABASE_KEY")
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL and SUPABASE_KEY required")
    
    def seed_sample_data(self):
        """Load sample environmental data for common Texas ZIP codes"""
        sample_data = {
            "78701": {  # Downtown Austin
                "risk_level": "MEDIUM",
                "synthesis": "Urban area with existing utilities. Few environmental restrictions. Primary concerns: proximity to Colorado River, noise ordinances in central district.",
                "screening_data": {
                    "wetlands": {"risk_level": "LOW", "notes": "Limited wetlands in urban core"},
                    "endangered_species": {"risk_level": "MEDIUM", "species": ["Golden-cheeked warbler nearby"]},
                    "flood_zones": {"risk_level": "MEDIUM", "fema_zones": ["0.2% annual chance"]},
                    "noise_zones": {"risk_level": "MEDIUM", "notes": "Central district noise limits: 70dB day, 60dB night"},
                    "nepa": {"risk_level": "LOW", "notes": "Urban area, minimal NEPA review needed"},
                    "state_requirements": {"risk_level": "MEDIUM", "requirements": ["Texas Parks & Wildlife coordination"]}
                }
            },
            "75201": {  # Downtown Dallas
                "risk_level": "LOW",
                "synthesis": "Industrial/urban corridor. Good utility access. Minimal environmental constraints. Trinity River is 2+ miles away.",
                "screening_data": {
                    "wetlands": {"risk_level": "LOW", "notes": "No significant wetlands"},
                    "endangered_species": {"risk_level": "LOW", "species": []},
                    "flood_zones": {"risk_level": "LOW", "fema_zones": []},
                    "noise_zones": {"risk_level": "LOW", "notes": "Industrial zoning allows 75dB"},
                    "nepa": {"risk_level": "LOW", "notes": "Urban area"},
                    "state_requirements": {"risk_level": "LOW", "requirements": ["Standard compliance"]}
                }
            },
            "77002": {  # Downtown Houston
                "risk_level": "HIGH",
                "synthesis": "Port/industrial area with high environmental sensitivity. Near bayou system, wetlands, and refineries. Expect comprehensive environmental review.",
                "screening_data": {
                    "wetlands": {"risk_level": "HIGH", "notes": "Significant coastal prairie wetlands nearby"},
                    "endangered_species": {"risk_level": "HIGH", "species": ["Ocelot habitat potential"]},
                    "flood_zones": {"risk_level": "HIGH", "fema_zones": ["0.2% and 1% annual chance zones"]},
                    "noise_zones": {"risk_level": "MEDIUM", "notes": "Port operations, 70dB industrial limit"},
                    "nepa": {"risk_level": "HIGH", "notes": "Likely NEPA EA/EIS due to wetlands proximity"},
                    "state_requirements": {"risk_level": "HIGH", "requirements": ["TPWD permit", "Army Corps coordination", "Port Authority approval"]}
                }
            },
        }
        
        for zip_code, data in sample_data.items():
            self.add_to_cache(zip_code, "TX", data)
            print(f"✓ Seeded {zip_code}, TX: {data['risk_level']} risk")
    
    def add_to_cache(self, zip_code: str, state: str, data: Dict) -> bool:
        """Add or update environmental data in cache"""
        try:
            supabase_api_url = f"{self.supabase_url}/rest/v1/environmental_cache"
            
            payload = {
                "zip_code": zip_code,
                "state": state,
                "cached_data": data,
            }
            
            headers = {
                "apikey": self.supabase_key,
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            }
            
            with httpx.Client() as client:
                # Try to update if exists
                response = client.post(supabase_api_url, json=payload, headers=headers, timeout=10.0)
                
                if response.status_code in [200, 201]:
                    print(f"✓ Cached {zip_code}, {state} successfully")
                    return True
                else:
                    print(f"✗ Failed to cache {zip_code}, {state}: {response.text}")
                    return False
        
        except Exception as e:
            logger.error(f"Error adding to cache: {e}")
            return False
    
    def verify_cache(self):
        """Check what's currently cached"""
        try:
            supabase_api_url = f"{self.supabase_url}/rest/v1/environmental_cache"
            headers = {"apikey": self.supabase_key}
            
            with httpx.Client() as client:
                response = client.get(supabase_api_url, headers=headers, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    print(f"\n📊 Cache Status: {len(data)} ZIP codes cached")
                    for item in data:
                        risk = item["cached_data"].get("risk_level", "UNKNOWN")
                        print(f"  • {item['zip_code']}, {item['state']}: {risk} risk")
                else:
                    print(f"✗ Could not retrieve cache: {response.text}")
        except Exception as e:
            logger.error(f"Error verifying cache: {e}")


if __name__ == "__main__":
    import sys
    
    seeder = EnvironmentalCacheSeeder()
    
    if "--seed-sample" in sys.argv:
        print("🌱 Seeding sample environmental data...")
        seeder.seed_sample_data()
    
    if "--verify" in sys.argv:
        seeder.verify_cache()
    
    if "--add-zip" in sys.argv:
        idx = sys.argv.index("--add-zip")
        if idx + 2 < len(sys.argv):
            zip_code = sys.argv[idx + 1]
            state = sys.argv[idx + 2]
            print(f"📍 Manual entry mode for {zip_code}, {state}")
            print("Enter JSON data for environmental screening:")
            json_input = input()
            try:
                data = json.loads(json_input)
                seeder.add_to_cache(zip_code, state, data)
                seeder.verify_cache()
            except json.JSONDecodeError:
                print("✗ Invalid JSON")
