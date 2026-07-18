# Free Trial Debugging Checklist (July 18, 2026)

## Fixes Applied

### ✅ Frontend Console Error
**Error:** "No label associated with a form field"
**Cause:** Select element missing `htmlFor` on label and `id` on select
**Fix:** 
- Added `htmlFor="projectType"` to label
- Added `id="projectType"` to select
**File:** `frontend/src/pages/FreeTrialPage.tsx`

### ✅ Backend Resend Errors  
**Errors:**
- "resend package not installed"
- "Resend not configured"

**Root Cause:** Resend API key wasn't being configured on the module
**Fix:**
- Added `resend.api_key = api_key` in `__init__`
- Added better error handling with detailed logging
- Wrapped API call in try-except for clearer error messages

**File:** `backend/email_service.py`

---

## Testing Flow

### Step 1: Verify Deployments
```bash
# Check Render (auto-deploys in 2-3 minutes)
curl https://api.regguardagent.com/debug/env | jq .

# Check Vercel (auto-deploys)
curl https://app.regguardagent.com/free-trial -I
```

### Step 2: Verify Database
```
Go to Supabase SQL Editor
Run: SELECT COUNT(*) FROM environmental_cache;
Expected: 1 row (or more if you seeded Plano)
```

### Step 3: Test Free Trial Form
1. Go to `https://app.regguardagent.com/free-trial`
2. Click "Auto-Detect Location" (or manually enter)
3. Enter address with ZIP code (e.g., Vontress Street, Plano, TX 75074)
4. Select project type
5. Enter email
6. Click "Get Free Research Memo"

### Step 4: Check Expected Logs

**Frontend Console:** Should be clean (no warnings)

**Render Logs:** Should show:
```
✅ Resend initialized with API key
🌍 Environmental screening starting for: Vontress Street, Plano, TX 75074
📍 Geocoded: Plano, TX ZIP: 75074
🔍 Cache lookup for ZIP: 75074, State: TX
📡 Cache API response: 200
📦 Cache query returned 1 rows
✅ Found cached environmental data: 75074, TX
✅ Email sent to your.email@company.com
```

### Step 5: Check Email
- Should arrive within 5-10 seconds (not 24 hours)
- Subject: "Your RegGuard Free Research Memo is Ready"
- Contains:
  - Research memo (text)
  - Environmental screening (from cache)
  - CTA to upgrade

---

## If Still Not Working

### Check 1: Environment Variables
```bash
curl https://api.regguardagent.com/debug/config | jq .
```

Should show:
- `"resend": true`
- `"supabase": true`
- `"google_maps": true`

### Check 2: Supabase Connection
```bash
curl https://api.regguardagent.com/debug/test-supabase | jq .
```

Should show:
- `"supabase_connected": true`
- `"email_service_available": true`

### Check 3: Cache Data
Go to Supabase → Table Editor → `environmental_cache`
Should show entries like:
```
zip_code: 75074
state: TX
cached_data: { "risk_level": "LOW", ... }
```

### Check 4: Render Logs
Go to `https://dashboard.render.com` → regguard-api → Logs
Look for:
- ❌ Errors with "Resend"
- ❌ Errors with "cache lookup"
- ❌ Errors with "build_research_digest"

---

## Latest Commits

| Commit | Change |
|--------|--------|
| fd236743 | Label-select association + Resend API key init |
| 5c34492c | HTML5 form attributes (autocomplete, aria-label) |
| 640a4b29 | Convert JurisdictionProfile to dict |
| b12fceab | Fix JurisdictionProfile dataclass access |
| 5502c8ea | Enhanced logging for cache debugging |
| 071615d7 | ZIP code capture + address persistence |

---

## Architecture Summary

```
User submits address with ZIP
  ↓
Frontend validates + sends to /free-trial
  ↓
Backend geocodes address → gets JurisdictionProfile
  ↓
Converts profile to dict (for compatibility)
  ↓
Checks environmental_cache for ZIP+state
  ↓
Cache HIT → returns cached data (instant, $0)
Cache MISS → returns template (fallback, free)
  ↓
Generates research memo (text format)
  ↓
Combines memo + environmental data
  ↓
Sends email via Resend
  ↓
Frontend shows success message
```

---

## Success Indicators

✅ Form has no console errors  
✅ Form submission succeeds  
✅ Render logs show "Resend initialized"  
✅ Render logs show "Cache HIT"  
✅ Email arrives within 10 seconds  
✅ Email contains research + environmental data  
✅ User sees "Request Submitted" message  

