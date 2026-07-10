# RegGuard Platform - System Architecture

## High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    RegGuard Agent Platform                      │
│                   (Unified SaaS Solution)                       │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
    ┌────▼─────┐         ┌────▼─────┐        ┌────▼─────┐
    │ Frontend  │         │ Backend   │        │ External  │
    │ (Vite)    │         │ (FastAPI) │        │ Services  │
    └───────────┘         └───────────┘        └───────────┘
         │                    │                    │
         ├─ React Router      ├─ Endpoint Routes  ├─ Google Maps
         ├─ State Mgmt        ├─ Business Logic   ├─ Gemini Vision
         ├─ UI Components     ├─ Data Processing  ├─ Firecrawl
         └─ API Client        ├─ Auth/Security    ├─ Supabase
                              └─ Caching Layers   └─ Stripe
```

## Component Breakdown

### Frontend Layer

#### 1. Platform Navigation (`PlatformLayout`)
```typescript
PlatformLayout
├── Sidebar Navigation
│   ├── Main (Home)
│   ├── Interconnection (Queue features)
│   ├── Industry (Data Center)
│   └── Admin (Sales)
├── Responsive Design
│   ├── Desktop: Collapsible sidebar
│   ├── Tablet: Icon-only sidebar
│   └── Mobile: Drawer navigation
└── User Profile Section
    ├── Avatar
    ├── Name/Email
    └── Sign Out
```

#### 2. Routing System (`AppRouter`)
```typescript
AppRouter
├── Route: / → PlatformDashboard
├── Route: /queue → QueueLanding
├── Route: /queue/upload → QueueUploadForm
├── Route: /queue/monitor → QueueMonitorDashboard
├── Route: /queue/translator → StudyTranslator
├── Route: /queue/timeline → TimelinePredictor
├── Route: /data-center → DataCenterRequestForm
├── Route: /admin/leads → SalesLeadsDashboard
└── Fallback: * → Navigate to /
```

#### 3. Dashboard Components
```typescript
PlatformDashboard
├── Hero Section
│   ├── Welcome message
│   ├── Platform description
│   └── Badge system
├── Stats Cards
│   ├── Forms completed
│   ├── Queue positions tracked
│   └── Projects analyzed
├── Feature Grid
│   ├── RegGuard Agent
│   ├── Queue Center
│   ├── Study Translator
│   ├── Timeline Predictor
│   ├── Queue Monitor
│   └── Data Center Analysis
└── Getting Started
    ├── Step-by-step guide
    └── Integration showcase
```

### Backend Layer

#### 1. Main Application (`main.py`)
```python
FastAPI App
├── Middleware
│   ├── CORS Configuration
│   ├── Request Logging
│   └── Error Handling
├── Core Routes
│   ├── /api/agent/* - RegGuard Agent
│   ├── /queue/* - Queue Center
│   ├── /api/data-center/* - B2B Analysis
│   └── /health - Health check
└── External Integrations
    ├── Stripe webhooks
    ├── Supabase client
    └── Google/Gemini APIs
```

#### 2. Business Logic Modules
```
interconnect/
├── auto_filler.py      → Form auto-fill logic
├── queue_monitor.py    → Real-time queue tracking
├── study_translator.py → PDF parsing & extraction
├── timeline_predictor.py → Date prediction algorithm
└── compliance_checker.py → Regulatory validation

jurisdiction.py        → Compliance data & caching
data_center_analysis.py → Permitting risk assessment
research_memo.py       → Research generation engine
scraper.py            → Firecrawl integration
vision_agent.py       → Gemini vision processing
```

#### 3. Data Processing Pipeline
```
Input (User)
    ↓
┌───────────────────────────┐
│ Data Validation           │
│ └─ Schema verification    │
└─────────────┬─────────────┘
              ↓
┌───────────────────────────┐
│ Processing                │
│ ├─ PDF parsing            │
│ ├─ Address geocoding      │
│ └─ Data extraction        │
└─────────────┬─────────────┘
              ↓
┌───────────────────────────┐
│ Enrichment                │
│ ├─ Jurisdiction lookup    │
│ ├─ Compliance checking    │
│ └─ RTO data fetching      │
└─────────────┬─────────────┘
              ↓
┌───────────────────────────┐
│ Caching                   │
│ ├─ Jurisdiction cache     │
│ ├─ Research cache         │
│ └─ TTL management         │
└─────────────┬─────────────┘
              ↓
Output (Response)
```

### Data Flow

#### User Submission Flow
```
Frontend Form Submit
    ↓
POST /api/endpoint
    ↓
Backend Validation
    ↓
Data Processing
    ├─ Cache Check (hit: return cached)
    └─ Cache Miss: Process
        ├─ Extract data
        ├─ Enrich data
        ├─ Generate response
        └─ Cache result (TTL)
    ↓
Send Response
    ↓
Frontend Update
```

#### Research Flow (Agent)
```
User Enters Address + Context
    ↓
Address Geocoding
    ↓
Jurisdiction Lookup (cached)
    ↓
Compliance Data Gathering
    ├─ Firecrawl search
    ├─ Cache intercept
    └─ Parse results
    ↓
Research Memo Generation
    ├─ Summarization
    ├─ Risk identification
    └─ Action plan creation
    ↓
PDF Generation (if requested)
    ↓
Response to Frontend
```

## API Contract

### Base URL
```
Development: http://localhost:8001
Production: https://regguard-api.onrender.com
```

### Request Headers
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}" // Optional for auth endpoints
}
```

### Response Format
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "message": "Human-readable message",
  "timestamp": "2026-07-08T22:00:00Z"
}
```

## Database Schema (Supabase)

### Tables

#### users
```sql
id: UUID (PK)
email: TEXT
name: TEXT
tier: ENUM (free, pro, enterprise)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

#### submissions
```sql
id: UUID (PK)
user_id: UUID (FK)
form_type: TEXT (queue, data_center, agent)
data: JSONB
created_at: TIMESTAMP
completed_at: TIMESTAMP
status: ENUM (draft, submitted, completed)
```

#### leads
```sql
id: UUID (PK)
project_name: TEXT
location: TEXT
type: TEXT (data_center)
contact_info: JSONB
created_at: TIMESTAMP
status: ENUM (new, contacted, qualified, proposal, closed)
```

#### cache_jurisdiction
```sql
query_hash: TEXT (PK)
location: TEXT
state: TEXT
data: JSONB
ttl_expires: TIMESTAMP
```

## Security Architecture

### Authentication
```
┌─────────────────────────────────────────┐
│ OAuth/Custom Auth (Future)              │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ JWT Token Generation (Stripe/Supabase)  │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Token Validation on Each Request        │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Rate Limiting & Throttling              │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│ Access Granted / Denied                 │
└─────────────────────────────────────────┘
```

### API Key Management
```
Production Keys (Render environment variables):
├─ ANTHROPIC_API_KEY
├─ FIRECRAWL_API_KEY
├─ GOOGLE_MAPS_API_KEY
├─ SUPABASE_URL & SUPABASE_KEY
└─ STRIPE_* (for payments)
```

### CORS Configuration
```python
# Allowed origins
["http://localhost:3000", "http://localhost:5173", "https://regguardagent.com"]

# Allowed methods
["GET", "POST", "PUT", "DELETE"]

# Allowed headers
["Content-Type", "Authorization"]
```

## Performance Characteristics

### Frontend
- **Bundle Size:** ~450KB (gzipped)
- **Time to Interactive:** < 2s
- **Lighthouse Score:** 85+
- **Mobile Optimization:** Responsive design with mobile-first CSS

### Backend
- **Average Response Time:** < 500ms (cached), < 2s (uncached)
- **Concurrency:** 100+ simultaneous connections
- **Caching:** Multi-layer (jurisdiction, research, metadata)
- **Database Queries:** Optimized with indexes

### Scaling
```
Frontend:
├─ Vercel automatic scaling
├─ CDN distribution
└─ Edge caching

Backend:
├─ Render horizontal scaling
├─ Connection pooling
├─ Database query optimization
└─ Async processing for heavy tasks
```

## Deployment Pipeline

### Development
```
Local dev server (npm run dev)
├─ Frontend: Vite hot reload
└─ Backend: Uvicorn auto-reload
```

### Staging
```
Git branch: staging
├─ Frontend: Vercel preview
└─ Backend: Render test instance
```

### Production
```
Git branch: main
├─ Frontend: Vercel production
│  └─ Custom domain: regguardagent.com
├─ Backend: Render production
│  └─ Auto-redeploy on push
└─ Database: Supabase production
```

### CI/CD
```
GitHub Push (main branch)
    ↓
Vercel Build Trigger
├─ Run: npm ci && npm run build
└─ Deploy frontend
    ↓
Render Auto-Deploy
├─ Python dependencies install
└─ Deploy backend
    ↓
Health Check
├─ Verify endpoints
└─ Smoke tests
```

## Error Handling

### Frontend
```typescript
try {
  const response = await fetch(endpoint);
  if (!response.ok) throw new HTTPError(response.status);
  return response.json();
} catch (error) {
  console.error('API Error:', error);
  toast.error('Something went wrong');
}
```

### Backend
```python
@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": str(exc),
            "error_type": type(exc).__name__
        }
    )
```

## Monitoring & Logging

### Frontend
- Browser console for dev errors
- Error boundary for React crashes
- API request logging (network tab)

### Backend
- Uvicorn access/error logs
- Custom application logging
- Sentry integration (optional)
- Performance metrics

### Production Monitoring
```
Alerts configured for:
├─ 5xx errors
├─ High response times (> 5s)
├─ Database connection failures
├─ API rate limit exceeded
└─ Deployment failures
```

## Architecture Decisions

### Why Monorepo?
- Shared types/utilities
- Unified deployment
- Easier testing
- Single source of truth for versioning

### Why Vercel + Render?
- Vercel: Optimized for React/Node apps
- Render: Better Python support
- Both have free tiers (ideal for SaaS launch)
- Easy custom domain management

### Why Supabase?
- PostgreSQL reliability
- Built-in Auth (future)
- Real-time subscriptions
- Low cost for early-stage
- Good TypeScript support

### Why Firecrawl?
- Intelligent web scraping
- Auto-parsing of content
- Cost-effective vs. manual APIs
- Easy integration

## Future Architecture Improvements

### 1. Microservices Extraction
```
Current: Monolith Backend
→ Future: Separate services
  ├─ Queue Service
  ├─ Research Service
  ├─ PDF Generator Service
  └─ Cache Service
```

### 2. Message Queue
```
Add Celery/Bull for:
├─ Async PDF generation
├─ Batch processing
├─ Scheduled jobs
└─ Background research
```

### 3. GraphQL API
```
Current: REST endpoints
→ Future: GraphQL for
  ├─ Flexible querying
  ├─ Reduced over-fetching
  └─ Better caching
```

### 4. Kubernetes Deployment
```
Current: Vercel + Render
→ Future: K8s cluster for
  ├─ Auto-scaling
  ├─ Self-healing
  └─ Multi-region
```
