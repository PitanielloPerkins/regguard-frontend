-- Phase 0: Tier 1 Features - Queue Monitoring, Study Translator, Timeline Predictor, Site Compliance

CREATE TABLE IF NOT EXISTS interconnect_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  rto TEXT NOT NULL,
  queue_position INT,
  current_phase TEXT,
  phase_changed_at TIMESTAMP,
  expected_study_start_date DATE,
  expected_study_end_date DATE,
  next_milestone TEXT,
  next_milestone_date DATE,
  study_deposit_due DATE,
  study_deposit_amount NUMERIC(15, 2),
  last_tracked_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id, rto)
);

CREATE INDEX IF NOT EXISTS idx_interconnect_tracking_user_id ON interconnect_tracking(user_id);

ALTER TABLE interconnect_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS users_can_view_own_tracked_projects ON interconnect_tracking FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS interconnect_studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  study_id TEXT UNIQUE NOT NULL,
  rto TEXT NOT NULL,
  study_type TEXT NOT NULL,
  network_upgrade_cost NUMERIC(15, 2),
  network_upgrades JSONB,
  study_deposit_required NUMERIC(15, 2),
  commercial_readiness_deposit NUMERIC(15, 2),
  estimated_study_duration_months INT,
  key_constraints TEXT[],
  curtailability_option_available BOOLEAN,
  estimated_energization_date DATE,
  extracted_at TIMESTAMP DEFAULT NOW(),
  is_latest BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, project_id, study_type)
);

CREATE INDEX IF NOT EXISTS idx_interconnect_studies_user_id ON interconnect_studies(user_id);

ALTER TABLE interconnect_studies ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS users_can_view_own_studies ON interconnect_studies FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS timeline_predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL,
  project_capacity_mw NUMERIC(10, 2),
  rto TEXT NOT NULL,
  queue_position INT,
  study_track TEXT,
  predicted_study_completion_date DATE,
  predicted_energization_date DATE,
  confidence_interval_months INT,
  comparable_projects JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timeline_predictions_user_id ON timeline_predictions(user_id);

ALTER TABLE timeline_predictions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS users_can_view_own_predictions ON timeline_predictions FOR SELECT USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS site_compliance_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  site_location TEXT NOT NULL,
  facility_type TEXT NOT NULL,
  capacity_mw NUMERIC(10, 2),
  overall_risk_level TEXT,
  risk_score NUMERIC(3, 1),
  compliance_items JSONB,
  critical_path_regulations TEXT[],
  parallel_workstreams JSONB,
  estimated_total_timeline_months INT,
  jurisdiction_id TEXT,
  extracted_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_site_compliance_user_id ON site_compliance_checklists(user_id);

ALTER TABLE site_compliance_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS users_can_view_own_compliance ON site_compliance_checklists FOR SELECT USING (auth.uid() = user_id);
