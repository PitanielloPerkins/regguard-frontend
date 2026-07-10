# RegGuard Platform - Deployment Checklist

## Pre-Deployment Verification

### Code Quality
- [ ] Run frontend lint: `cd frontend && npm run lint`
- [ ] Run tests: `npm run test:frontend`
- [ ] No console errors in browser (F12)
- [ ] No TypeScript errors: `cd frontend && npx tsc --noEmit`
- [ ] Backend code reviewed
- [ ] No hardcoded secrets in codebase
- [ ] Git history is clean (no accidental commits)

### Functionality Testing
- [ ] Homepage loads and displays all features
- [ ] Sidebar navigation works on desktop
- [ ] Mobile drawer menu appears on small screens
- [ ] All feature cards are clickable
- [ ] Responsive design tested (mobile/tablet/desktop)
- [ ] Dark/light mode works (if applicable)
- [ ] User can navigate between all routes
- [ ] Active route highlighting works
- [ ] Sign out button functions

### Feature Testing

#### RegGuard Agent
- [ ] Address autocomplete works
- [ ] Google Maps suggestions appear
- [ ] Voice input functions (if applicable)
- [ ] Form submission works
- [ ] PDF generation works
- [ ] Research endpoint responds

#### Queue Center
- [ ] Queue landing page loads
- [ ] Form upload works
- [ ] File parsing functions
- [ ] Queue monitor displays data
- [ ] Study translator extracts data
- [ ] Timeline predictor calculates dates
- [ ] All Queue APIs respond

#### Data Center Analysis
- [ ] Form validation works
- [ ] All fields are present
- [ ] Form submission works
- [ ] Analysis backend responds
- [ ] Results display correctly

#### Sales Pipeline
- [ ] Dashboard loads
- [ ] Leads display
- [ ] Supabase connection works
- [ ] Data refreshes

### API Integration
- [ ] Backend API endpoints are accessible
- [ ] CORS headers are correct
- [ ] All required endpoints working
- [ ] Error handling works
- [ ] Response format is correct
- [ ] Rate limiting (if any) is configured

### Environment Configuration

#### Frontend `.env`
```bash
✓ VITE_BACKEND_ORIGIN set correctly
  Production: https://regguard-api.onrender.com
  Staging: https://staging-api.onrender.com
  Local: http://localhost:8001
✓ VITE_GOOGLE_MAPS_API_KEY set
✓ No secrets hardcoded
```

#### Backend `.env` (if using)
```bash
✓ ANTHROPIC_API_KEY set
✓ FIRECRAWL_API_KEY set
✓ GOOGLE_MAPS_API_KEY set
✓ SUPABASE_URL set
✓ SUPABASE_KEY set
✓ All secrets are environment variables (not in code)
```

#### Vercel Environment Variables
Go to Vercel → Project Settings → Environment Variables
- [ ] `VITE_BACKEND_ORIGIN` set to `https://regguard-api.onrender.com`
- [ ] `VITE_GOOGLE_MAPS_API_KEY` set
- [ ] Variables are set for Production
- [ ] Variables are set for Preview (if needed)
- [ ] No sensitive data visible

#### Render Environment Variables
Go to Render → Backend Service → Environment
- [ ] `ANTHROPIC_API_KEY` set
- [ ] `FIRECRAWL_API_KEY` set
- [ ] `GOOGLE_MAPS_API_KEY` set
- [ ] `SUPABASE_URL` set
- [ ] `SUPABASE_KEY` set

### Build Process
- [ ] Frontend builds successfully: `npm run build:frontend`
- [ ] No build warnings (except expected ones)
- [ ] Build output size is reasonable (~450KB gzipped)
- [ ] Backend requirements.txt is up to date
- [ ] No missing dependencies

### Performance Checks
- [ ] Lighthouse score > 85 (run locally)
- [ ] Homepage loads in < 2s
- [ ] API responses < 500ms (cached), < 2s (uncached)
- [ ] No memory leaks in browser
- [ ] Network tab shows minimal requests
- [ ] Images are optimized

### Security Checks
- [ ] No API keys in source code
- [ ] No hardcoded passwords
- [ ] CORS is properly configured
- [ ] HTTPS is enforced (Vercel/Render handle this)
- [ ] Security headers are set (if needed)
- [ ] Input validation works
- [ ] SQL injection prevention (backend)
- [ ] XSS prevention (frontend)

### Database
- [ ] Supabase project is active
- [ ] Database credentials are correct
- [ ] Tables are created
- [ ] Indexes are optimized
- [ ] Backups are enabled

### Custom Domain Setup

#### Domain: `regguardagent.com`
- [ ] Domain is registered (Squarespace)
- [ ] Registered to your account
- [ ] Auto-renewal is enabled

#### Vercel Configuration
1. Go to Vercel → Project Settings → Domains
2. Add domain: `regguardagent.com`
3. Vercel provides nameservers:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`

#### Squarespace Configuration
1. Go to Squarespace → Domain Settings
2. Find "Advanced" → "Nameservers"
3. Change from Squarespace nameservers to:
   ```
   ns1.vercel-dns.com
   ns2.vercel-dns.com
   ```
4. Save (changes take 24-48 hours to propagate)

- [ ] Nameservers updated in Squarespace
- [ ] No other domains pointing to these nameservers
- [ ] Waiting for DNS propagation (check with `nslookup regguardagent.com`)
- [ ] Domain resolves to Vercel (use https://www.nslookup.io/)

### Production Deployment

#### Frontend (Vercel)
1. Push code to GitHub `main` branch
   ```bash
   git add .
   git commit -m "Deploy: Unified RegGuard platform"
   git push origin main
   ```

2. Vercel automatically triggers build
   - [ ] Build completes without errors
   - [ ] Deployment shows "Ready" status
   - [ ] Preview deployment available
   - [ ] Production deployment available

3. Access production
   - [ ] https://regguard-live.vercel.app (temporary URL)
   - [ ] https://regguardagent.com (custom domain after DNS propagates)

#### Backend (Render)
1. Connect GitHub repository (if not already connected)
2. Render auto-deploys on push to `main`
   - [ ] Build succeeds
   - [ ] Service shows "Live"
   - [ ] Health check passes
   - [ ] API endpoints are responding

3. Access backend
   - [ ] https://regguard-api.onrender.com/docs (API docs)
   - [ ] Test endpoints with cURL or Postman

### Post-Deployment Verification

#### Frontend
- [ ] https://regguardagent.com loads (after DNS propagation)
- [ ] Homepage displays correctly
- [ ] All navigation works
- [ ] No console errors
- [ ] Responsive design verified
- [ ] Feature cards clickable
- [ ] Sidebar functional

#### Backend
- [ ] https://regguard-api.onrender.com/docs accessible
- [ ] Test endpoint (e.g., `/health` if available)
- [ ] Check logs for errors
- [ ] Verify API response times

#### Integration
- [ ] Frontend communicates with backend
- [ ] Address autocomplete works end-to-end
- [ ] Form submission works
- [ ] Data flows correctly
- [ ] No CORS errors
- [ ] Error handling works

#### Performance
- [ ] Load test with multiple simultaneous requests
- [ ] Monitor response times
- [ ] Check resource utilization
- [ ] Verify caching is working

### Monitoring Setup

- [ ] Error monitoring configured (Sentry, etc., optional)
- [ ] Application logs are accessible
- [ ] Render backend logs accessible
- [ ] Vercel deployment logs accessible
- [ ] Alerts configured for:
  - [ ] 5xx errors
  - [ ] High response times
  - [ ] Service downtime

### Documentation

- [ ] README.md updated
- [ ] Deployment instructions documented
- [ ] Environment variables documented
- [ ] API endpoints documented
- [ ] Troubleshooting guide available
- [ ] Architecture documentation present
- [ ] Integration guide available

### Backup & Recovery

- [ ] Database backups enabled (Supabase)
- [ ] Backup testing procedure documented
- [ ] Disaster recovery plan created
- [ ] Important data backed up

---

## Deployment Runbook

### Pre-Deploy (30 min before)
```bash
# 1. Pull latest code
git pull origin main

# 2. Run tests
npm run test:frontend

# 3. Build locally
npm run build:frontend

# 4. Check for errors
# Look at console output carefully

# 5. Verify environment variables are set
cat frontend/.env
```

### Deploy (5 min)
```bash
# 1. Commit changes
git add .
git commit -m "Release: RegGuard v0.4 - Unified Platform"

# 2. Push to GitHub (triggers Vercel + Render)
git push origin main

# 3. Monitor deployments
# Vercel: https://vercel.com/dashboard
# Render: https://dashboard.render.com
```

### Post-Deploy (15 min)
```bash
# 1. Check Vercel deployment
# Status should show "Ready"

# 2. Check Render deployment
# Status should show "Live"

# 3. Test production frontend
# Open https://regguardagent.com (or temp Vercel URL)

# 4. Test production backend
# Open https://regguard-api.onrender.com/docs

# 5. Run smoke tests
# Try key features (address autocomplete, form submit, etc.)

# 6. Monitor logs for errors
# Check both Vercel and Render logs
```

---

## Rollback Plan

If something goes wrong in production:

### Option 1: Revert Last Commit
```bash
git revert HEAD
git push origin main
# Vercel/Render will auto-redeploy previous version
# Takes ~2-5 minutes
```

### Option 2: Manual Rollback (Vercel)
1. Go to Vercel dashboard
2. Select regguard-live project
3. Click "Deployments"
4. Find last working deployment
5. Click "..." → "Promote to Production"

### Option 3: Manual Rollback (Render)
1. Go to Render dashboard
2. Select backend service
3. Click "Deploys"
4. Find last working deployment
5. Click "Redeploy"

---

## Success Criteria

After deployment, verify:

✅ Homepage loads in < 2 seconds  
✅ All navigation works  
✅ Feature cards are clickable  
✅ Address autocomplete functions  
✅ Forms submit successfully  
✅ No console errors  
✅ Responsive design works  
✅ Mobile menu works  
✅ API responses are fast  
✅ No 5xx errors in logs  
✅ User can access all features  
✅ Data persists correctly  
✅ Performance is acceptable  

---

## Support Contacts

- **Vercel Support:** https://vercel.com/support
- **Render Support:** https://render.com/support
- **Supabase Support:** https://supabase.com/support
- **Your Team:** Direct communication

---

## Sign-Off

- [ ] Project owner reviews and approves
- [ ] Tech lead approves deployment
- [ ] QA confirms testing complete
- [ ] Deployment authorized

**Deployed by:** ________________  
**Date:** ________________  
**Time:** ________________  
**Status:** ✅ Successful | ❌ Rollback

**Notes:**
```




```

---

**After successful deployment, share the link with users and celebrate! 🎉**
