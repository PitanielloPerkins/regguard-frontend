# RegGuard Platform Integration Guide

## Overview

The RegGuard Platform is a **unified compliance intelligence system** that brings together multiple iterations into a single, cohesive application. This guide documents the architecture, features, and how everything works together.

## Architecture

### Frontend Structure (React + Vite)

```
frontend/
├── src/
│   ├── PlatformLayout.tsx          # Main navigation & sidebar
│   ├── PlatformDashboard.tsx       # Home page with feature grid
│   ├── platform-layout.css         # Layout styles
│   ├── PlatformDashboard.css       # Dashboard styles
│   ├── AppRouter.tsx               # Unified routing
│   ├── App.tsx                     # RegGuard Agent component
│   ├── AddressAutocomplete.tsx      # Google Maps integration
│   ├── Queue/                      # Queue Center features
│   │   ├── QueueLanding.tsx
│   │   ├── QueueUploadForm.tsx
│   │   ├── QueueMonitorDashboard.tsx
│   │   ├── StudyTranslator.tsx
│   │   └── TimelinePredictor.tsx
│   ├── DataCenterRequestForm.tsx   # B2B form
│   └── SalesLeadsDashboard.tsx     # Admin dashboard
```

### Backend Structure (FastAPI + Python)

```
backend/
├── main.py                         # Main FastAPI app
├── router.py                       # API routes
├── interconnect/                   # Queue Center logic
│   ├── endpoints.py
│   ├── auto_filler.py
│   ├── queue_monitor.py
│   ├── study_translator.py
│   ├── timeline_predictor.py
│   └── compliance_checker.py
├── jurisdiction.py                 # Compliance data
├── data_center_analysis.py         # B2B analysis
├── research_memo.py                # Research engine
├── scraper.py                      # Firecrawl integration
└── vision_agent.py                 # Gemini vision
```

## Features by Module

### 1. RegGuard Agent (Root URL: `/agent`)
**Purpose:** Autonomous compliance intelligence gathering

- **Location:** `/Users/tony_pitaniello/Desktop/reg-guard FINAL/frontend/src/App.tsx`
- **Backend:** `backend/main.py` - Research endpoints
- **APIs Used:**
  - `/api/agent/research` - Compliance research
  - `/api/agent/geocode` - Address geocoding
  - `/api/agent/jurisdiction` - Jurisdiction lookup
- **Features:**
  - Address auto-detection (Google Maps Places)
  - Job context capture
  - Voice input (Web Speech API)
  - Compliance action plans
  - PDF generation

### 2. Queue Center (Root URL: `/queue`)
**Purpose:** Auto-fill FERC/RTO forms and manage interconnection queue

**Sub-features:**

#### 2a. Queue Upload (`/queue/upload`)
- Upload interconnection study PDFs
- Extract key metrics automatically
- Backend: `backend/interconnect/endpoints.py`

#### 2b. Queue Monitor (`/queue/monitor`)
- Track RTO queue positions
- Real-time monitoring
- Backend: `backend/interconnect/queue_monitor.py`

#### 2c. Study Translator (`/queue/translator`)
- Parse PDF studies
- Extract costs, timelines, constraints
- Backend: `backend/interconnect/study_translator.py`

#### 2d. Timeline Predictor (`/queue/timeline`)
- Predict energization dates
- Based on RTO, capacity, queue position
- Backend: `backend/interconnect/timeline_predictor.py`

### 3. Data Center Analysis (Root URL: `/data-center`)
**Purpose:** B2B permitting risk assessment

- **Component:** `frontend/src/DataCenterRequestForm.tsx`
- **Backend:** `backend/data_center_analysis.py`
- **APIs:** `/api/data-center/analyze`

### 4. Sales Pipeline (Root URL: `/admin/leads`)
**Purpose:** Lead management for B2B

- **Component:** `frontend/src/SalesLeadsDashboard.tsx`
- **Backend:** Supabase integration
- **Features:** Lead tracking, conversion funnel, analytics

## Running the Platform

### Development Mode

```bash
# From repo root
npm run dev

# Or run separately:
cd frontend && npm run dev           # Terminal 1 - Vite on port 5173
cd backend && python -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload  # Terminal 2
```

### Environment Variables

**Frontend** (`frontend/.env`):
```
VITE_BACKEND_ORIGIN=http://localhost:8001
VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY
```

**Backend** (`backend/.env` or Render environment):
```
ANTHROPIC_API_KEY=YOUR_KEY
FIRECRAWL_API_KEY=YOUR_KEY
GOOGLE_MAPS_API_KEY=YOUR_KEY
SUPABASE_URL=YOUR_URL
SUPABASE_KEY=YOUR_KEY
```

## Navigation Structure

The platform uses a **unified sidebar navigation** with these top-level categories:

### Main
- **Home** (`/`) - Platform dashboard with feature overview

### Interconnection
- **Queue Center** (`/queue`) - Form auto-fill hub
- **Form Upload** (`/queue/upload`) - PDF upload
- **Queue Monitor** (`/queue/monitor`) - Position tracking
- **Study Translator** (`/queue/translator`) - Metric extraction
- **Timeline Predictor** (`/queue/timeline`) - Date prediction

### Industry
- **Data Center Analysis** (`/data-center`) - Permitting analysis

### Admin
- **Sales Pipeline** (`/admin/leads`) - Lead management

## Component Integration

### PlatformLayout
- **File:** `frontend/src/PlatformLayout.tsx`
- **Purpose:** Main layout wrapper with navigation
- **Features:**
  - Responsive sidebar (collapsible on desktop, drawer on mobile)
  - Dynamic route detection with active indicators
  - User profile section
  - Sign-out functionality

### PlatformDashboard
- **File:** `frontend/src/PlatformDashboard.tsx`
- **Purpose:** Home page with feature discovery
- **Sections:**
  - Hero banner with platform info
  - Quick stats cards
  - Feature grid with descriptions and CTAs
  - Integration showcase
  - Getting started guide

### AppRouter
- **File:** `frontend/src/AppRouter.tsx`
- **Purpose:** Route definitions and page layouts
- **Updated to:**
  - Wrap all routes in `PlatformLayout`
  - Add `PlatformDashboard` at root
  - Provide page headers for consistency

## API Integration

### Base URL
All APIs use `VITE_BACKEND_ORIGIN` (configured in env):
```javascript
const apiBase = import.meta.env.VITE_BACKEND_ORIGIN || 'http://localhost:8001';
```

### Queue APIs
```
POST   /queue/auto-fill              # Auto-fill form with extracted data
GET    /queue/history                # Get user submissions
GET    /queue/status/{submission_id} # Get status
GET    /queue/stats                  # Queue statistics
POST   /queue/monitor-queue          # Monitor queue position
POST   /queue/translate-study        # Translate PDF study
```

### Agent APIs
```
POST   /api/agent/research           # Run research
POST   /api/agent/geocode            # Geocode address
GET    /api/agent/jurisdiction       # Get jurisdiction data
```

### Data Center APIs
```
POST   /api/data-center/analyze      # Analyze project
```

## Styling System

### Design Tokens (CSS Variables)
Located in `platform-layout.css`:
```css
--primary: #6366f1
--primary-dark: #4f46e5
--bg-primary: #ffffff
--text-primary: #1e293b
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1)
```

### Component Patterns
- **Cards:** White background, subtle border, hover shadow
- **Buttons:** Primary color gradient, rounded corners, transition effects
- **Typography:** Careful hierarchy with letter-spacing and line-height
- **Spacing:** 8px/16px/24px/32px grid

## Google Maps Integration

### Setup
1. Create API key in Google Cloud Console
2. Enable APIs:
   - Maps JavaScript API
   - Places API (for autocomplete)
3. Add to `frontend/.env`:
   ```
   VITE_GOOGLE_MAPS_API_KEY=YOUR_KEY
   ```

### Usage
- **Dynamic Loading:** `frontend/src/loadGoogleMaps.ts`
- **Autocomplete Component:** `frontend/src/AddressAutocomplete.tsx`
- Automatically initializes on app load
- Includes Places library for autocomplete

## Deployment

### Vercel (Frontend)
- **Configuration:** `vercel.json`
- **Build Command:** `cd frontend && npm ci && npm run build`
- **Output Directory:** `frontend/dist`
- **Environment:** Set `VITE_GOOGLE_MAPS_API_KEY` in Vercel dashboard

### Render (Backend)
- **Service:** Python Web Service
- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `python -m uvicorn main:app --host 0.0.0.0 --port $PORT`
- **Environment:** Set all API keys in Render dashboard

## Custom Domain Setup (regguardagent.com)

### Vercel
1. Go to project settings → Domains
2. Add domain: `regguardagent.com`
3. Vercel will provide nameservers: `ns1.vercel-dns.com`, `ns2.vercel-dns.com`

### Squarespace
1. Log into Squarespace account
2. Domain settings → Nameservers
3. Replace Squarespace nameservers with Vercel's
4. Wait for propagation (up to 48 hours)

## Monitoring & Debugging

### Frontend
- Browser DevTools Console for React errors
- Network tab for API calls (check `VITE_BACKEND_ORIGIN`)
- Local storage for debugging auth/state

### Backend
- Uvicorn logs in terminal
- FastAPI auto-docs at `http://localhost:8001/docs`
- CORS settings in `main.py` for troubleshooting

### Common Issues

**Frontend blank page:**
- Check browser console for errors
- Verify `VITE_BACKEND_ORIGIN` is set correctly
- Clear browser cache (hard refresh: Cmd+Shift+R)

**Address autocomplete not working:**
- Verify `VITE_GOOGLE_MAPS_API_KEY` is set
- Check Google Cloud Console for API enablement (Places API)
- Verify API key domain restrictions include your domain

**Backend 500 errors:**
- Check Uvicorn logs in terminal
- Verify all required API keys are set
- Check database connections (Supabase, etc.)

**CORS errors:**
- Verify frontend URL is in `CORSMiddleware` origins
- Check Content-Type headers in requests
- Ensure credentials are included if needed

## Performance Optimization

### Frontend
- Code splitting with React Router
- Lazy loading of heavy components
- Image optimization
- CSS modules for scoped styling

### Backend
- Query caching for jurisdiction data
- PDF generation streaming
- Async API calls
- Database connection pooling

## Future Enhancements

1. **Authentication:** Add user accounts and auth flow
2. **Real-time Updates:** WebSocket for queue monitoring
3. **Mobile App:** React Native or Flutter wrapper
4. **Advanced Analytics:** Dashboard for usage metrics
5. **Integrations:** Direct FERC/PJM system connections
6. **AI Improvements:** Expanded Gemini vision for document analysis

## Support & Documentation

- **Docs:** `https://docs.regguard.io` (placeholder)
- **Support Email:** `support@regguard.com`
- **Sales Email:** `sales@regguard.com`
- **GitHub:** `https://github.com/PitanielloPerkins/regguard`
