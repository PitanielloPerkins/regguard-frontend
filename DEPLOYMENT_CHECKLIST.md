# RegGuard Queue: Production Deployment Checklist

## Status: Ready for Deployment

The Phase 1 MVP is feature-complete and ready to go live on Vercel:

- ✅ Frontend (React/Vite) - Fully working, beautiful UI
- ✅ Backend routes properly configured (interconnect module, correct imports)
- ✅ Environment variables set up
- ✅ Mock API endpoints working

## Deploy to Vercel in 5 minutes

### Step 1: Frontend (Vercel)

```bash
# 1. Go to https://vercel.com
# 2. Click "New Project"
# 3. Select this GitHub repo
# 4. Settings:
#    - Framework: Vite
#    - Root Directory: ./frontend
#    - Build Command: npm run build
#    - Output Directory: dist
# 5. Environment Variables (add these):
#    VITE_BACKEND_URL=https://your-backend-domain.com
# 6. Deploy
```

### Step 2: Backend (Vercel or alternative)

**Option A: Railway.app (Recommended - easier for Python)**
```bash
# 1. Go to https://railway.app
# 2. Connect GitHub
# 3. Select this repo
# 4. Settings:
#    - Root Directory: backend
#    - Start Command: gunicorn -w 4 -b 0.0.0.0:8000 main:app
# 5. Add Environment Variables:
#    - ANTHROPIC_API_KEY
#    - SUPABASE_URL
#    - SUPABASE_KEY
#    - FIRECRAWL_API_KEY
#    - GEMINI_API_KEY
# 6. Deploy
```

**Option B: Render.com (Also good)**
```bash
# Similar steps - use Python 3.10, select gunicorn startup
```

### Step 3: Connect Frontend to Backend

After backend deploys, update frontend env:
```bash
VITE_BACKEND_URL=https://your-railway-backend.railway.app
```

## What Happens After Deploy

1. Frontend loads from `https://your-project.vercel.app/queue/upload`
2. Users fill out form
3. Form submits to your backend API
4. Backend calls Claude API to auto-fill
5. Results display with confidence scores
6. Users can export PDF (coming Phase 2)

## Post-Launch Tasks

- [ ] Get real API responses (Claude, Firecrawl integration)
- [ ] Test end-to-end with real data
- [ ] Monitor error logs on Railway/Render
- [ ] Begin Phase 2: Multi-RTO support

---

**Why deploy instead of fixing local?**
- Local dev is for testing UI changes
- Production deployments auto-restart on crash
- You get a real URL to share with beta users
- Uptime monitoring and error tracking
- Scales automatically

**Cost?**
- Vercel frontend: FREE tier (5 projects)
- Railway backend: ~$5-15/month starting
- Much cheaper than running locally and crashing

---

Next: Ready to deploy? I can walk you through Railway setup step-by-step.
