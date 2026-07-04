# Phase 0 & Phase 1 Roadmap

## Phase 0: Tier 1 (Weeks 1-6) - $30-70K MRR

### 0.1 Queue Monitor
- Track projects through PJM/MISO/ERCOT queues
- Alert on deposit deadlines, phase changes
- `POST /queue/monitor-queue`

### 0.2 Study Translator  
- Upload RTO study PDF
- Extract costs, timelines, constraints via Claude
- `POST /queue/translate-study`

### 0.3 Timeline Predictor
- ML model predicts energization date
- Historical RTO data + comparable projects
- `POST /queue/predict-timeline`

### 0.4 Compliance Checklist
- Site-specific regulations & requirements
- Critical path analysis + timeline
- `POST /queue/compliance-checklist`

## Phase 1: Financial (Weeks 7-14) - $500K-$1.5M ARR

### 1.1 FERC Form 556 Exact-Format PDF
- Fill official template with exact field matching
- Pass FERC eFiling portal validation
- Integration: `POST /queue/auto-fill`

### 1.2 Study Result Parser
- Parse interconnection studies
- Extract upgrade costs, deposits, constraints
- Store in `interconnect_studies` table

### 1.3 Capital Readiness Modeling
- Project capex + interconnection + tax credits
- Capital stack scenarios (Conservative/Moderate/Aggressive)
- Bankability scorecard (5-factor green/yellow/red)

### 1.4 Bankable Brief Generation
- Multi-page PDF for investors
- Executive summary, financial, capital stack, risks
- Export: PDF, CSV, JSON, email

## Database Tables

**Phase 0**:
- interconnect_tracking
- interconnect_studies
- timeline_predictions
- site_compliance_checklists
- tier1_usage_tracking

**Phase 1**:
- capital_readiness_briefs
- ferc_pdf_submissions
- brief_exports
- phase1_usage_tracking

All tables include Row Level Security (RLS) for user privacy.

## Timeline

| Week | Phase 0 | Phase 1 | Milestone |
|---|---|---|---|
| 1-2 | Queue + Translator | - | Core modules ✓ |
| 3-4 | Timeline + Compliance | - | Modules ✓ |
| 5-6 | Deploy + Go-live | PDF engine | $30-70K MRR |
| 7-8 | Optimize | Study parser | |
| 9-10 | Monitor | Capital model | Phase 1 core ✓ |
| 11-12 | - | Brief generator | |
| 13-14 | - | Lender outreach | Ready to scale |

## Success Metrics

Phase 0: $30-70K MRR by week 6
Phase 1: $500K-$1.5M ARR by week 14

See QUICK_START_GUIDE.md for setup instructions.
