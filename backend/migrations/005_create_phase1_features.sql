-- Phase 1: FERC-to-Bankable Financial Modeling

CREATE TABLE IF NOT EXISTS capital_readiness_briefs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  study_id UUID,
  project_name TEXT NOT NULL,
  project_capacity_mw NUMERIC(10, 2),
  technology TEXT,
  location TEXT,
  rto TEXT,
  base_capex NUMERIC(15, 2),
  interconnection_cost NUMERIC(15, 2),
  total_capex NUMERIC(15, 2),
  permitting_contingency_percent NUMERIC(5, 2),
  tax_credits_identified JSONB,
  capital_scenarios JSONB,
  capacity_factor_percent NUMERIC(5, 2),
  annual_om_cost_per_kw NUMERIC(8, 2),
  power_cost_escalation_percent NUMERIC(5, 2),
  bankability_scorecard JSONB,
  executive_summary TEXT,
  next_steps TEXT[],
  brief_pdf_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_capital_briefs_user_id ON capital_readiness_briefs(user_id);

ALTER TABLE capital_readiness_briefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS users_can_view_own_briefs ON capital_readiness_briefs FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS ferc_pdf_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  submission_id TEXT UNIQUE,
  form_type TEXT NOT NULL,
  form_data JSONB NOT NULL,
  accuracy_report JSONB,
  pdf_filename TEXT,
  pdf_url TEXT,
  ferc_format_compliant BOOLEAN,
  filing_instructions TEXT,
  status TEXT DEFAULT 'draft',
  submitted_to_rto_date TIMESTAMP,
  filed_with_ferc_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ferc_submissions_user_id ON ferc_pdf_submissions(user_id);

ALTER TABLE ferc_pdf_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS users_can_view_own_ferc_submissions ON ferc_pdf_submissions FOR SELECT USING (auth.uid() = user_id);
