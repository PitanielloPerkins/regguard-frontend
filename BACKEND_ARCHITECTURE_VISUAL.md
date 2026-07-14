# 🏗️ Backend Free Trial Architecture — Visual Guide

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REGGUARD FREE TRIAL SYSTEM                      │
└─────────────────────────────────────────────────────────────────────────┘

                            FRONTEND (Vercel)
                         ┌──────────────────┐
                         │ /free-trial      │
                         │ Form Page        │
                         │ (React)          │
                         └────────┬─────────┘
                                  │
                    POST /free-trial (JSON)
                                  │
                                  ▼
        ┌────────────────────────────────────────────────┐
        │          BACKEND (Render FastAPI)              │
        │                                                │
        │  ┌──────────────────────────────────────────┐ │
        │  │ /free-trial Endpoint                     │ │
        │  │ ├─ Validate (Pydantic)                  │ │
        │  │ ├─ Create trial record (DB)             │ │
        │  │ └─ Queue async task                     │ │
        │  └──────────────┬───────────────────────────┘ │
        │                 │                              │
        │         Returns trial_id                      │
        │         (non-blocking)                        │
        │                 │                              │
        └────────────────┼──────────────────────────────┘
                         │
                ┌────────▼─────────┐
                │                  │
        ┌───────▼────────────────────────────┐
        │   ASYNC BACKGROUND TASK QUEUE      │
        │   (Celery/ThreadPool)              │
        │                                    │
        │ ┌────────────────────────────────┐ │
        │ │ Step 1: Geocode Address        │ │
        │ │ → jurisdiction.py              │ │
        │ └────────────┬───────────────────┘ │
        │              │                      │
        │ ┌────────────▼───────────────────┐ │
        │ │ Step 2: Research Generation    │ │
        │ │ → /research endpoint           │ │
        │ │ → Firecrawl scraping           │ │
        │ │ → Claude synthesis             │ │
        │ │ → Markdown memo output         │ │
        │ └────────────┬───────────────────┘ │
        │              │                      │
        │ ┌────────────▼───────────────────┐ │
        │ │ Step 3: Format Memo            │ │
        │ │ → Plaintext (not PDF)          │ │
        │ │ → Add disclaimer               │ │
        │ └────────────┬───────────────────┘ │
        │              │                      │
        │ ┌────────────▼───────────────────┐ │
        │ │ Step 4: Send Email             │ │
        │ │ → Email Service                │ │
        │ │ → SendGrid OR Resend           │ │
        │ │ → HTML + plaintext versions    │ │
        │ │ → Include upgrade CTA          │ │
        │ └────────────┬───────────────────┘ │
        │              │                      │
        │ ┌────────────▼───────────────────┐ │
        │ │ Step 5: Update DB              │ │
        │ │ → Mark memo_sent = TRUE        │ │
        │ │ → Set memo_sent_at timestamp   │ │
        │ └────────────────────────────────┘ │
        │                                    │
        └────────────────────────────────────┘
                         │
                ┌────────▼────────────┐
                │                     │
        ┌───────▼──────────────────────────────┐
        │     DATABASE LAYER (Supabase)        │
        │                                      │
        │ ┌──────────────────────────────────┐ │
        │ │ free_trials Table                │ │
        │ │ id | email | address |...        │ │
        │ │ memo_sent | converted_to_paid    │ │
        │ └──────────────────────────────────┘ │
        │                                      │
        │ ┌──────────────────────────────────┐ │
        │ │ orders Table                     │ │
        │ │ id | email | trial_id |...      │ │
        │ │ stripe_session | status          │ │
        │ └──────────────────────────────────┘ │
        │                                      │
        └──────────────────────────────────────┘
                         │
                ┌────────▼───────────────┐
                │                        │
        ┌───────▼────────────────────────────────┐
        │     EMAIL SERVICE (External)           │
        │                                        │
        │ ┌────────────────────────────────────┐ │
        │ │ SendGrid                           │ │
        │ │ OR                                 │ │
        │ │ Resend                             │ │
        │ │                                    │ │
        │ │ Delivers HTML/plaintext email     │ │
        │ └────────────────────────────────────┘ │
        │                                        │
        └────────────────────────────────────────┘
                         │
                ┌────────▼─────────────────┐
                │                          │
        ┌───────▼──────────────────────────────────┐
        │ User's Email Inbox                       │
        │ (Gmail, Outlook, etc.)                   │
        │                                          │
        │ Subject: "Your RegGuard Free Research..." │
        │ From: hello@regguard.com                 │
        │                                          │
        │ ├─ Research memo (plaintext)            │
        │ ├─ Key findings                         │
        │ ├─ Next steps                           │
        │ └─ Upgrade link ($15K for PDFs)         │
        │                                          │
        └────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Frontend Layer (React/Vercel)
```
┌─ /free-trial page
│  ├─ Form fields
│  │  ├─ address input
│  │  ├─ project_type select
│  │  └─ email input
│  └─ Submit handler
│     └─ POST /free-trial
│        └─ Call backend endpoint
│           └─ Show success/error
```

### 2. API Endpoint Layer (FastAPI/Render)
```
┌─ @app.post("/free-trial")
│  ├─ Request validation (Pydantic)
│  │  ├─ FreeTrialRequest model
│  │  └─ Validate fields
│  │
│  ├─ Database operation
│  │  ├─ Create trial record
│  │  └─ Get trial_id
│  │
│  ├─ Queue async task
│  │  └─ _run_research_and_email()
│  │
│  └─ Return response
│     └─ FreeTrialResponse
│        ├─ trial_id
│        ├─ status
│        └─ message
```

### 3. Async Task Layer
```
┌─ _run_research_and_email()
│  ├─ Geocode address
│  │  └─ jurisdiction.geocode_profile_from_address()
│  │
│  ├─ Generate research
│  │  └─ research_memo.build_research_digest()
│  │     ├─ Firecrawl search
│  │     ├─ Claude synthesis
│  │     └─ Format markdown
│  │
│  ├─ Format memo
│  │  └─ _format_memo_plaintext()
│  │     ├─ Add header
│  │     ├─ Add findings
│  │     └─ Add disclaimer
│  │
│  ├─ Send email
│  │  └─ email_service.send_research_memo()
│  │     ├─ SendGrid.send() OR
│  │     └─ Resend.Emails.send()
│  │
│  └─ Update database
│     └─ mark_memo_sent(trial_id)
```

### 4. Service Layer
```
┌─ free_trial_service.py
│  ├─ create_free_trial()
│  ├─ mark_memo_sent()
│  ├─ mark_converted_to_paid()
│  └─ get_free_trial()
│
├─ email_service.py
│  ├─ SendGridEmailService
│  │  └─ send_research_memo()
│  ├─ ResendEmailService
│  │  └─ send_research_memo()
│  └─ get_email_service()
│
└─ free_trial_handler.py
   ├─ FreeTrialRequest (Pydantic)
   ├─ FreeTrialResponse (Pydantic)
   ├─ handle_free_trial()
   └─ _run_research_and_email()
```

### 5. Database Layer (Supabase)
```
┌─ free_trials table
│  ├─ Columns: id, email, address, project_type, created_at,
│  │            memo_sent, converted_to_paid, paid_order_id
│  ├─ Primary key: id (UUID)
│  └─ Indexes: email, created_at, memo_sent, converted_to_paid
│
└─ orders table
   ├─ Columns: id, email, address, trial_id, stripe_session_id,
   │            amount_cents, status, created_at
   ├─ Primary key: id (UUID)
   ├─ Foreign key: trial_id → free_trials.id
   └─ Indexes: email, trial_id, stripe_session_id, status
```

---

## Data Flow Sequence Diagram

```
User                Frontend          Backend            Database       Email
 │                    │                  │                  │           Service
 │─ fill form ───────▶│                  │                  │              │
 │                    │ POST /free-trial │                  │              │
 │                    ├─────────────────▶│                  │              │
 │                    │                  ├─ validate ──┐   │              │
 │                    │                  │◀────────────┘   │              │
 │                    │                  ├────────────────▶│ create       │
 │                    │                  │                  │ trial       │
 │                    │                  │◀────────────────┤ record       │
 │                    │◀─ trial_id ──────┤                  │              │
 │ show success       │                  │                  │              │
 │ message            │                  │                  │              │
 │                    │                  ├─ async task ┐   │              │
 │                    │                  ├─────────────┤   │              │
 │ [user waits        │                  │             │   │              │
 │  24 hours]         │                  │ geocode ──┐ │   │              │
 │                    │                  │           ◀─┘   │              │
 │                    │                  │             │   │              │
 │                    │                  │ research ──┐ │   │              │
 │                    │                  │            ◀─┘   │              │
 │                    │                  │             │   │              │
 │                    │                  │ format ────┐ │   │              │
 │                    │                  │            ◀─┘   │              │
 │                    │                  │             │   │              │
 │                    │                  ├─────────────────────────────────▶│
 │                    │                  │             │ send email       │
 │                    │                  │             │                  ├──▶
 │◀─ receive email ───────────────────────────────────────────────────────────
 │  with research     │                  │             │                  │
 │  memo + CTA        │                  │             │                  │
 │                    │                  ├─ update ────┐ │              │
 │                    │                  │             ◀─┤ memo_sent    │
 │                    │                  │              │              │
 │ click upgrade ────▶│                  │              │              │
 │ link (Stripe)      │                  │              │              │
 │                    │                  │              │              │
```

---

## Technology Stack

```
┌────────────────────────────────────────────────────┐
│              REGGUARD FREE TRIAL STACK              │
├────────────────────────────────────────────────────┤
│                                                    │
│ Frontend                                          │
│ ├─ React (TypeScript)                             │
│ ├─ React Router                                   │
│ ├─ Tailwind CSS                                   │
│ ├─ Hosted: Vercel                                 │
│ └─ Domain: app.regguardagent.com                 │
│                                                    │
│ Backend                                           │
│ ├─ Python 3.10+                                   │
│ ├─ FastAPI (web framework)                        │
│ ├─ Pydantic (validation)                          │
│ ├─ Uvicorn (ASGI server)                          │
│ ├─ Async/await (concurrent)                       │
│ ├─ Hosted: Render                                 │
│ └─ Domain: api.regguardagent.com                 │
│                                                    │
│ Database                                          │
│ ├─ PostgreSQL (Supabase)                          │
│ ├─ Row-level security (RLS)                       │
│ ├─ Indexes (performance)                          │
│ ├─ UUID primary keys                              │
│ └─ Hosted: Supabase.com                           │
│                                                    │
│ Email Service                                     │
│ ├─ SendGrid (primary)                             │
│ │  └─ Email API                                   │
│ ├─ Resend (alternative)                           │
│ │  └─ Email API                                   │
│ └─ Async sending                                  │
│                                                    │
│ Research Engine (Existing)                        │
│ ├─ Firecrawl (web search)                         │
│ ├─ Claude AI (synthesis)                          │
│ ├─ Jurisdiction profiles                          │
│ └─ Result caching                                 │
│                                                    │
│ Monitoring                                        │
│ ├─ Render logs                                    │
│ ├─ Supabase dashboard                             │
│ ├─ Email service logs                             │
│ └─ Application metrics                            │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Request/Response Flow

### Request
```json
POST https://api.regguardagent.com/free-trial
Content-Type: application/json

{
  "address": "123 Main St, Austin, TX",
  "project_type": "data-center",
  "email": "dev@company.com"
}
```

### Response (Immediate)
```json
HTTP/1.1 200 OK
Content-Type: application/json

{
  "trial_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "message": "Your research has been queued. Check your email in 24 hours for your research memo."
}
```

### Background Processing (Async)
```
1. Research generation: 5-15 minutes
2. Email sending: instant
3. Database update: <1 second
4. Total: ~5-15 minutes

User receives email: within 24 hours
```

---

## Error Handling Flow

```
┌─ Request received
│  │
│  ├─ Validation failed?
│  │  └─ Return 400 (Bad Request)
│  │     └─ "Invalid address format"
│  │
│  ├─ Supabase error?
│  │  └─ Return 500 (Internal Error)
│  │     └─ "Database connection failed"
│  │
│  ├─ Email config missing?
│  │  └─ Log warning, continue
│  │     └─ Success response (memo queued, email may fail)
│  │
│  └─ ✅ All checks pass
│     └─ Create trial
│     └─ Queue task
│     └─ Return 200 (Success)
```

---

## Deployment Architecture

```
┌────────────────────────────────────────────────────┐
│                 DEPLOYMENT TARGETS                 │
├────────────────────────────────────────────────────┤
│                                                    │
│ Frontend                                          │
│ ├─ Vercel (Edge Network)                          │
│ ├─ Auto-deploys on git push                       │
│ ├─ CDN caching                                    │
│ ├─ SSL/TLS                                        │
│ └─ URL: https://app.regguardagent.com            │
│                                                    │
│ Backend API                                       │
│ ├─ Render (Docker container)                      │
│ ├─ Auto-deploys on git push                       │
│ ├─ Environment variables                          │
│ ├─ Logging & monitoring                           │
│ └─ URL: https://api.regguardagent.com            │
│                                                    │
│ Database                                          │
│ ├─ Supabase (PostgreSQL)                          │
│ ├─ Automatic backups                              │
│ ├─ Real-time subscriptions                        │
│ ├─ RLS policies                                   │
│ └─ URL: https://your-project.supabase.co         │
│                                                    │
│ Email Service                                     │
│ ├─ SendGrid                                       │
│ ├─ API key in Render env                          │
│ └─ Webhook logs for tracking                      │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Monitoring Dashboard Queries

### Trial Activity
```sql
-- Last 10 trials
SELECT email, address, project_type, created_at, memo_sent
FROM free_trials
ORDER BY created_at DESC
LIMIT 10;

-- Memo delivery rate
SELECT 
  COUNT(*) as total_trials,
  SUM(CASE WHEN memo_sent THEN 1 ELSE 0 END) as delivered,
  ROUND(100.0 * SUM(CASE WHEN memo_sent THEN 1 ELSE 0 END) / COUNT(*), 1) as delivery_rate_percent
FROM free_trials;

-- Trial to paid conversion
SELECT 
  COUNT(*) as trials_with_memo,
  SUM(CASE WHEN converted_to_paid THEN 1 ELSE 0 END) as converted,
  ROUND(100.0 * SUM(CASE WHEN converted_to_paid THEN 1 ELSE 0 END) / COUNT(*), 1) as conversion_percent
FROM free_trials
WHERE memo_sent = TRUE;
```

---

**Status:** ✅ Ready to deploy  
**Next:** Follow QUICK_START_FREE_TRIAL.md
