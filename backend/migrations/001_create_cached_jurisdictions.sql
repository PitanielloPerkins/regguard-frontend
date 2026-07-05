-- Migration: Create cached_jurisdictions global lookup table with RLS
-- Purpose: Global multi-tenant municipality cache to eliminate redundant API calls
-- Created: 2026-06-26

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the cached_jurisdictions table
CREATE TABLE IF NOT EXISTS public.cached_jurisdictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zip_code VARCHAR(10) NOT NULL,
  city TEXT,
  state VARCHAR(2),
  firecrawl_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Unique constraint on zip_code for efficient lookups
  CONSTRAINT unique_zip_code UNIQUE(zip_code)
);

-- Create index on zip_code for fast lookups
CREATE INDEX IF NOT EXISTS idx_cached_jurisdictions_zip_code 
  ON public.cached_jurisdictions(zip_code);

-- Create index on state for filtering by state
CREATE INDEX IF NOT EXISTS idx_cached_jurisdictions_state 
  ON public.cached_jurisdictions(state);

-- Create index on created_at for cache invalidation queries
CREATE INDEX IF NOT EXISTS idx_cached_jurisdictions_created_at 
  ON public.cached_jurisdictions(created_at DESC);

-- Create GIN index on firecrawl_payload for JSONB queries
CREATE INDEX IF NOT EXISTS idx_cached_jurisdictions_payload_gin 
  ON public.cached_jurisdictions USING gin(firecrawl_payload);

-- ========== Row Level Security (RLS) Configuration ==========

-- Enable RLS on the table
ALTER TABLE public.cached_jurisdictions ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow all authenticated users to SELECT (read) from cached_jurisdictions
-- This is a global cache - anyone on the platform can read any jurisdiction data
CREATE POLICY "Allow authenticated users to read cached jurisdictions"
  ON public.cached_jurisdictions
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy 2: Allow only authenticated admins/service role to INSERT new cached jurisdictions
-- Only Supabase service role or designated admin can populate the cache
CREATE POLICY "Allow service role to insert cached jurisdictions"
  ON public.cached_jurisdictions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Check if user has admin role (you can customize this based on your auth model)
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = TRUE
    )
  );

-- Policy 3: Allow service role to UPDATE cached jurisdictions
CREATE POLICY "Allow service role to update cached jurisdictions"
  ON public.cached_jurisdictions
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = TRUE
    )
  );

-- Policy 4: Allow service role to DELETE cached jurisdictions
CREATE POLICY "Allow service role to delete cached jurisdictions"
  ON public.cached_jurisdictions
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = TRUE
    )
  );

-- ========== Grant Permissions ==========

-- Grant necessary permissions to authenticated role
GRANT SELECT ON public.cached_jurisdictions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cached_jurisdictions TO authenticated;

-- Grant permissions to anon role (for pre-auth lookups if needed)
GRANT SELECT ON public.cached_jurisdictions TO anon;

-- Grant sequence permissions if using SERIAL instead of UUID
-- (not needed with UUID, but included for reference)
-- GRANT USAGE, SELECT ON SEQUENCE public.cached_jurisdictions_id_seq TO authenticated;

-- ========== Add Comment for Documentation ==========

COMMENT ON TABLE public.cached_jurisdictions IS 
  'Global multi-tenant cache for municipality jurisdictions. Eliminates redundant Firecrawl API calls. All authenticated users can read; only admins can write.';

COMMENT ON COLUMN public.cached_jurisdictions.id IS 
  'Unique identifier for each cached jurisdiction record.';

COMMENT ON COLUMN public.cached_jurisdictions.zip_code IS 
  'US ZIP code (5 digits). Unique constraint ensures one record per ZIP.';

COMMENT ON COLUMN public.cached_jurisdictions.city IS 
  'City name associated with the ZIP code.';

COMMENT ON COLUMN public.cached_jurisdictions.state IS 
  'Two-letter state abbreviation (e.g., TX, CA, NY).';

COMMENT ON COLUMN public.cached_jurisdictions.firecrawl_payload IS 
  'JSONB containing extracted markdown from Firecrawl /search result. Stores permit info, building codes, etc.';

COMMENT ON COLUMN public.cached_jurisdictions.created_at IS 
  'Timestamp when the cache entry was created. Used for cache invalidation and TTL strategies.';
