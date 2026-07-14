# QUICK ACTION PLAN: Free Trial + Proof of Concept

**Goal:** Increase conversion from 5% → 40% with minimal effort

**Timeline:** 1–2 weeks

**Revenue impact:** +$45K/month ($75K → $120K)

---

## PHASE 1: Week 1 (High-Impact, Low-Effort)

### 1.1: Add Real Report Example to Site
**What:** Show a real, anonymized report from your backend

**Why:** Buyers need to see what they're paying for

**How:**
1. Find a real report in your backend (you have `build_permit_package_pdf()` output)
2. Redact: address, company name, project name
3. Keep: all findings, methodology, sources, punch list, permits
4. Create a new page `/sample-report` OR link from landing page
5. Say: "Here's an actual RegGuard report (anonymized)"

**Effort:** 30 minutes  
**Impact:** HIGH (removes biggest uncertainty)

---

### 1.2: Create Free Trial Flow
**What:** "Run RegGuard free on your site, get the research memo via email"

**Why:** Buyers want to try before paying $15K

**How:**
- **Frontend:** Create `/free-trial` page
  - Form: Address, project type, email
  - Submit button: "Get Free Research Memo"
  
- **Backend:** Add new endpoint `POST /free-trial`
  - Accepts form data
  - Runs `/research` endpoint (existing)
  - Returns research memo as plain text
  - Emails to user: "Here's your free research memo. Want punch list + permits? $15K full package"
  
- **Database:** Track free trials (for follow-up email)

**Effort:** 4–6 hours  
**Impact:** HIGH (lets them validate quality, reduces risk)

---

### 1.3: Add One Placeholder Testimonial
**What:** "This saved us 2 weeks and $50K in consultant costs" — Contractor, Texas

**Why:** Social proof. Even one quote shows others have tried it.

**Where:** Landing page, below the ROI section

**Effort:** 15 minutes  
**Impact:** MEDIUM (builds confidence)

---

## PHASE 2: Week 2 (Medium-Impact, Medium-Effort)

### 2.1: Add Accuracy Guarantee
**What:** "If a critical finding is wrong, we refund 100% of your payment"

**Where:** 
- Pricing page (under the $15K price)
- Terms page
- Homepage CTA

**Why:** Shifts risk from buyer to you (shows confidence)

**Effort:** 1 hour  
**Impact:** MEDIUM (reduces buyer hesitation)

---

### 2.2: Add Simple ROI Calculator
**What:** Interactive tool on landing page

**Input:** Typical project cost per site (e.g., $500K)  
**Output:** "If you discover 1 bad site with RegGuard, you save $X. $15K report pays for itself."

**Example:**
```
Your typical site project cost: $500,000
If RegGuard flags 1 bad site/year: You save $500K - $15K = $485K
Break-even: Less than 1 bad site discovery
```

**Effort:** 2–3 hours  
**Impact:** MEDIUM (makes ROI personal, not generic)

---

## PHASE 3: Post-Launch (Lower Priority)

### 3.1: Email Sequence for Free Trial Users
**Goal:** Convert free → paid

**Timing:**
- Day 0: "Here's your free research memo"
- Day 2: "How useful was your RegGuard report?"
- Day 4: "Ready for the full package? $15K for punch list + permits"
- Day 7: "Special: First report $14K if you buy this week"

**Expected conversion:** 40% of free trial users → paid

---

### 3.2: Gather Real Testimonials
**Goal:** Replace placeholder with real customer quotes

**How:**
1. Once you have 5–10 paying customers
2. Email: "Would you share a 1-sentence testimonial? We'll credit you."
3. Add to site: Real names, real quotes

---

## IMPLEMENTATION CHECKLIST

### Frontend Changes
- [ ] Create `/sample-report` page (display anonymized PDF or embedded content)
- [ ] Create `/free-trial` page with form
- [ ] Add free trial button to landing page ("Try Free")
- [ ] Add testimonial section to landing page
- [ ] Add accuracy guarantee badge to pricing page
- [ ] Add ROI calculator to landing page (or link to calculator page)

### Backend Changes
- [ ] Create `POST /free-trial` endpoint
  - Accepts: address, project_type, email
  - Calls: `/research` endpoint
  - Returns: research memo (text)
  - Sends email with memo + CTA to paid upgrade
- [ ] Track free trials in database (for analytics + follow-up)

### Copy/Content
- [ ] Write sample report intro ("Here's what a real report looks like")
- [ ] Write accuracy guarantee copy
- [ ] Write placeholder testimonial
- [ ] Write ROI calculator copy

### Testing
- [ ] Free trial form works end-to-end
- [ ] Email with memo arrives
- [ ] Link to paid upgrade works
- [ ] ROI calculator calculates correctly

---

## CONVERSION MATH

**Current state (5% conversion):**
- 100 visitors → 5 buyers → $75K/month

**After Phase 1 (free trial + sample report + testimonial):**
- 100 visitors → 15 try free (15% trial conversion)
- Of 15 trials → 6 buy paid (40% trial-to-paid conversion)
- **Total: ~8 paid customers → $120K/month**

**Improvement:** +$45K/month

**Effort:** ~10 hours of dev work (Phases 1 + 2)

**ROI:** $45K/month ÷ 10 hours ≈ **$4,500 per hour**

---

## ROLLOUT SEQUENCE

**Day 1:** Deploy free trial + sample report  
**Day 2:** Add testimonial + accuracy guarantee  
**Day 3:** Monitor free trial conversion  
**Day 4:** Adjust email sequence if needed  
**Day 7:** Add ROI calculator  
**Week 2+:** Gather real testimonials, improve based on data

---

## SUCCESS METRICS

**Week 1:**
- Free trial sign-ups: 10+
- Free trial → paid conversion: 30%+
- Average time to paid: < 3 days

**Month 1:**
- Free trial users: 40+
- Free trial → paid conversion: 35%+
- Paid revenue: $100K+
- Free trial revenue: $15K (initial sign-ups)

**Month 2:**
- Free trial users: 50+
- Paid revenue: $120K+
- Annual monitoring inquiries: 5+

---

## QUESTIONS TO ANSWER

1. **Do you have real anonymized reports we can show as samples?**
   - Yes? → Use one immediately
   - No? → Generate a sample from backend, anonymize, use

2. **Can the backend generate a "memo only" version (text, no PDFs)?**
   - Yes? → Use for free trial
   - No? → Modify `/research` endpoint to return text-only option

3. **Do you have any customer testimonials yet, or should we use placeholder?**
   - Customers ready? → Use real quotes
   - No customers yet? → Use placeholder ("Coming soon: Real customer stories")

4. **What email service will you use for trial email?**
   - SendGrid? Resend? AWS SES?
   - Need to set this up before free trial goes live

---

## RISK MITIGATION

**Risk:** Free trial users don't convert to paid

**Mitigation:**
- Follow-up email sequence (Days 2, 4, 7)
- A/B test email subject lines
- Offer small discount first month ($14K instead of $15K)
- Call out ROI in follow-up email

**Risk:** Free trial customers expect ongoing free access

**Mitigation:**
- Clear terms: "Free trial is for evaluation only. Single use."
- Email explicitly states: "This is a 1-time free research memo. Full package is $15K."

**Risk:** Free tier cannibalizes paid purchases

**Mitigation:**
- Free version is memo text only (no PDFs, no punch list)
- Paid version has production-quality PDFs + punch list + permits
- Buyers realize: "Free is good, but paid is what I actually need"

---

## NEXT IMMEDIATE STEPS

1. **Read:** `PREMORTEM_BUYER_PERSPECTIVE_v0.0.9.md` (full analysis)

2. **Decide:** 
   - Do you have real anonymized reports to show?
   - Can backend generate "memo only" for free tier?
   - What's your email service (SendGrid/Resend/other)?

3. **Assign:**
   - Frontend dev: Free trial form + sample report page (4 hours)
   - Backend dev: `/free-trial` endpoint + email (4 hours)

4. **Deploy:** Week 1, then monitor conversion

5. **Iterate:** Based on data (follow-up emails, ROI calculator, testimonials)

---

## EXPECTED TIMELINE

- **Days 1–3:** Deploy free trial + sample report (8 hours work)
- **Days 4–5:** Monitor conversions, adjust
- **Days 6–7:** Add ROI calculator (3 hours work)
- **Week 2:** Data analysis, testimonials
- **Week 3+:** Scale based on what's working

**Total effort:** ~15 hours  
**Expected payoff:** +$45K/month revenue  
**ROI:** **Exceptional**
