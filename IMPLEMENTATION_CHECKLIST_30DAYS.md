# ✅ IMPLEMENTATION CHECKLIST: Premium Features

## 🎯 QUICK START (First 30 Days)

### Week 1: Environmental Screening Foundation

**Day 1-2: Partner Negotiation**
- [ ] Research EcoAssess, EnviroMapper, other environmental screening APIs
- [ ] Get pricing/API docs from 3 candidates
- [ ] Negotiate contract ($2-5 per report OR 10-15% revenue share)
- [ ] Decision: Which partner to use?

**Day 3-5: API Integration**
- [ ] Set up sandbox environment with partner
- [ ] Create `environmental_screening.py` service
- [ ] Write API client + error handling
- [ ] Test with 5 sample addresses

**Day 6-7: Frontend Updates**
- [ ] Add environmental checkbox to `/free-trial` form
- [ ] Add environmental section to `/order` page
- [ ] Add environmental section to sample report
- [ ] Cost: +$3,000 for environmental (or included in premium)

**Success Metric:** Environmental data appears in mock research reports

---

### Week 2: Premium Tier Framework

**Day 8-10: Backend Setup**
- [ ] Create `premium_tier_handler.py`
- [ ] Add tier selector: Standard ($15K) vs. Premium ($25K)
- [ ] Add IC consultant call scheduling
- [ ] Add custom utility analysis
- [ ] Add network upgrade analysis

**Day 11-12: Frontend Premium Tier Page**
- [ ] Create tier selection UI (Standard vs. Premium)
- [ ] Add tier comparison chart
- [ ] Add IC consultant call scheduling widget
- [ ] Price calculation: $15K → $25K for 250+ MW

**Day 13-14: Database Schema**
- [ ] Alter orders table: add `tier`, `is_data_center_250plus`, `ic_consultant_prep_call_scheduled`
- [ ] Create migrations
- [ ] Test database changes

**Success Metric:** Can select "Premium Tier" on `/order` page, pricing updates

---

### Week 3-4: IC Partner API

**Day 15-18: API Implementation**
- [ ] Create `ic_partner_api.py` with FastAPI router
- [ ] Implement POST `/research/create` (white-label research creation)
- [ ] Implement GET `/research/{id}/pdf` (get PDF URLs)
- [ ] Implement webhook configuration
- [ ] Authentication: API key system

**Day 19-21: API Documentation**
- [ ] Write OpenAPI/Swagger spec
- [ ] Create /docs/api page with examples
- [ ] Write Python + JavaScript client code examples
- [ ] Create webhook validation code example

**Day 22-23: Partner Onboarding Flow**
- [ ] Create channel partner signup page
- [ ] Generate API keys automatically
- [ ] Send onboarding email with API docs
- [ ] Create partner dashboard (basic)

**Success Metric:** IC partner can create research order via API, receives webhook

---

### Week 5-6: Utility Timelines

**Day 24-28: Utility Queue Data**
- [ ] Create `utility_queue_data` table
- [ ] Write FERC API scraper (for each RTO)
- [ ] Implement weekly update task
- [ ] Populate initial data (ERCOT, SPP, PJM, MISO)

**Day 29-30: Timeline Calculation**
- [ ] Implement `UtilityTimelineService`
- [ ] Calculate Phase 1 wait time based on queue position
- [ ] Calculate Phase 2 wait time
- [ ] Display on research memo

**Day 31: Testing**
- [ ] Test with 10 different addresses/RTOs
- [ ] Verify timeline accuracy (vs. manual data)
- [ ] Set up weekly queue data refresh

**Success Metric:** Research memo shows "Your Phase 1 timeline: 14 months (47 projects ahead)"

---

### Week 7-8: Bulk Discounts & Marketing

**Day 32-35: Bulk Discount Logic**
- [ ] Update pricing calculator for bulk orders
- [ ] Implement Stripe bulk checkout session
- [ ] Create bulk order tracking (group_id)
- [ ] Commission calculation for bulk

**Day 36-39: Bulk Ordering UI**
- [ ] Add bulk order form to `/order` page
- [ ] Show discount breakdown
- [ ] Quantity calculator
- [ ] Bulk order success page

**Day 40-42: Marketing Setup**
- [ ] Create channel partner landing page
- [ ] Draft partnership agreement
- [ ] Create onboarding email sequence
- [ ] List of IC firms to outreach

**Success Metric:** Can order 5 reports with 33% discount, see $50K price (not $75K)

---

### Week 9-10: Channel Launch & Testing

**Day 43-45: Partner Outreach**
- [ ] Identify 10 target IC firms
- [ ] Send launch email with API access
- [ ] Schedule 5 demo calls
- [ ] Get feedback on API/pricing

**Day 46-49: Refinement**
- [ ] Fix API issues from partner feedback
- [ ] Update documentation
- [ ] Improve onboarding flow
- [ ] Add analytics/metrics

**Day 50: Go-Live**
- [ ] All features enabled in production
- [ ] Monitor error rates
- [ ] Monitor API usage
- [ ] Monitor customer satisfaction

**Success Metric:** First 3 IC partners signed, 10+ test referrals created via API

---

## 📊 FEATURE ROLLOUT CHECKLIST

### Environmental Screening
- [ ] Partner contract signed
- [ ] API key received
- [ ] Sandbox testing complete
- [ ] Frontend integrated
- [ ] Database schema updated
- [ ] Sample report updated
- [ ] QA testing: 5+ addresses tested
- [ ] Production deployment
- [ ] Monitoring: API errors, latency

### Premium Tier
- [ ] Backend: tier selector implemented
- [ ] Frontend: tier selection UI built
- [ ] IC consultant call scheduling integrated
- [ ] Database schema updated
- [ ] Stripe checkout updated (2 tier options)
- [ ] Sample report updated
- [ ] QA testing: full checkout flow tested
- [ ] Production deployment
- [ ] Monitoring: conversion rate

### IC Partner API
- [ ] All 5 endpoints implemented
- [ ] Authentication system working
- [ ] Rate limiting configured
- [ ] Webhook system working
- [ ] API documentation complete
- [ ] Partner onboarding flow working
- [ ] API key generation automated
- [ ] QA testing: end-to-end partner flow
- [ ] Production deployment
- [ ] Monitoring: API uptime, error rates

### Utility Timelines
- [ ] Utility queue data table created
- [ ] FERC API scraper written
- [ ] Timeline calculation working
- [ ] Weekly update task scheduled
- [ ] Display on research memo
- [ ] QA testing: 10+ addresses
- [ ] Production deployment
- [ ] Monitoring: queue data freshness

### Bulk Discounts
- [ ] Pricing calculator updated
- [ ] Stripe checkout bulk session created
- [ ] Frontend UI built
- [ ] Commission tracking working
- [ ] QA testing: bulk order flow
- [ ] Production deployment
- [ ] Monitoring: bulk conversion rate

### Channel Model
- [ ] Partner onboarding page live
- [ ] API key generation automated
- [ ] Commission tracking system working
- [ ] Partner dashboard functional
- [ ] Partnership agreements drafted
- [ ] Marketing materials created
- [ ] First 3 partners signed
- [ ] Production deployment
- [ ] Monitoring: partner referrals, commissions

---

## 🎓 SUCCESS CRITERIA

### Environmental Screening
- ✅ 100% of reports include environmental data (if selected)
- ✅ Environmental section appears on sample report
- ✅ Zero API errors in first week
- ✅ Contractors/RE Devs say "this is valuable"

### Premium Tier
- ✅ 70%+ of 250+ MW prospects see the tier
- ✅ 50%+ of viewers select Premium (goal)
- ✅ IC consultant call successfully scheduled
- ✅ Premium tier captures 20%+ of Data Center segment

### IC Partner API
- ✅ 3+ IC firms sign up in first month
- ✅ Zero API authentication failures
- ✅ Webhooks deliver 99%+ of the time
- ✅ Partners create 10+ test referrals

### Utility Timelines
- ✅ Timelines match manual FERC data ±10%
- ✅ Queue data updates weekly (100% uptime)
- ✅ Contractors say "this matches what I know"
- ✅ No customer complaints about inaccuracy

### Bulk Discounts
- ✅ 50%+ of RE Developers choose bulk
- ✅ Average order size: 4+ reports
- ✅ Conversion rate: 30%+ of bulk viewers → purchase

### Channel Model
- ✅ 5+ IC firms signed within 6 weeks
- ✅ 50+ referrals created via API in Month 1
- ✅ Partner satisfaction: NPS +70+
- ✅ $70K+ monthly margin revenue

---

## ⚠️ RISKS TO WATCH

| Risk | Mitigation |
|------|-----------|
| Environmental API downtime | Use fallback data, set SLA requirements |
| Premium tier adoption flops | Have feedback loops, test with prospects early |
| IC Partner API complexity | Excellent docs + support, office hours |
| Utility data inaccuracy | Validate against FERC, continuous monitoring |
| Bulk discount cannibalization | Monitor: does bulk reduce standard sales? |
| Channel partner expectations mismatch | Clear contracts, monthly check-ins |

---

## 🎯 PRIORITY ORDERING

**MUST DO FIRST:**
1. ✅ Environmental screening (solves $730K gap)
2. ✅ Premium tier (captures 250+ MW segment)

**MUST DO SECOND:**
3. ✅ IC Partner API (channel unlock)
4. ✅ Utility timelines (contractor value)

**NICE TO HAVE:**
5. ✅ Bulk discounts (optimization)
6. ✅ Channel marketing push (scale)

**Don't delay environmental screening.** It's the difference between $1.4M and $2.9M revenue.

---

## 📞 IMPLEMENTATION SUPPORT

**Questions?**
- Environmental screening: Contact EcoAssess sales
- Premium tier: Review data center feedback
- API: Check OpenAPI spec in docs
- Utility data: Validate against FERC online
- Channel: Reach out to IC firms for requirements

**Go-live confidence:** 85% (environmental screening is the biggest unkn own, but partner integration is low-risk)
