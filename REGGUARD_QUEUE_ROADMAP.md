# RegGuard Queue: Passive $1B+ Business Roadmap

## Executive Summary

**Opportunity:** Build RegGuard Queue - autonomous FERC/interconnection form automation for renewable energy developers. Zero competition, $22.5M direct TAM expanding to $200M+ with adjacent products.

**Differentiation:** We own the developer side (PowerClerk owns utility side). Passive growth through organic SEO + referrals. Designed for part-time execution while working full-time.

**Timeline:** MVP in 6 weeks → $50-150k MRR by month 6 → $1-5M ARR by year 2 → $50-100M ARR by year 5 → $1B+ valuation by year 8.

---

## Product Architecture

### RegGuard Platform

```
RegGuard (Parent Brand)
├── RegGuard Permits (Risk Analysis) - EXISTING
│   └── Data center permitting risk assessment
│   └── Pricing: $99-500/mo or per-analysis
│   └── Current users: 50-100 active
├── RegGuard Queue (NEW - Phase 1)
│   └── FERC/interconnection form automation
│   └── Pricing: $99-5,000/project or $500-2k/mo subscription
│   └── Target: Renewable energy developers
└── RegGuard Compliance (Future - Phase 3)
    └── EPA environmental form automation
    └── Pricing: $50-500/project
    └── Target: All renewable/data center projects
```

### Reusable Assets from RegGuard

**70% of infrastructure already exists:**
- ✅ Firecrawl scraping pipeline (modify for form extraction)
- ✅ Backend data pipeline (adapt for form field mapping)
- ✅ Database schema (modify leads → submissions table)
- ✅ Frontend form builder (adapt data center form → permit form renderer)
- ✅ React Router architecture (add /queue routes)
- ✅ Authentication/billing (reuse Supabase auth + Stripe)
- ✅ LLM integration (Claude for form field extraction + auto-fill)

---

## Phase Breakdown

### PHASE 1: FERC Auto-Fill MVP (Weeks 1-6)

**Deliverables:**
- FERC Form 556/557 auto-fill (80%+ accuracy)
- Upload project PDF → Auto-filled form PDF download
- Basic user accounts (Supabase auth)
- Freemium model: 1 free form/month
- Landing page + docs

**Key Files to Create:**
- `backend/queue/ferc_scraper.py` - Extract FERC form requirements
- `backend/queue/form_mapper.py` - Map project data → FERC fields
- `backend/queue/auto_filler.py` - Claude fills form intelligently
- `backend/api/queue_endpoints.py` - POST /queue/auto-fill, GET /queue/status
- `frontend/src/Queue/UploadForm.tsx` - Simple upload interface
- `frontend/src/pages/QueueLanding.tsx` - Marketing landing page

**Success metrics:**
- Product launches with 95%+ accuracy on test forms
- First 50 users sign up (friends/beta testers)
- 500+ organic visits/month from SEO

**Time estimate:** 40-50 hours (nights/weekends over 6 weeks)

---

### PHASE 2: Multi-RTO Support + Public Launch (Weeks 7-12)

**Deliverables:**
- PJM NextGen form auto-fill
- MISO interconnection form auto-fill
- ERCOT form auto-fill (if applicable)
- Public landing page + blog
- SEO optimization (target "interconnection queue", "auto-fill FERC form")

**Success metrics:**
- 500+ organic visits/month from SEO
- 50-100 signups/month
- 5-10% converting to Pro ($99/mo)

**Time estimate:** 30-40 hours

---

### PHASE 3: EPA/Environmental Forms (Months 4-6)

**Deliverables:**
- NEPA Environmental Assessment auto-fill
- Endangered Species Act compliance forms
- Wetlands impact statement generation

**Success metrics:**
- 200+ Environmental forms auto-filled
- Additional $1-3k MRR from Compliance product

**Time estimate:** 20-30 hours

---

### PHASE 4: White-Label to Utilities (Months 7-9)

**Deliverables:**
- White-label API for utilities to embed RegGuard Queue
- Utility-branded portal
- B2B2C go-to-market

**Success metrics:**
- 3-5 utility partnerships signed
- $5-50k/mo per utility contract

**Time estimate:** 30-40 hours

---

### PHASE 5: Enterprise + Acquisitions (Months 10-12)

**Deliverables:**
- RegGuard Queue Enterprise tier ($5-50k/mo)
- Salesforce/HubSpot integrations
- Advanced analytics

**Success metrics:**
- 2-5 enterprise contracts signed
- $50-250k additional MRR
- Total MRR by month 12: $100-300k

**Time estimate:** 20-30 hours

---

## Revenue Model

### Pricing Strategy

**Tier 1: Free**
- 1 auto-filled form/month
- Limited to FERC forms
- Purpose: Lead generation

**Tier 2: Pro ($99-499/mo)**
- Unlimited forms for one RTO
- All RTOs (PJM/MISO/ERCOT)
- API access (100 requests/month)

**Tier 3: Enterprise ($5-50k/mo)**
- Unlimited everything
- White-label option
- Custom integrations
- Dedicated support

### Revenue Projections

| Timeline | Free Users | Pro Users | Enterprise | MRR |
|----------|-----------|-----------|-----------|-----|
| Month 3 | 200 | 10 | 0 | $2-5k |
| Month 6 | 1,000 | 50-100 | 1-2 | $50-150k |
| Month 9 | 3,000 | 150-300 | 3-5 | $200-400k |
| Month 12 | 5,000 | 300-500 | 5-10 | $100-300k |
| Year 2 | 20,000 | 1,000-2,000 | 20-30 | $300-800k |
| Year 5 | 200,000 | 15,000-25,000 | 200-500 | $5-15M |

---

## SEO & Passive Growth Strategy

### Target Keywords (Zero Competition)

- "FERC form auto-fill" (150/mo, LOW difficulty)
- "Interconnection queue software" (300/mo, LOW difficulty)
- "Auto-fill interconnection application" (200/mo, LOW difficulty)
- "FERC 556 form filler" (100/mo, LOW difficulty)
- "PJM interconnection automation" (75/mo, LOW difficulty)

**Expected Traffic:**
- Month 3-6: 500-1,000 visits/month
- Month 7-12: 3-5k visits/month
- Year 2: 15-20k visits/month

### Content Marketing

**Blog posts (1-2 per month):**
1. "How to Fill FERC Form 556 in 60 Seconds"
2. "PJM Interconnection Queue Explained"
3. "MISO Application Automation Guide"
4. "FERC Interconnection Timeline 2026"
5. "Why Developers Choose RegGuard Queue"

**Organic Referrals:**
- 30-40% of growth from word-of-mouth by month 6
- In-product "Share" button for easy referral

---

## Time Commitment (Full-Time Job Compatible)

| Phase | Months | Hours/Week | Total Hours |
|-------|--------|-----------|-------------|
| Phase 1 | 1-2 | 15-20 | 120-160 |
| Phase 2 | 3-4 | 10-15 | 80-120 |
| Phase 3 | 5-6 | 5-10 | 50-80 |
| Phase 4 | 7-9 | 5-10 | 50-100 |
| Phase 5 | 10-12 | 3-5 | 30-60 |
| **Year 1 Total** | | | **330-520** |

**Real-world schedule:** 3-4 hrs/night during MVP → 2 hrs/night during multi-RTO → 1-2 hrs/week passive maintenance

---

## Why This Wins

1. **Zero Competition** - PowerClerk owns utilities; you own developers
2. **Defensible Moat** - Proprietary form parsing + LLM knowledge
3. **Sticky Users** - Developers use for EVERY project
4. **Natural Upsell** - FERC → EPA → Utilities white-label → Permitting
5. **$200M+ TAM** - Interconnection + EPA + Utilities + State/local permits

---

## Success Milestones

- **Month 3:** FERC MVP with 95%+ accuracy, 50-100 beta users
- **Month 6:** Multi-RTO launch, $50-150k MRR, 500-1k organic visits/month
- **Month 12:** 5-10 enterprise deals, $100-300k MRR
- **Year 2:** $300-800k MRR, RegGuard Compliance launched
- **Year 5:** $5-15M MRR, acquisition target for Procore/Constellation

---

## Next Steps

1. ✅ Roadmap approved
2. **Start Phase 1** - Create FERC scraper + auto-fill engine
3. **Week 6** - Launch MVP for beta testing
4. **Month 3** - Public launch with multi-RTO support
5. **Month 6** - Evaluate growth + plan Phase 4
