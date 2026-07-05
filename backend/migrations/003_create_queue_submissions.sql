-- RegGuard Queue: Interconnection form submissions table
-- Stores user submissions for FERC/PJM/MISO/ERCOT forms

CREATE TABLE queue_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Form metadata
  form_type VARCHAR(50) NOT NULL, -- 'ferc_556', 'ferc_557', 'pjm_nextgen', 'miso'
  submission_status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'submitted', 'accepted', 'rejected', 'completed'
  
  -- Project details
  project_name VARCHAR(255),
  company_name VARCHAR(255),
  facility_type VARCHAR(50), -- 'Solar', 'Wind', 'Battery', 'Hydro', 'Natural Gas'
  capacity_mw DECIMAL(10, 2),
  location_state VARCHAR(2),
  location_county VARCHAR(100),
  rto VARCHAR(20), -- 'PJM', 'MISO', 'WECC', 'ERCOT'
  
  -- Form data
  filled_form_data JSONB NOT NULL, -- Complete filled form data
  accuracy_score DECIMAL(3, 2), -- 0.0 to 1.0
  validation_errors TEXT[], -- Any validation warnings
  
  -- PDF storage
  pdf_url VARCHAR(500),
  pdf_generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Submission tracking
  source_data TEXT, -- Original text/PDF that was processed
  user_overrides JSONB, -- User-provided field overrides
  submitted_to_rto_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  submitted_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Create indexes for common queries
CREATE INDEX idx_queue_submissions_user_id ON queue_submissions(user_id);
CREATE INDEX idx_queue_submissions_form_type ON queue_submissions(form_type);
CREATE INDEX idx_queue_submissions_status ON queue_submissions(submission_status);
CREATE INDEX idx_queue_submissions_created_at ON queue_submissions(created_at DESC);

-- Enable RLS
ALTER TABLE queue_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can only see their own submissions
CREATE POLICY "Users can view own submissions"
  ON queue_submissions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create submissions"
  ON queue_submissions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own submissions"
  ON queue_submissions FOR UPDATE
  USING (auth.uid() = user_id);

-- Create audit log table for form submissions
CREATE TABLE queue_submission_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES queue_submissions(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'created', 'filled', 'submitted', 'verified', 'completed'
  event_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_queue_submission_events_submission_id ON queue_submission_events(submission_id);

-- Create table for form templates (future: user-saved templates)
CREATE TABLE queue_form_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  template_name VARCHAR(255) NOT NULL,
  form_type VARCHAR(50) NOT NULL,
  
  -- Template data (pre-filled fields that user can reuse)
  template_data JSONB NOT NULL,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_queue_form_templates_user_id ON queue_form_templates(user_id);

ALTER TABLE queue_form_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own templates"
  ON queue_form_templates FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create templates"
  ON queue_form_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);
