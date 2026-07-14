# 🚀 Quick Start: Free Trial Backend Deployment

## In 5 Minutes: Get Free Trial Live

### 1. Create Supabase Tables (1 min)
```
Go to: app.supabase.com → SQL Editor → Create Query
Run: backend/migrations/001_create_free_trial_tables.sql
```

### 2. Get Email API Key (1 min)
```
SendGrid: https://sendgrid.com → Settings → API Keys → Create
Copy: SG.xxxxx
```

### 3. Add to Render (1 min)
```
Render Dashboard → Backend Service → Settings → Environment
Add: SENDGRID_API_KEY=SG.xxxxx
```

### 4. Deploy (1 min)
```
Git commit already done ✅
Just push: git push origin main
Render auto-deploys (takes ~3 min)
```

### 5. Test (1 min)
```
curl -X POST https://api.regguardagent.com/free-trial \
  -H "Content-Type: application/json" \
  -d '{
    "address": "123 Main St, Austin, TX",
    "project_type": "data-center",
    "email": "you@example.com"
  }'
```

---

## What This Enables

✅ Users can submit address for free research memo  
✅ Memo sent via email within 24 hours  
✅ Upgrade link included ($15K for full package)  
✅ Trial→paid conversions tracked automatically  

---

## Files Changed

```
backend/
├── free_trial_service.py       (NEW)
├── email_service.py             (NEW)
├── free_trial_handler.py        (NEW)
├── main.py                      (MODIFIED: added /free-trial endpoint)
├── migrations/
│   └── 001_create_free_trial_tables.sql (NEW)
└── requirements.txt             (UPDATED: added sendgrid)
```

---

## Endpoint Reference

### Request
```json
POST /free-trial
{
  "address": "123 Main St, Austin, TX",
  "project_type": "data-center",
  "email": "dev@company.com"
}
```

### Response
```json
{
  "trial_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "message": "Your research has been queued. Check your email in 24 hours."
}
```

---

## Database Schema

### `free_trials` Table
```
id                  | UUID
email               | TEXT
address             | TEXT
project_type        | TEXT
created_at          | TIMESTAMP
memo_sent           | BOOLEAN
converted_to_paid   | BOOLEAN
paid_order_id       | UUID (FK to orders)
```

### `orders` Table
```
id                  | UUID
email               | TEXT
address             | TEXT
amount_cents        | INTEGER
status              | TEXT (pending/completed/failed)
stripe_session_id   | TEXT
trial_id            | UUID (FK to free_trials)
created_at          | TIMESTAMP
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| 500 error | Backend not deployed; check git push |
| Email not sent | `SENDGRID_API_KEY` missing in Render |
| CORS error | Add domain to `REG_GUARD_EXTRA_CORS_ORIGINS` |
| No DB records | Tables not created in Supabase |

---

## Monitoring

**Check trial activity:**
```sql
SELECT * FROM free_trials ORDER BY created_at DESC LIMIT 10;
```

**Check conversion rate:**
```sql
SELECT 
  ROUND(100.0 * COUNT(CASE WHEN converted_to_paid THEN 1 END) / COUNT(*), 1) as conversion_rate
FROM free_trials
WHERE memo_sent = TRUE;
```

---

**Status:** Ready to deploy ✅  
**Next:** Run 5 steps above, then monitor metrics
