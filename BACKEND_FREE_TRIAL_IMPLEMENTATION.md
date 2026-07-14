# Backend Free Trial Implementation Guide

**Status:** ✅ Complete and ready to deploy  
**Commit:** `4a757a1a`  
**Last Updated:** July 13, 2026

---

## Overview

The free trial system allows users to:
1. Submit site address + email (frontend `/free-trial` form)
2. Receive research memo via email (within 24 hours)
3. Decide to upgrade to full package ($15K for PDFs + punch list)

**No credit card required for trial.**

---

## Backend Components Implemented

### 1. **Free Trial Service** (`backend/free_trial_service.py`)
Manages free trial database operations:
- Create new trial records in Supabase
- Mark memos as sent
- Track conversions from free trial → paid
- Retrieve trial data for tracking

**Functions:**
- `create_free_trial()` — Create trial record
- `mark_memo_sent()` — Update trial after email sent
- `mark_converted_to_paid()` — Track upgrades
- `get_free_trial()` — Retrieve trial status

---

### 2. **Email Service** (`backend/email_service.py`)
Sends research memos via email. Supports **SendGrid** or **Resend**.

**Features:**
- Async email sending
- HTML + plaintext versions
- Includes upgrade CTA with trial ID
- Error logging and retry-friendly

**Usage:**
```python
email_service = get_email_service()
await email_service.send_research_memo(
    to_email="user@example.com",
    address="123 Main St, Austin, TX",
    research_memo="...",
    trial_id="trial-uuid",
)
```

---

### 3. **Free Trial Handler** (`backend/free_trial_handler.py`)
Orchestrates the free trial flow:
1. Create trial record in Supabase
2. Queue research generation (async)
3. Generate research memo
4. Send email with memo
5. Mark trial as complete

**Pydantic Models:**
- `FreeTrialRequest` — Input validation (address, project_type, email)
- `FreeTrialResponse` — Output (trial_id, status, message)

---

### 4. **API Endpoint** (`/free-trial` in `backend/main.py`)
```python
@app.post("/free-trial")
async def free_trial(request_body: FreeTrialRequest) -> FreeTrialResponse:
    """Handle free trial requests"""
```

**Request:**
```json
{
    "address": "123 Main St, Austin, TX",
    "project_type": "data-center",
    "email": "dev@company.com"
}
```

**Response:**
```json
{
    "trial_id": "550e8400-e29b-41d4-a716-446655440000",
    "status": "success",
    "message": "Your research has been queued. Check your email in 24 hours for your research memo."
}
```

---

### 5. **Database Schema** (Supabase SQL)
Created two tables:

**`free_trials`** — Tracks trial signups
- `id` (UUID, primary key)
- `email` (TEXT)
- `address` (TEXT)
- `project_type` (TEXT)
- `created_at` (timestamp)
- `memo_sent` (boolean)
- `memo_sent_at` (timestamp)
- `converted_to_paid` (boolean)
- `paid_order_id` (UUID foreign key)
- `updated_at` (timestamp)

**`orders`** — Tracks paid customers
- `id` (UUID, primary key)
- `email` (TEXT)
- `address` (TEXT)
- `project_type` (TEXT)
- `order_type` (TEXT: 'single', 'annual', 'enterprise')
- `amount_cents` (INTEGER, e.g., 1500000 for $15K)
- `status` (TEXT: 'pending', 'completed', 'failed')
- `stripe_session_id` (TEXT)
- `stripe_customer_id` (TEXT)
- `stripe_subscription_id` (TEXT)
- `trial_id` (UUID reference to free_trial)
- `created_at`, `completed_at`, `updated_at` (timestamps)

---

## Setup Instructions

### Step 1: Add Backend Dependencies

Update `backend/requirements.txt` to include email service:

```
sendgrid>=6.10.0    # OR resend>=1.0.0
```

Then install:
```bash
cd backend
pip install -r requirements.txt
```

### Step 2: Create Database Schema

Run the SQL migration in your Supabase dashboard:

1. Go to: https://app.supabase.com → Your Project → SQL Editor
2. Create new query
3. Copy contents of `backend/migrations/001_create_free_trial_tables.sql`
4. Execute

**Verify:**
```sql
SELECT * FROM free_trials LIMIT 1;
SELECT * FROM orders LIMIT 1;
```

### Step 3: Configure Environment Variables

Copy `.env.example` to `.env` and fill in keys:

```bash
cp .env.example .env
```

Edit `backend/.env`:

```env
# Choose ONE email service (SendGrid recommended)
SENDGRID_API_KEY=your_sendgrid_api_key_here
# OR
RESEND_API_KEY=your_resend_api_key_here

# CORS origins (add your Vercel domains)
REG_GUARD_EXTRA_CORS_ORIGINS=https://app.regguardagent.com,https://regguardagent.com
```

### Step 4: Deploy Backend

Push to Render or your hosting:

```bash
git add backend/
git commit -m "Implement free trial backend infrastructure"
git push origin main
```

Render will auto-deploy on push.

---

## Email Service Setup

### Option A: SendGrid (Recommended)

1. Sign up: https://sendgrid.com
2. Create API key: Settings → API Keys → Create
3. Copy key to `.env`: `SENDGRID_API_KEY=SG.xxxxx`

### Option B: Resend

1. Sign up: https://resend.com
2. Create API key: API Keys → Create
3. Copy key to `.env`: `RESEND_API_KEY=re_xxxxx`

---

## Testing the Free Trial Endpoint

### Local Testing

```bash
# Start backend
python backend/main.py

# In another terminal, run curl
curl -X POST http://localhost:8000/free-trial \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Main St, Austin, TX",
    "project_type": "data-center",
    "email": "test@example.com"
  }'

# Response:
{
  "trial_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "message": "Your research has been queued. Check your email in 24 hours for your research memo."
}
```

### Production Testing

```bash
curl -X POST https://api.regguardagent.com/free-trial \
  -H "Content-Type: application/json" \
  -d '{
    "address": "1600 Pennsylvania Ave, Washington, DC",
    "project_type": "data-center",
    "email": "your-email@example.com"
  }'
```

**Check email in 24 hours** for research memo.

---

## How It Works (Flow Diagram)

```
Frontend Form Submit
    ↓
POST /free-trial
    ↓
Create trial record in Supabase (returns trial_id)
    ↓
Async task starts (background)
    ├─ Call /research endpoint
    ├─ Generate research memo (plaintext)
    ├─ Send email via SendGrid/Resend
    └─ Mark trial as "memo_sent"
    ↓
Frontend shows: "Check email in 24 hours"
    ↓
[24 hours pass]
    ↓
User receives email with:
    ├─ Research memo (plaintext)
    ├─ Upgrade CTA: "Want PDFs? $15K"
    └─ Trial ID link to /order page
    ↓
User clicks "Upgrade"
    ↓
Stripe checkout → payment → mark trial as "converted_to_paid"
    ↓
User gets full PDF package
```

---

## Monitoring & Metrics

Track in your analytics dashboard:

**Free Trial Signups:**
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as signups,
  SUM(CASE WHEN memo_sent THEN 1 ELSE 0 END) as memos_sent,
  SUM(CASE WHEN converted_to_paid THEN 1 ELSE 0 END) as conversions
FROM free_trials
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Trial-to-Paid Conversion Rate:**
```sql
SELECT 
  ROUND(
    100.0 * COUNT(CASE WHEN converted_to_paid THEN 1 END) / COUNT(*),
    2
  ) as conversion_rate_percent
FROM free_trials
WHERE memo_sent = TRUE;
```

---

## Error Handling

### Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Email not sending | API key invalid | Verify key in `.env` and email service config |
| Research memo empty | `/research` endpoint failed | Check backend logs for errors |
| Trial not created | Supabase connection failed | Verify `SUPABASE_URL` and `SUPABASE_KEY` |
| CORS error from frontend | Origin not whitelisted | Add domain to `REG_GUARD_EXTRA_CORS_ORIGINS` |

### Enable Debug Logging

```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## Deployment Checklist

- [ ] SQL schema created in Supabase
- [ ] `.env` file updated with email API keys
- [ ] Backend code committed to git
- [ ] Backend deployed to Render (or hosting)
- [ ] Email service keys verified
- [ ] Frontend `/free-trial` form ready
- [ ] Test free trial end-to-end:
  - [ ] Submit form
  - [ ] See success response
  - [ ] Receive email within 24 hours
  - [ ] Click upgrade link
  - [ ] Complete Stripe payment
- [ ] Monitor metrics in Supabase

---

## Next Steps

1. **Email Template Customization**: Edit `email_service.py` to match your branding
2. **ROI Calculator**: Implement ROI calculator on landing page (frontend task)
3. **Analytics Dashboard**: Set up Supabase real-time dashboard to monitor signups/conversions
4. **Upgrade Flow**: Implement `/order` endpoint to handle trial → paid transitions

---

## Support

**Questions?** Contact: hello@regguard.com  
**Documentation:** See `IMPLEMENTATION_SUMMARY_PREMORTEM_v0.1.0.md`
