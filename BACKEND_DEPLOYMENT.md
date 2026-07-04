# RegGuard Backend Deployment to Vercel

Your frontend is live at: https://reg-guard.vercel.app

To get the API working, deploy the backend separately to Vercel:

## Steps:

1. **Create new Vercel project from `/backend` folder:**
   - Go to https://vercel.com/new
   - Import GitHub repo: `regguard-frontend`
   - Root Directory: `backend` (NOT `frontend`)
   - Framework: Other (Python)
   - Build Command: `pip install -r requirements.txt`
   - Output Directory: (leave empty)
   - Environment: Production

2. **Add Environment Variables:**
   - ANTHROPIC_API_KEY
   - FIRECRAWL_API_KEY
   - SUPABASE_URL
   - SUPABASE_KEY

3. **Deploy**

4. **Get your backend URL** from the Vercel dashboard (something like `https://regguard-api-xxxxx.vercel.app`)

5. **Update frontend to use this URL:**
   - Edit `frontend/src/env.ts`
   - Change the BACKEND_URL to your new backend URL
   - Push to GitHub
   - Frontend will auto-redeploy

## Alternative (Quicker):

Keep using the **local backend** for now:
- Run: `bash run-dev.sh` from the repo root
- Use: `http://localhost:5173` instead of the Vercel URL
- All forms will work with mock data

The frontend is already live and beautiful - the backend can be deployed anytime to make it fully functional!
