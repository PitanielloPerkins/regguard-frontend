# Free Trial Backend: Deployment & Setup Guide

**Status:** ✅ Backend code committed and ready to deploy  
**Commit:** `2a2c8132`  
**Date:** July 13, 2026

---

## 📋 What Was Implemented

### Three New Backend Services

1. **`free_trial_service.py`** — Database layer
   - Create/track trial records
   - Mark memos as sent
   - Track trial→paid conversions

2. **`email_service.py`** — Email layer
   - SendGrid or Resend integration
   - HTML + plaintext memo emails
   - Automated upgrade CTAs

3. **`free_trial_handler.py`** — Orchestration layer
   - Request validation (Pydantic)
   - Async research generation
   - Email delivery coordination

### One New API Endpoint

**`POST /free-trial`** — Main entry point
- Accepts: address, project_type, email
- Returns: trial_id, status, message
- Runs research in background
- Sends email within 24 hours

### One Database Schema (SQL)

**`free_trials` table** — Trial signups
**`orders` table** — Paid customers & conversions

---

## 🚀 Step-by-Step Setup

### Step 1: Update Supabase Schema (2 minutes)

**Go to:** https://app.supabase.com → Your Project → SQL Editor

**Create new query and paste:**

```sql
-- Create free_trials table
CREATE TABLE IF NOT EXISTS free_trials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    project_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    memo_sent BOOLEAN DEFAULT FALSE,
    memo_sent_at TIMESTAMP WITH TIME ZONE,
    converted_to_paid BOOLEAN DEFAULT FALSE,
    paid_order_id UUID REFERENCES orders(id),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    address TEXT NOT NULL,
    project_type TEXT NOT NULL,
    order_type TEXT NOT NULL DEFAULT 'single',
    amount_cents INTEGER,
    status TEXT NOT NULL DEFAULT 'pending',
    stripe_session_id TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    trial_id UUID REFERENCES free_trials(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_free_trials_email ON free_trials(email);
CREATE INDEX IF NOT EXISTS idx_free_trials_created_at ON free_trials(created_at);
CREATE INDEX IF NOT EXISTS idx_free_trials_memo_sent ON free_trials(memo_sent);
CREATE INDEX IF NOT EXISTS idx_free_trials_converted ON free_trials(converted_to_paid);

CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_trial_id ON orders(trial_id);
```

**Click "Run"** — Tables should be created immediately.

### Step 2: Configure Render Backend (3 minutes)

**Your API is already deployed to:** `https://api.regguardagent.com`

**New environment variables needed:**

Go to: https://dashboard.render.com → Select your backend service → Settings → Environment

**Add these new variables:**

```
SENDGRID_API_KEY=[see Step 3 for how to get this]
RESEND_API_KEY=[optional, if using Resend instead of SendGrid]
REG_GUARD_EXTRA_CORS_ORIGINS=https://app.regguardagent.com,https://regguardagent.com
```

**Don't deploy yet** — wait for Step 3.

### Step 3: Get Email API Key (2 minutes)

**Choose Option A or B:**

#### Option A: SendGrid (Recommended)

1. Sign up: https://sendgrid.com (free tier included)
2. Go to: Settings → API Keys
3. Click "Create New API Key"
4. Name it: `RegGuard Free Trial`
5. Select scopes: `Mail Send`
6. Copy the key (starts with `SG.`)
7. **Paste in Render:** `SENDGRID_API_KEY=SG.xxxxx`

#### Option B: Resend (Alternative)

1. Sign up: https://resend.com (free tier available)
2. Go to: API Keys
3. Click "Create API Key"
4. Name it: `regguard-free-trial`
5. Copy the key (starts with `re_`)
6. **Paste in Render:** `RESEND_API_KEY=re_xxxxx`

**Then deploy in Render** by clicking "Manual Deploy" or just push code to trigger auto-deploy.

### Step 4: Test Locally (Optional but Recommended)

```bash
cd "/Users/tony_pitaniello/Desktop/reg-guard FINAL"

# Install dependencies
pip install -r backend/requirements.txt

# Add your keys to backend/.env
echo "SENDGRID_API_KEY=SG.xxxxx" >> backend/.env

# Start backend
python -m uvicorn backend.main:app --reload --port 8000
```

**Test the endpoint:**

```bash
curl -X POST http://localhost:8000/free-trial \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Main St, Austin, TX",
    "project_type": "data-center",
    "email": "your-test-email@gmail.com"
  }'
```

**Expected response:**
```json
{
  "trial_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "message": "Your research has been queued. Check your email in 24 hours for your research memo."
}
```

---

## ✅ Deployment Checklist

Before going live, verify:

- [ ] Supabase tables created (`free_trials`, `orders`)
- [ ] SendGrid API key obtained (or Resend)
- [ ] Render environment variables updated
- [ ] Backend deployed (manual or auto-deploy after git push)
- [ ] CORS origins configured in Render
- [ ] Frontend `/free-trial` form is live
- [ ] Test flow works end-to-end (see Step 5)

---

## 🧪 End-to-End Test (5 minutes)

### Test Flow:

1. **Open frontend:** https://app.regguardagent.com
2. **Go to:** Home → "Try Free" button
3. **Fill form:**
   - Address: `123 Main St, Austin, TX`
   - Project Type: `Data Center`
   - Email: Your email address
4. **Click:** "Get Free Research Memo"
5. **See success message:**
   - "Request Submitted!"
   - "Check your email within 24 hours"
6. **Wait 24 hours** (or check `/free-trial` logs if you want to see it immediately)
7. **Receive email** with:
   - Research memo for your address
   - Upgrade link ($15K for full package)
   - Trial ID embedded in link

---

## 🔍 Monitoring

### Check Trial Activity in Supabase

**Go to:** https://app.supabase.com → Your Project → Table Editor

**Click on `free_trials` table:**
- See all trial signups
- Check `memo_sent` status
- Track `converted_to_paid` conversions

**Example query:**
```sql
SELECT 
  email,
  address,
  created_at,
  memo_sent,
  converted_to_paid,
  paid_order_id
FROM free_trials
ORDER BY created_at DESC
LIMIT 10;
```

### Conversion Metrics

```sql
-- Trial signup rate
SELECT COUNT(*) as total_trials FROM free_trials;

-- Memo delivery rate
SELECT 
  COUNT(*) as total,
  SUM(CASE WHEN memo_sent THEN 1 ELSE 0 END) as memos_sent,
  ROUND(100.0 * SUM(CASE WHEN memo_sent THEN 1 ELSE 0 END) / COUNT(*), 1) as delivery_rate_percent
FROM free_trials;

-- Trial to paid conversion rate
SELECT 
  COUNT(*) as trials_with_memo,
  SUM(CASE WHEN converted_to_paid THEN 1 ELSE 0 END) as converted,
  ROUND(100.0 * SUM(CASE WHEN converted_to_paid THEN 1 ELSE 0 END) / COUNT(*), 1) as conversion_rate_percent
FROM free_trials
WHERE memo_sent = TRUE;
```

---

## 🐛 Troubleshooting

| Problem | Likely Cause | Solution |
|---------|--------------|----------|
| Endpoint returns 500 error | Backend code not deployed | Check git commit, verify Render deployed |
| Email not sending | API key invalid | Verify `SENDGRID_API_KEY` in Render env |
| CORS error in browser | Origin not whitelisted | Add domain to `REG_GUARD_EXTRA_CORS_ORIGINS` |
| Research memo empty | `/research` endpoint failed | Check Render logs: `render.com → Logs` |
| No trial record in DB | Supabase tables not created | Run SQL migration in Supabase editor |

**View Render logs:**
```
https://dashboard.render.com → Select backend → Logs tab
```

---

## 📊 What Happens Next

### Immediate (Today)

- [x] Backend code committed
- [ ] Deploy to Render (happens automatically on git push)
- [ ] Test free trial flow end-to-end

### This Week

- [ ] Monitor trial signups (watch Supabase)
- [ ] Monitor trial→paid conversion rate
- [ ] Fix any issues that arise
- [ ] Optimize email template branding

### Next Sprint

- [ ] Build ROI calculator (frontend)
- [ ] Add analytics dashboard (Supabase + Metabase)
- [ ] Implement `/order` endpoint (paid tier)
- [ ] Create automated reporting for enterprise accounts

---

## 📞 Support

**Questions about deployment?** See `BACKEND_FREE_TRIAL_IMPLEMENTATION.md` for full technical details.

**Problems?** Email: `hello@regguard.com` or check Render/Supabase logs.

---

## 🎯 Success Metrics

By end of Month 1, you should see:

| Metric | Target | How to Check |
|--------|--------|-------------|
| Free trial signups | 50+ | Supabase: `SELECT COUNT(*) FROM free_trials` |
| Memo delivery rate | >95% | Supabase: `WHERE memo_sent = TRUE / total` |
| Trial→paid conversion | 20-40% | Supabase: `WHERE converted_to_paid = TRUE / WHERE memo_sent = TRUE` |
| Revenue from trials | $15K+/month | `SELECT SUM(amount_cents) FROM orders WHERE trial_id IS NOT NULL` |

---

**Status:** ✅ Ready to deploy  
**Next:** Push to git → Render auto-deploys → Monitor metrics
