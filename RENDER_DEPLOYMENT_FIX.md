# 🔧 BACKEND DEPLOYMENT FIX - ACTION ITEMS

**Issue Identified**: Backend routes not accessible on Render (404 errors)  
**Root Cause**: Likely Render build/start command misconfiguration  
**Status**: ✅ All routes verified working locally  

---

## ✅ WHAT WAS FIXED

1. ✅ Created `render.yaml` - Explicit Render deployment configuration
2. ✅ Created `Procfile` - Alternative Render start command
3. ✅ Created `asgi.py` - Proper ASGI entry point
4. ✅ Created `backend_diagnostic.py` - Route verification tool
5. ✅ Verified all 37 routes load correctly locally

---

## 🚨 MANUAL STEPS REQUIRED IN RENDER DASHBOARD

### Step 1: Check Current Build Settings
1. Go to: https://dashboard.render.com/
2. Click on your "regguard-backend" service
3. Look for "Build Command" and "Start Command"
4. They should show the commands that are being used

### Step 2: Update Start Command
**Current (likely broken)**:
```
(Will show something like 'python main.py' or empty)
```

**Should be changed to**:
```
cd backend && python -m uvicorn main:_backend_app --host 0.0.0.0 --port $PORT --workers 4
```

**OR use the Procfile** (Render should auto-detect it):
```
Procfile exists: web: cd backend && python -m uvicorn main:_backend_app --host 0.0.0.0 --port $PORT --workers 4
```

### Step 3: Update Build Command  
**Should be**:
```
pip install -r requirements.txt
```

**OR if in backend directory**:
```
cd backend && pip install -r requirements.txt
```

### Step 4: Manual Re-deployment
1. In Render dashboard, click the "Redeploy latest commit" button
2. Wait 2-3 minutes for deployment
3. Check deployment logs for any errors
4. Once deployed, test: `curl https://regguard-backend.onrender.com/health`

---

## 🧪 VERIFICATION TESTS (After Deploy)

### Test 1: Health Check
```bash
curl https://regguard-backend.onrender.com/health
# Expected: {"status": "ok"} or similar
```

### Test 2: Research Endpoint
```bash
curl -X POST https://regguard-backend.onrender.com/research \
  -H "Content-Type: application/json" \
  -d '{
    "address": "12025 Sunrise Valley Dr, Reston, VA 22090",
    "query": "interconnection requirements",
    "jurisdiction": "Virginia"
  }'
# Expected: 200 with research results
```

### Test 3: Payment Endpoint
```bash
curl -X POST https://regguard-backend.onrender.com/auth/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "project_name": "Test",
    "customer_email": "test@example.com",
    "customer_id": "user123"
  }'
# Expected: 200 with checkout_url
```

### Test 4: Frontend Integration
1. Open https://regguard-live.vercel.app
2. Try to submit a research form
3. Check browser console (F12 → Console) for any errors
4. Should see successful responses

---

## 📋 ALTERNATIVE: Delete & Recreate Service

If the above doesn't work, try:

1. **Delete the current Render service**
   - Go to Render dashboard → regguard-backend → Settings → Delete Service
   
2. **Create new service from scratch**
   - Click "Create +"
   - Select "Web Service"
   - Connect GitHub to: `PitanielloPerkins/regguard-frontend`
   - **Root Directory**: `backend`
   - **Runtime**: Python 3.11
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python -m uvicorn main:_backend_app --host 0.0.0.0 --port $PORT`
   - Add environment variables (see below)
   - Deploy

3. **Environment Variables to Add**:
   ```
   FIRECRAWL_API_KEY=your_key
   ANTHROPIC_API_KEY=your_key
   GOOGLE_MAPS_API_KEY=your_key
   STRIPE_SECRET_KEY=your_key
   STRIPE_PUBLISHABLE_KEY=your_key
   STRIPE_WEBHOOK_SECRET=your_key
   SUPABASE_URL=your_url
   SUPABASE_ANON_KEY=your_key
   SUPABASE_SECRET_KEY=your_key
   ```

---

## 📞 IF STILL NOT WORKING

1. Check Render deployment logs:
   - Dashboard → regguard-backend → Logs tab
   - Look for error messages during build/startup
   
2. Look for Python version issues:
   - Should be 3.11+ (specified in runtime.txt)
   
3. Check if requirements.txt can install:
   - Some packages might fail to build
   - Check logs for `pip install` errors

4. Verify environment variables are loaded:
   - Backend startup should log Firecrawl key prefix
   - Should see: "Using Firecrawl Key: fcr_..."

---

## 💡 QUICK DIAGNOSTIC

Run this command in your terminal to test Render's current state:

```bash
# Test if backend is responding
for endpoint in "/health" "/queue/history" "/research"; do
  echo "Testing: $endpoint"
  curl -s -o /dev/null -w "HTTP %{http_code}\n" "https://regguard-backend.onrender.com${endpoint}"
done
```

Expected output after fix:
```
Testing: /health
HTTP 200
Testing: /queue/history
HTTP 200
Testing: /research
HTTP 200
```

Current output (before fix):
```
Testing: /health
HTTP 404
Testing: /queue/history
HTTP 404
Testing: /research
HTTP 404
```

---

**Next**: Take action in Render dashboard following the steps above!
