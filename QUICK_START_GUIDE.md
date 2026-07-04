# Quick Start Guide

## Step 1: Apply Database Migrations

Go to Supabase SQL Editor and run:
1. Copy SQL from `backend/migrations/004_create_tier1_features.sql` → Run
2. Copy SQL from `backend/migrations/005_create_phase1_features.sql` → Run

## Step 2: Start Backend

```bash
cd backend
python3 main.py
```

## Step 3: Test Endpoints

```bash
# Test timeline predictor
curl -X POST "http://localhost:8000/queue/predict-timeline?rto=PJM&project_capacity_mw=100"

# Test compliance checklist
curl -X POST "http://localhost:8000/queue/compliance-checklist" \
  -d '{"site_location":"Denver, CO","facility_type":"data_center","capacity_mw":50}'

# See all endpoints
open http://localhost:8000/docs
```

## Step 4: Build Frontend

```bash
cd frontend
npm run dev
```

Add React components in `/frontend/src/Queue/`:
- QueueMonitorDashboard.tsx
- StudyTranslatorPage.tsx
- TimelinePredictor.tsx
- ComplianceChecklistPage.tsx

## Documentation

- API Endpoints: See `backend/interconnect/endpoints.py`
- Roadmap Details: See `PHASE_0_1_ROADMAP.md`
- Build Status: See `BUILD_COMPLETE.md`
- Database Schema: See migration SQL files

## Troubleshooting

- ModuleNotFoundError: Ensure you're in `/backend` directory
- CORS errors: Check frontend is calling `http://localhost:8000`
- Port 8000 in use: `lsof -i :8000` and kill process
- Database errors: Run Supabase migrations

Next: See PHASE_0_1_ROADMAP.md for detailed timeline.
