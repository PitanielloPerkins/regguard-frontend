-- Migration: Create data_center_leads table for B2B permitting analysis requests
-- Purpose: Capture and track data center project analysis requests
-- Created: 2026-06-27

-- Enable required extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the data_center_leads table
CREATE TABLE IF NOT EXISTS public.data_center_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Requester info
  requester_name VARCHAR(255) NOT NULL,
  requester_email VARCHAR(255) NOT NULL,
  requester_phone VARCHAR(20),
  company_name VARCHAR(255) NOT NULL,
  role VARCHAR(100),  -- e.g., "Data Center Developer", "Construction Firm", "Consultant"
  
  -- Project info
  project_address TEXT NOT NULL,
  project_city VARCHAR(100),
  project_state VARCHAR(2),
  projected_mw INTEGER,  -- Megawatts
  expected_timeline_months INTEGER,
  
  -- Analysis results (populated after analysis runs)
  risk_score INTEGER,  -- 0-100
  risk_level VARCHAR(20),  -- low, medium, high
  estimated_timeline_months INTEGER,
  critical_blockers JSONB,  -- Array of blocker strings
  recommendations JSONB,  -- Array of recommendation strings
  analysis_result JSONB,  -- Full analysis response
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'new',  -- new, contacted, analysis_sent, qualified, disqualified, converted
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  last_contacted_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_data_center_leads_email 
  ON public.data_center_leads(requester_email);

CREATE INDEX IF NOT EXISTS idx_data_center_leads_company 
  ON public.data_center_leads(company_name);

CREATE INDEX IF NOT EXISTS idx_data_center_leads_state 
  ON public.data_center_leads(project_state);

CREATE INDEX IF NOT EXISTS idx_data_center_leads_status 
  ON public.data_center_leads(status);

CREATE INDEX IF NOT EXISTS idx_data_center_leads_created_at 
  ON public.data_center_leads(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_data_center_leads_risk_score 
  ON public.data_center_leads(risk_score);

-- Enable RLS
ALTER TABLE public.data_center_leads ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated service role to read all leads (admin dashboard)
CREATE POLICY "Allow service role to read all leads"
  ON public.data_center_leads
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = TRUE
    )
  );

-- Policy: Allow service role to insert leads (webhook from form)
CREATE POLICY "Allow service role to insert leads"
  ON public.data_center_leads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND is_admin = TRUE
    )
  );

-- Policy: Allow service role to update leads (status changes, analysis results)
CREATE POLICY "Allow service role to update leads"
  ON public.data_center_leads
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

-- Grant permissions
GRANT SELECT ON public.data_center_leads TO authenticated;
GRANT INSERT, UPDATE ON public.data_center_leads TO authenticated;

-- Add comments for documentation
COMMENT ON TABLE public.data_center_leads IS 
  'B2B leads for data center permitting analysis. Stores inquiry data and analysis results.';

COMMENT ON COLUMN public.data_center_leads.risk_score IS 
  'Permitting risk score (0-100). Higher = more risk/longer timeline.';

COMMENT ON COLUMN public.data_center_leads.status IS 
  'Lead lifecycle: new → contacted → analysis_sent → qualified → converted';
