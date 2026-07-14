# RegGuard v0.0.8: Critical Fixes & Automation Architecture

**Commit:** `0014d821`  
**Date:** July 13, 2026  
**Status:** Major rewrite based on customer feedback  

---

## Issues Found & Fixed

### 1. ❌ Feature-focused messaging → ✅ Problem-focused messaging

**Was:** "Regulatory research + RTO worksheets + cited sources"  
**Now:** "Your research takes 6 weeks and costs $100K. We cut it to same-day and $15K."

**Framework used:** StoryBrand (character → problem → guide → plan → failure → success)

---

### 2. ❌ Missing key deliverables from marketing

**Was:** Positioning as "regulatory research" + "RTO worksheets"  
**Now:** **Actual deliverables (what backend produces):**
- Research memo PDF
- **Contractor punch list PDF** (actionable checkbox items)
- **Permit application package PDF** (forms ready to file)

**Impact:** Customer gets complete output, not partial. Clear what they're paying for.

---

### 3. ❌ Confusing pricing model

**Was:** $15K first report + $20K/year monitoring (2-3 reports) = $11.7K per report on annual  
**Now:**
- **Per-report:** $15,000 (simple, clear)
- **Annual monitoring:** $20,000/year (separate add-on, optional)
- **Bulk:** 3+ reports = $12K each

**Why:** No bundling confusion. You pay for what you use.

---

### 4. ❌ $15,000 vs $14,999 pricing psychology

**Decision:** Keep at $15,000 (NOT $14,999)  
**Reasoning:**
- $14,999 = signals "we're discounting" (cheap, weak)
- $15,000 = confidence, professional services pricing
- PE firms, contractors, consultants prefer round numbers
- Standard in B2B professional services

---

### 5. ❌ "48-hour" delivery is inaccurate

**Was:** "Delivered in 48 hours" (implied queue/manual work)  
**Now:** **"Same-day delivery"**
- Research generation: 5–15 minutes (automated)
- PDF creation: 1–3 minutes (automated)
- Quality hold: 2–4 hours (human review, optional)
- Instant option: Skip hold, get PDFs immediately

**Reality:** The backend is **fast** (minutes), not slow (48 hours).

---

### 6. ❌ Manual email fielding (not scalable)

**Was:** Customer pays → You manually email result  
**Now:** **Fully automated order → delivery pipeline**

**New flow:**
1. Customer fills form (address, project type, payment)
2. Pays via Stripe
3. **Webhook triggers** `/research` endpoint automatically
4. **Research runs** → generates 3 PDFs
5. **Email sent** automatically with download links + portal access
6. **Customer portal** for re-downloads
7. **Zero manual work** (except monitoring)

---

### 7. ❌ Hamburger menu with nowhere to go

**Was:** Hamburger nav icon on public homepage (no routes)  
**Now:** Removed entirely  
**Why:** Cleaner, less confusing UX for public visitors

---

## What Backend Already Produces

The backend (`backend/main.py`) **already generates all three PDFs**:

```python
# Research memo (markdown) → converted to PDF
iter_contractor_action_plan_stream()  # Punch list
build_permit_package_pdf()  # Permit package
```

**These are not hypothetical—they're production-ready.**

---

## Corrected Business Model

### Pricing Tiers

| Plan | Price | Use Case |
|------|-------|----------|
| **Per-report** | $15,000 | One-off screening |
| **Bulk (3+)** | $12,000 each | Multiple sites |
| **Annual Monitoring** | $20,000/year | Active portfolio (includes 3 reports + updates) |

### What's Included in Every Report

1. **Research Memo (PDF)** — 8–12 pages
   - Permitting requirements by jurisdiction
   - Timeline
   - Preliminary costs
   - Key contacts
   - Moratorium/risk flags

2. **Contractor Punch List (PDF)** — Actionable checklist
   - Step 1: Call municipal planning (template email provided)
   - Step 2: Submit pre-application inquiry (forms provided)
   - Step 3: Interconnection application (if applicable)
   - Step 4: Next steps (who to call when)

3. **Permit Application Package (PDF)** — Ready to file
   - Pre-filled forms for your jurisdiction
   - Checklists of required documents
   - Example submissions
   - Filing instructions

---

## Corrected Messaging (StoryBrand Framework)

### Character (Your Customer)
You're a contractor/developer. You screen sites.

### Problem (Their Pain)
- Current: Hire a law firm → 2–4 weeks → $75K–$150K → get a memo → still confused
- Result: Slow decision-making. Bad sites discovered too late. Capital wasted.

### Guide (What RegGuard Does)
- We accelerate the research part
- Same quality, 80% less cost, 10x faster
- You get **actionable** deliverables (not just a memo)

### Plan (How to Act)
1. Order a report ($15,000)
2. Submit your address + project details
3. Get PDFs same-day
4. Act on the punch list

### Call to Action
"Order Your Report" (clear, simple)

### Failure (What Happens Without RegGuard)
- Bad site discovered mid-IC study ($100K+ wasted)
- Permitting issues discovered too late
- Multiple lawyers, no coordination
- Slow decisions = lost opportunities

### Success (What They Gain)
- Kill bad sites for $15K (not $100K)
- Fast decisions (same-day, not weeks)
- Clear next steps (punch list, not confusion)
- Professional documents (ready to file)

---

## Automation Architecture (Zero Manual Work)

### Current Flow (BROKEN)
```
Customer Order → Stripe Payment → You Get Webhook → ??? → Manual Email
```

### New Flow (AUTOMATED)
```
1. Customer submits order form
   ├─ Address
   ├─ Project type
   └─ Payment info
        ↓
2. Stripe Checkout
   └─ Payment processed
        ↓
3. Webhook: checkout.session.completed
   └─ Extracts form data + payment + email
        ↓
4. Supabase Insert
   ├─ Create user (if new)
   ├─ Create order record
   └─ Store form data (address, type, etc.)
        ↓
5. Async Job: Trigger /research endpoint
   ├─ Pass order ID + form data
   └─ Run research (5–15 minutes)
        ↓
6. Generate PDFs
   ├─ build_permit_package_pdf()
   ├─ iter_contractor_action_plan_stream()
   └─ research_memo (from /research output)
        ↓
7. Upload to Cloud Storage (S3 / Vercel Blob Storage)
   └─ Get download links
        ↓
8. Auto Email
   ├─ Download links for 3 PDFs
   ├─ Portal login credentials
   └─ Subject: "Your RegGuard Report — Ready to Download"
        ↓
9. Customer Portal
   ├─ All past orders
   ├─ Download links (permanent)
   └─ Support contact info
        ↓
✅ DONE (Zero manual work)
```

### Tech Stack for Automation

**Frontend → Order Form**
- React form component
- Collects: address, project type, company name, email
- Validates address (geolocation check)

**Backend → Stripe Webhook**
- `/auth/webhook/stripe` (already exists in `main.py`)
- Handles `checkout.session.completed` event
- Extracts order data
- Queues async job

**Backend → Async Research Job**
- Celery or APScheduler task
- Calls `/research` endpoint with order data
- Generates PDFs
- Uploads to storage

**Email Service**
- SendGrid or Resend (cheap, reliable)
- Sends same-day email with download links
- Template: Professional, branded

**Customer Portal**
- Simple React page
- Shows past orders
- Download links
- Account info

**Cloud Storage**
- Vercel Blob Storage (built-in to Vercel)
- OR: AWS S3 (flexible)
- OR: Supabase Storage (built-in to Supabase)
- Cheap, reliable, secure

---

## Implementation Roadmap

### Phase 1: Order Form & Payment (2–3 days)
- [ ] Create `/order` page (address form + Stripe Checkout)
- [ ] Connect to existing `/auth/create-checkout-session` endpoint
- [ ] Test Stripe payment flow locally

### Phase 2: Webhook & Data Storage (1–2 days)
- [ ] Ensure `/auth/webhook/stripe` saves order to Supabase
- [ ] Add `orders` table: id, email, address, project_type, created_at, status
- [ ] Test webhook with ngrok

### Phase 3: Async Research Job (2–3 days)
- [ ] Set up Celery (or APScheduler) in backend
- [ ] Create task: `generate_research_and_pdfs(order_id)`
- [ ] Task calls `/research` endpoint, builds PDFs
- [ ] Uploads to Vercel Blob Storage
- [ ] Updates order status to `completed`

### Phase 4: Email Automation (1–2 days)
- [ ] Add SendGrid/Resend API key to backend `.env`
- [ ] Create email template (branded, download links)
- [ ] After PDF generation → auto email customer
- [ ] Update order status to `sent`

### Phase 5: Customer Portal (2–3 days)
- [ ] Create `/account` page
- [ ] Show past orders
- [ ] Download links to PDFs
- [ ] Basic account settings

### Phase 6: Testing & Launch (1–2 days)
- [ ] End-to-end testing (order → payment → email → download)
- [ ] Load testing (can the backend handle concurrent orders?)
- [ ] Deploy to production

**Total:** ~2 weeks with focused effort

---

## Deployment Checklist

- [ ] Stripe keys (public + secret) added to Vercel + backend `.env`
- [ ] SendGrid/Resend API key in backend `.env`
- [ ] Supabase `orders` table created
- [ ] Celery/APScheduler configured
- [ ] Cloud storage (Vercel Blob) configured
- [ ] Email templates created + tested
- [ ] Customer portal tested locally
- [ ] ngrok webhook testing successful
- [ ] Production Render deployment ready
- [ ] Vercel deployment triggers on git push
- [ ] Monitoring/Sentry alerts set up

---

## Revenue Model (Sustainable)

### Unit Economics (Per Report)

**Revenue:** $15,000  
**Cost of Goods Sold:**
- Firecrawl API: ~$5–$20 per report (depending on complexity)
- Claude API (research + punch list generation): ~$2–$10 per report
- Permit package generation: ~$0.10 (no external API)
- Email + storage: ~$0.50 (negligible)
- **Total COGS: ~$30 per report**

**Gross Margin:** $14,970 per report (99.8%!)  
**CAC (Customer Acquisition Cost):** TBD (depends on your marketing)  
**Gross Profit Margin:** ~95%+ (after support costs)

### Scalability

- Backend auto-scales with Render
- Firecrawl + Claude are pay-per-use (no infrastructure)
- Email + storage are negligible costs
- **Bottleneck:** Your time (support, monitoring)

---

## Key Metrics to Track

**Monthly:**
- Orders received
- Completion rate (% of orders successfully generated)
- Average research time
- PDF generation success rate
- Email delivery rate

**Customer:**
- NPS (Net Promoter Score)
- Refund rate
- Reorder rate

**Financial:**
- Revenue per month
- Customer acquisition cost (CAC)
- Lifetime value (LTV)
- Gross margin %

---

## Next Immediate Steps (You)

1. **Verify Vercel deployment** shows new landing page (StoryBrand messaging)
2. **Verify pricing page** shows $15K + $20K/year (clear, simple)
3. **Review "How It Works" page** (honest about timeline + guarantees)
4. **Choose order fulfillment stack:**
   - Backend: Already ready (researches + generates PDFs)
   - Email: SendGrid ($20/mo) or Resend ($20/mo)?
   - Storage: Vercel Blob (built-in, free tier) or S3?
   - Portal: Simple React page (1–2 days to build)
5. **Hire developer** for 2-week sprint to build automation (Phases 1–6 above)

---

## Summary

**What Changed:**
- ✅ StoryBrand messaging (problem-focused, not feature-focused)
- ✅ Honest pricing ($15K, $20K/year, $12K bulk)
- ✅ Accurate timeline (same-day, not 48 hours)
- ✅ Honest deliverables (3 PDFs: memo, punch list, permits)
- ✅ Automation plan (zero manual email fielding)

**What Stays the Same:**
- ✅ Backend already produces all 3 PDFs
- ✅ Stripe integration ready
- ✅ Same core value (accelerate site research)

**Next Phase:**
- Build automated order → research → email → portal pipeline (2 weeks)
- Launch with honest, problem-focused messaging
- Track metrics
- Scale

**Status:** Ready for Phase 1 (Order Form & Payment)
