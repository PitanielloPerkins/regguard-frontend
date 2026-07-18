-- Migration 007: Environmental Cache Table
-- Purpose: Cache environmental screening results by ZIP code / state
-- This allows FREE tier to avoid expensive Firecrawl calls
-- Cost: Database storage (~$0.01/GB on Supabase) vs. $0.10+ per Firecrawl call

CREATE TABLE IF NOT EXISTS environmental_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zip_code VARCHAR(10) NOT NULL,
    state VARCHAR(2) NOT NULL,
    cached_data JSONB NOT NULL,
    cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '90 days',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by ZIP + state
CREATE INDEX IF NOT EXISTS idx_env_cache_zip_state ON environmental_cache(zip_code, state);
CREATE INDEX IF NOT EXISTS idx_env_cache_expires ON environmental_cache(expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE environmental_cache ENABLE ROW LEVEL SECURITY;

-- Public read policy (anyone can read cached data, no auth required)
CREATE POLICY "Enable read access for all users" ON environmental_cache
    FOR SELECT
    USING (true);

-- Service role write policy (only backend can write)
CREATE POLICY "Enable insert/update for service role" ON environmental_cache
    FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Sample cached data structure (for documentation):
-- {
--   "risk_level": "LOW",
--   "synthesis": "This area has minimal environmental restrictions...",
--   "screening_data": {
--     "wetlands": { "risk_level": "LOW", "notes": "No mapped wetlands in ZIP" },
--     "endangered_species": { "risk_level": "LOW", "species_count": 0 },
--     "flood_zones": { "risk_level": "MEDIUM", "fema_zones": ["0.2% annual chance"] },
--     "noise_zones": { "risk_level": "LOW", "notes": "Industrial zoning allows high noise" },
--     "nepa": { "risk_level": "LOW", "notes": "Previous EAs available" },
--     "state_requirements": { "risk_level": "MEDIUM", "requirements": ["State environmental review required"] }
--   }
-- }
