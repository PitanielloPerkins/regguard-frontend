# 🚀 RegGuard Queue - Vercel Deployment Guide

## ✅ Pre-Deployment Checklist

- [x] Code committed to Git
- [x] `vercel.json` created
- [x] `api/index.py` created
- [x] Environment variables prepared
- [ ] GitHub repository ready
- [ ] Vercel account created

---

## 📋 Step-by-Step Deployment

### Step 1: Prepare Your Code

Your code is ready! The following files have been created:

1. **`vercel.json`** - Vercel configuration
2. **`api/index.py`** - Serverless backend handler
3. **`.env.example`** - Environment variable template

### Step 2: Commit Changes to Git

```bash
cd /Users/tony_pitaniello/Desktop/reg-guard\ FINAL
git add .
git commit -m "chore: prepare for Vercel deployment - add vercel.json and serverless handler"
git push origin main
```

### Step 3: Go to Vercel

Visit: https://vercel.com/

**If you don't have an account:**
- Click "Sign Up"
- Use GitHub account (recommended)

**If you have an account:**
- Log in

### Step 4: Import Project from GitHub

1. Click "Add New..." → "Project"
2. Click "Import Git Repository"
3. Paste your GitHub repo URL:
   ```
   https://github.com/PitanielloPerkins/reg-guard
   ```
   (or your actual GitHub URL)

4. Click "Import"

### Step 5: Configure Project

**Root Directory:**
- Leave blank (it will auto-detect)

**Build Command:**
- Already set in `vercel.json`

**Output Directory:**
- Already set in `vercel.json` (`frontend/dist`)

**Environment Variables:**
Add these 4 variables (Vercel will show input fields):

```
VITE_BACKEND_ORIGIN = https://your-project.vercel.app
VITE_GOOGLE_MAPS_API_KEY = [Your API key from .env]
ANTHROPIC_API_KEY = [Your API key from .env]
FIRECRAWL_API_KEY = [Your API key from .env]
```

Get values from: `/Users/tony_pitaniello/Desktop/reg-guard\ FINAL/frontend/.env`

### Step 6: Deploy

Click "Deploy" button

Wait 2-5 minutes for deployment...

### Step 7: Verify Deployment

Once complete, Vercel shows your URL like:
```
https://reg-guard-queue.vercel.app
```

Test it:
- Frontend: https://reg-guard-queue.vercel.app
- Queue Module: https://reg-guard-queue.vercel.app/queue
- Backend: https://reg-guard-queue.vercel.app/api/health

---

## 🔑 Environment Variables Reference

Get these from your local `.env` files:

```bash
# From frontend/.env
VITE_GOOGLE_MAPS_API_KEY = AIzaSyCMAegyOB1dKjOTA7poKn79R3Qz6dELZlk

# From backend/.env or .env
ANTHROPIC_API_KEY = sk-ant-api03-...
FIRECRAWL_API_KEY = fc-9c9660431dde4f06beee36aee0a33b94
```

---

## ✅ What Happens After Deploy

1. **Automatic**: Vercel starts your application
2. **Automatic**: Assigns URL (https://your-project.vercel.app)
3. **Automatic**: Sets up SSL/HTTPS
4. **Automatic**: Runs forever 24/7
5. **Automatic**: Auto-restarts on crash
6. **Automatic**: Logs available in Vercel dashboard

---

## 📊 After Deployment

### Access Your App:
- Main App: https://reg-guard-queue.vercel.app
- Queue Module: https://reg-guard-queue.vercel.app/queue
- Backend API: https://reg-guard-queue.vercel.app/api/

### View Logs:
- In Vercel dashboard
- Click "Deployments"
- Click your deployment
- Click "View Logs"

### Monitor Health:
```bash
curl https://reg-guard-queue.vercel.app/api/health | jq .
```

---

## 🔄 Future Updates

To update the live app:

```bash
# Make changes locally
# Test with: bash start-perpetual.sh

# Commit and push
git add .
git commit -m "feature: update xyz"
git push origin main

# Vercel automatically redeploys! ✅
```

---

## 🆘 Troubleshooting

### "Build failed"
- Check Vercel logs in dashboard
- Usually missing environment variable
- Add it and redeploy

### "API returns 404"
- Check `api/index.py` exists
- Verify `vercel.json` routes are correct
- Check backend code for issues

### "Port already in use"
- Vercel assigns port automatically
- Not an issue in cloud

### "Environment variable not found"
- Add in Vercel dashboard
- Settings → Environment Variables
- Redeploy (click "Redeploy")

---

## 📞 Quick Reference

| Item | Value |
|------|-------|
| Deployment Platform | Vercel |
| Frontend Framework | Vite + React |
| Backend Framework | FastAPI |
| Serverless Handler | Mangum |
| Repository | GitHub |
| Build Time | 2-5 minutes |
| Uptime | 99.95% |
| Cost | Free (generous tier) |

---

## 🎉 Result

After deployment:
- ✅ Running 24/7 in cloud
- ✅ Auto-restarts on crash
- ✅ Zero manual intervention
- ✅ All Phase 0 features working
- ✅ Ready for Phase 1 development

**Your RegGuard Queue is now on the internet! 🚀**
