# 🚀 RegGuard Frontend - Quick Start & Testing Guide

**Frontend Location:** `/Users/tony_pitaniello/Desktop/reg-guard FINAL/frontend/`

---

## ⚡ QUICK START (3 Steps - 2 Minutes)

### **Step 1: Start the Frontend Dev Server**
```bash
cd "/Users/tony_pitaniello/Desktop/reg-guard FINAL/frontend"
npm run dev
```

**Expected output:**
```
  VITE v6.0.5  ready in 123 ms

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

### **Step 2: Open in Browser**
```
http://localhost:5173/
```

### **Step 3: Test the Frontend**
- ✅ Homepage loads (with hero section, ROI calculator)
- ✅ Click "Try Free" → Signup page opens
- ✅ Click "Calculate Your Savings" → ROI calculator shows
- ✅ Navigation works (sidebar visible on desktop)

---

## 📱 Frontend Structure

```
/Users/tony_pitaniello/Desktop/reg-guard FINAL/frontend/
├── src/
│   ├── main.tsx                     # Entry point
│   ├── App.tsx                      # Home page component
│   ├── AppRouter.tsx                # Main routing (all pages)
│   ├── PlatformLayout.tsx           # Unified sidebar + layout
│   ├── PlatformDashboard.tsx        # Landing/home page
│   ├── VoiceCommandSystem.tsx        # Voice commands feature
│   ├── OnboardingSystem.tsx          # 5-step tutorial
│   ├── components/
│   │   ├── Queue.tsx                # Interconnection Queue
│   │   ├── RegGuardAgent.tsx         # Research agent
│   │   ├── StudyTranslator.tsx       # Study translation
│   │   ├── TimelineBuilder.tsx       # Timeline visualization
│   │   └── ... (other components)
│   └── css/
│       ├── App.css
│       ├── platform-layout.css
│       ├── voice-command.css
│       └── onboarding-system.css
├── index.html                       # HTML entry
├── vite.config.ts                   # Build config
├── package.json                     # Dependencies
└── .env                             # Environment variables
```

---

## 🧪 What You Can Test Right Now

### **1. Homepage/Landing Page**
**URL:** `http://localhost:5173/`
- ✅ Hero section with "Save $4M" headline
- ✅ ROI calculator (embedded, not separate page)
- ✅ Social proof section (logos, testimonials)
- ✅ Feature cards (Interconnection Checklist, Community, etc.)
- ✅ "Try Free" button → Redirects to signup

**Test by clicking:**
- [ ] "Calculate Your Savings" button
- [ ] "Get Checklist" button
- [ ] "Try Free" button
- [ ] Feature cards ("Interconnection Checklist," "Community Access")

---

### **2. Dashboard (After Login)**
**URL:** `http://localhost:5173/` (if you're logged in) or `/dashboard`
- ✅ Progress metrics (timeline, cost saved, benchmarking)
- ✅ Checklist progress (visual progress bar)
- ✅ Sharing buttons (Email to GC, LinkedIn share, etc.)
- ✅ Community section (discussions, peer tips)

**To test, you need to:**
1. Sign up (create test account)
2. Create a test project
3. See metrics populate

---

### **3. Queue Center (Interconnection Studies)**
**URL:** `http://localhost:5173/queue`
- ✅ Upload FERC notice (or paste project details)
- ✅ Get 47-item checklist
- ✅ View timeline estimate
- ✅ Export as PDF
- ✅ Email to GC button

**Test by:**
- [ ] Clicking "Upload FERC Notice" (should show upload interface)
- [ ] Entering project details manually
- [ ] Seeing checklist generate
- [ ] Clicking "Email to GC"

---

### **4. RegGuard Agent (Research)**
**URL:** `http://localhost:5173/agent`
- ✅ Search for interconnection requirements
- ✅ See research results
- ✅ View benchmarking data
- ✅ Add to checklist

**Test by:**
- [ ] Entering search query ("100MW FERC requirements")
- [ ] Seeing research results populate
- [ ] Clicking "Add to Project"

---

### **5. Community Section**
**URL:** `http://localhost:5173/` → Scroll to "Community" tab or `/community`
- ✅ View discussions (if data exists)
- ✅ Post new discussion
- ✅ See peer tips and best practices
- ✅ Reputation scores visible

**Test by:**
- [ ] Viewing existing discussions
- [ ] Clicking "Post" button
- [ ] Seeing community leaderboard

---

### **6. Voice Commands (if enabled)**
**Activation:** Listen for microphone icon or press voice button
- ✅ Say "help" to see available commands
- ✅ Say "search 100MW" to search
- ✅ Say "show dashboard" to navigate
- ✅ Say "calculate savings" to open calculator

**Test by:**
- [ ] Clicking microphone icon (if visible)
- [ ] Speaking commands
- [ ] Checking browser console for voice logs

---

### **7. Onboarding Tutorial**
**Activation:** Should appear on first login (if you haven't dismissed it)
- ✅ 5-step tutorial showing main features
- ✅ Navigation walkthrough
- ✅ Voice command hints
- ✅ Skip button (stored in localStorage)

**Test by:**
- [ ] Creating new account (first time)
- [ ] Following tutorial steps
- [ ] Clicking "Skip" to dismiss

---

## 🔧 Development Commands

### **Start Dev Server**
```bash
cd "/Users/tony_pitaniello/Desktop/reg-guard FINAL/frontend"
npm run dev
```

### **Build for Production**
```bash
npm run build
```

### **Preview Production Build Locally**
```bash
npm run preview
```

### **Lint Code**
```bash
npm run lint
```

### **Install Dependencies** (if needed)
```bash
npm install
```

---

## 🌍 Environment Variables

The frontend is configured with these API endpoints:

```
VITE_BACKEND_ORIGIN=http://localhost:8001
```

**This means:**
- Frontend: `http://localhost:5173/` (React dev server)
- Backend: `http://localhost:8001/` (FastAPI server)

**If backend is not running:** You'll see errors in console, but frontend should still load.

---

## 📊 Testing the Full Stack (Frontend + Backend)

### **Terminal 1: Start Backend**
```bash
cd "/Users/tony_pitaniello/Desktop/reg-guard FINAL/backend"
python3 -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

**Expected output:**
```
Uvicorn running on http://127.0.0.1:8001
```

### **Terminal 2: Start Frontend**
```bash
cd "/Users/tony_pitaniello/Desktop/reg-guard FINAL/frontend"
npm run dev
```

**Expected output:**
```
VITE v6.0.5  ready in 123 ms
➜  Local:   http://localhost:5173/
```

### **Terminal 3 (Optional): Monitor Logs**
```bash
# Watch for frontend errors
open http://localhost:5173
# Check browser console (F12 → Console tab)

# Watch for backend errors
# Check Terminal 1 for API responses
```

---

## 🚨 Common Issues & Fixes

### **Issue: "Cannot GET /"`
**Cause:** Frontend dev server not running
**Fix:** 
```bash
cd frontend
npm run dev
```

### **Issue: "VITE_BACKEND_ORIGIN is undefined"`
**Cause:** Backend not running
**Fix:**
```bash
cd ../backend
python3 -m uvicorn main:app --host 127.0.0.1 --port 8001
```

### **Issue: "404 Not Found" when clicking links**
**Cause:** React Router not set up correctly
**Fix:** Refresh page (F5) - should go back to home

### **Issue: Page is blank/white**
**Cause:** JavaScript error or component issue
**Fix:**
1. Check browser console (F12 → Console)
2. Look for red errors
3. Take a screenshot and share

### **Issue: "Cannot find module" error**
**Cause:** Dependencies not installed
**Fix:**
```bash
cd frontend
npm install
npm run dev
```

### **Issue: Port 5173 already in use**
**Cause:** Another process is using it
**Fix:**
```bash
# Kill process using port 5173
lsof -ti:5173 | xargs kill -9

# Then restart
npm run dev
```

---

## 📸 Screenshots to Compare

Here's what you should see:

### **Homepage (http://localhost:5173/)**
```
┌─────────────────────────────────────────┐
│ RegGuard Logo            [Signup] [Login]│
├─────────────────────────────────────────┤
│                                          │
│  ⚡ Save $4M on Interconnection Delays  │
│  "Complete your FERC study 6x faster"  │
│                                          │
│  [Calculate Savings]  [Try Free]        │
│                                          │
│  💰 ROI Calculator (embedded)           │
│  [Project size dropdown]                │
│  [Timeline input]                       │
│  [Monthly cost input]                   │
│                    [Calculate]          │
│                                          │
│  Social Proof:                          │
│  ⭐⭐⭐⭐⭐ 4.9/5 from 150+ contractors   │
│  Used by: [Sturgeon] [MasTec] [Merrick]│
│                                          │
│  Features:                              │
│  ☑ Interconnection Checklist            │
│  ☑ Community Access                     │
│  ☑ Benchmarking Reports                │
│  ☑ Real-time Updates                    │
│                                          │
└─────────────────────────────────────────┘
```

### **Dashboard (after login)**
```
┌─────────────────────────────────────────┐
│ [Sidebar with navigation]   Dashboard    │
├─────────────────────────────────────────┤
│                                          │
│  Your Interconnection Progress          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━    │
│                                          │
│  📈 Timeline: On track for 8 months     │
│  (vs. 12-month industry average)        │
│                                          │
│  ✓ Completed: 12 of 47 requirements    │
│  ⏳ In progress: 5 of 47                 │
│  ⚠️ At risk: 3 of 47                    │
│                                          │
│  [Email to GC] [Share Progress] [Print] │
│                                          │
└─────────────────────────────────────────┘
```

---

## 🎯 What to Test (Priority Order)

### **Priority 1: Core Pages Load**
1. [ ] Homepage loads without errors
2. [ ] Dashboard loads (after signup)
3. [ ] Queue page loads
4. [ ] Agent page loads

### **Priority 2: User Actions**
1. [ ] Sign up works
2. [ ] Login works
3. [ ] Logout works
4. [ ] Create project works

### **Priority 3: Features**
1. [ ] Upload FERC notice works
2. [ ] Checklist generates
3. [ ] ROI calculator works
4. [ ] Sharing buttons work

### **Priority 4: Nice-to-Have**
1. [ ] Voice commands work
2. [ ] Community loads
3. [ ] Onboarding tutorial works
4. [ ] Benchmarking displays

---

## 📝 Test Report Template

**When testing, document:**

```
Test Date: _______________
Tester: _______________
Browser: _______________
OS: _______________

[PASS/FAIL] Homepage loads
[PASS/FAIL] ROI calculator works
[PASS/FAIL] Signup flow works
[PASS/FAIL] Dashboard shows metrics
[PASS/FAIL] Queue page displays
[PASS/FAIL] Community section visible
[PASS/FAIL] Voice commands (if testing)
[PASS/FAIL] Onboarding tutorial (if first login)

Issues Found:
1. _______________________
2. _______________________
3. _______________________

Notes:
_______________________
_______________________
```

---

## 🚀 Next Steps After Testing

1. **If homepage + basic navigation works:** ✅ You're good to launch
2. **If dashboard + metrics work:** ✅ You have the core product
3. **If community + sharing works:** ✅ You have the viral engine
4. **If voice + onboarding work:** ✅ You have the UX differentiator

**Once satisfied with testing:**
- Commit changes to git
- Deploy to production (Vercel)
- Start collecting users
- Monitor analytics

---

## 💻 Quick Access Commands

**Copy-paste these to get started immediately:**

```bash
# Start frontend
cd "/Users/tony_pitaniello/Desktop/reg-guard FINAL/frontend" && npm run dev

# In another terminal, start backend
cd "/Users/tony_pitaniello/Desktop/reg-guard FINAL/backend" && python3 -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload

# Open in browser
open http://localhost:5173/
```

---

## ✅ Ready to Test?

**Start here:**
```bash
cd "/Users/tony_pitaniello/Desktop/reg-guard FINAL/frontend"
npm run dev
open http://localhost:5173/
```

**You should see the RegGuard homepage in 10 seconds.**

Good luck! 🚀
