# RegGuard Queue: FERC/Interconnection Form Automation

## Current Status

**Phase 1 MVP Complete** ✅

- ✅ Frontend landing page with professional design
- ✅ Auto-fill form submission interface  
- ✅ Backend API endpoints (stubbed with mock data)
- ✅ Result display with accuracy reporting
- ✅ TypeScript + React + Vite setup
- ✅ Git repository with full version control

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### To Run Locally

```bash
# From the repo root

# Terminal 1: Start backend (simple Node.js server on port 8000)
node - << 'BACKEND'
const http = require('http');
const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');
  
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  
  if (req.method === 'POST' && req.url === '/queue/auto-fill') {
    const response = {
      submission_id: 'queue_' + Date.now(),
      form_type: 'ferc_556',
      filled_form: {
        applicant_name: 'Acme Solar LLC',
        project_name: 'Acme Solar Farm Phase 1',
        capacity_mw: 10.0,
        project_location_state: 'Colorado',
        project_county: 'Denver County',
      },
      accuracy_report: {
        overall_confidence: 0.92,
        required_fields_filled: 14,
        total_required_fields: 15,
        ready_for_submission: true
      },
      ready_for_export: true
    };
    res.writeHead(200);
    res.end(JSON.stringify(response));
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({error: 'Not found'}));
});

server.listen(8000, '127.0.0.1');
console.log('Backend running on http://localhost:8000');
BACKEND

# Terminal 2: Start frontend (from frontend folder)
cd frontend
npm install
npm run dev
```

Then open: **http://localhost:5173/queue/upload**

## Architecture

```
Frontend (React/Vite)
  └─ /queue/upload (auto-fill form)
  └─ /queue (landing page)
     │
     └─ fetch to http://localhost:8000/queue/auto-fill
        │
        Backend (Node.js)
        └─ Returns mock auto-filled form data
```

## Key Files

- `frontend/src/Queue/QueueUploadForm.tsx` - Main form component (beautiful gradient design)
- `frontend/src/Queue/QueueLanding.tsx` - Marketing landing page
- `backend/interconnect/` - Queue module (renamed from `queue` to avoid stdlib conflict)

## Next Steps

### To Make This Production-Ready:

1. **Replace mock backend** with real Claude LLM integration
   - File: `backend/interconnect/auto_filler.py` (existing, needs integration)
   - Switch from mock data to actual Claude API calls

2. **Implement PDF generation**
   - File: `backend/interconnect/pdf_generator.py` (existing, needs testing)
   - Add fpdf2-based form rendering

3. **Add database persistence**
   - Supabase is already configured
   - Migration files exist: `backend/migrations/003_create_queue_submissions.sql`

4. **Deploy**
   - Frontend: Vercel (npm run build → deploy `dist/`)
   - Backend: Vercel serverless or Railway or Render.com

## Known Issues

- Backend needs to be integrated with real Claude API (currently returns mock data)
- PDF generation needs testing
- Database connections need to be activated

## Documentation

- Full roadmap: See `REGGUARD_QUEUE_ROADMAP.md`
- Implementation notes: See `PHASE_1_SUMMARY.md`

