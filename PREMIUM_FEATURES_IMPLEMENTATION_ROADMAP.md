# 🏗️ REGGUARD PREMIUM FEATURE ROADMAP
## Environmental Screening + Premium Tier + API + Channel Model

**Status:** Implementation Plan  
**Timeline:** 8-12 weeks to MVP  
**Cost Impact:** Low (mostly integrations + UI)  
**Revenue Impact:** +$730K-1.2M Year 1 potential

---

## 📋 EXECUTIVE SUMMARY

### What We're Building

1. **Environmental Screening Layer** — Solve the $730K gap
2. **Premium Tier ($25K)** — Capture data center segment
3. **IC Partner API** — Enable white-label integration
4. **Utility-Specific Timelines** — Contractor value-add
5. **Bulk Discounts** — RE Developer pricing
6. **Channel Model** — IC Partner resale structure

### Why It Matters

- Environmental screening: **+$730K** unlocks RE Dev/Data Center market
- Premium tier: **+$250K** from data centers at higher price point
- API integration: **+$150K** from IC partner white-label
- Bulk/utility/channel: **+$70K** incremental optimization

**Total potential: +$1.2M Year 1 revenue (above base $2.05M)**

---

## 🌍 PART 1: ENVIRONMENTAL SCREENING IMPLEMENTATION

### Architecture Decision: Build vs. Partner vs. Hybrid

#### Option 1: Build Internally ❌
- Pro: Full control, no sharing revenue
- Con: 6-8 weeks, requires domain expertise, ongoing maintenance
- Cost: $40K-60K developer time
- **Verdict: Not recommended**

#### Option 2: Partner Only ✅ (Recommended)
- Partner: EcoAssess, EnviroMapper, or similar
- Model: API integration + referral revenue share
- Pro: Fast (1-2 weeks), no maintenance, credible source
- Con: Smaller margin (10-20%), some customer friction
- Cost: API integration only ($5K-10K)
- **Verdict: BEST for launch speed**

#### Option 3: Hybrid (Later) 🎯
- Start with partner (Week 1-2)
- Later build proprietary layer (Q3)
- Combine data sources for differentiation
- **Verdict: Phased approach**

---

### Implementation Plan: Partner Model (EcoAssess)

#### Week 1: Partnership & API Setup

**Step 1: Contract with EcoAssess**
- Negotiate terms: $2-5 per report referral OR 10-15% revenue share
- Get API documentation
- Set up sandbox environment

**Step 2: Add to Product**
```
Frontend Change:
└─ /free-trial & /order pages
   ├─ Add checkbox: "Include environmental screening?"
   ├─ +$3,000 to order (or included in premium tier)
   └─ If selected → call EcoAssess API after site is geocoded

Backend Change:
└─ Create `/environmental-screening` endpoint
   ├─ Takes: address, project_type
   ├─ Calls: EcoAssess API
   ├─ Returns: wetlands risk, endangered species, noise zones
   ├─ Stores: in Supabase (environmental_screening table)
   └─ Logs: API cost tracking

Database Change:
└─ Add to free_trials + orders tables:
   ├─ environmental_screening_requested (boolean)
   ├─ environmental_screening_cost (integer)
   └─ environmental_data (JSONB with results)
```

---

### Frontend UI: Environmental Screening

#### On /free-trial Form
```
Current:
├─ Address
├─ Project Type
├─ Email
└─ [Get Free Research Memo]

Updated:
├─ Address
├─ Project Type
├─ Email
├─ ☐ Include environmental screening? (+$3K)
│   └─ "Adds: wetlands, endangered species, noise zone analysis"
└─ [Get Free Research Memo]
```

#### On /order Page (Premium Tier)
```
Current:
├─ Standard Package: $15K
│  ├─ Research memo (PDF)
│  ├─ Punch list (PDF)
│  └─ Permit package (PDF)

Updated:
├─ Standard Package: $15K
│  ├─ Research memo (PDF)
│  ├─ Punch list (PDF)
│  └─ Permit package (PDF)
│
├─ Premium Tier Options:
│  ├─ Add Environmental Screening: +$3K
│  │  └─ Wetlands, endangered species, noise zones, NEPA risks
│  │
│  └─ Data Center Premium (250+ MW): +$10K
│     ├─ All of above
│     ├─ IC consultant prep call (30 min)
│     ├─ Utility-specific timelines
│     └─ Custom network upgrade estimate
```

#### Sample Report Page Updated
```
Add environmental section:

ENVIRONMENTAL FINDINGS

Wetlands Risk:        ✓ Low (no mapped wetlands within 5 miles)
Endangered Species:   ⚠ Medium (northern long-eared bat habitat)
Noise Zones:          ✓ Low (industrial zoning allows)
NEPA Screening:       ⚠ Medium (may require Environmental Assessment)
Archaeology:          ✓ Low (historic site review complete)

Recommendation: 
Proceed with caution on endangered species; 
recommend mitigation planning before Phase 1.
```

---

### Backend Implementation: EcoAssess Integration

```python
# backend/environmental_screening.py

import os
import httpx
import logging
from typing import Optional, Dict

logger = logging.getLogger(__name__)

ECOASSESS_API_KEY = os.getenv("ECOASSESS_API_KEY")
ECOASSESS_API_URL = "https://api.ecoassess.io/v1/screening"

class EnvironmentalScreeningService:
    """Integrate with EcoAssess API for environmental data"""
    
    @staticmethod
    async def get_screening(
        address: str,
        latitude: float,
        longitude: float,
        project_type: str = "data-center"
    ) -> Optional[Dict]:
        """
        Call EcoAssess API to get environmental screening data
        
        Args:
            address: Full address (e.g., "123 Main St, Austin, TX")
            latitude: Site latitude
            longitude: Site longitude
            project_type: Type of project for context
        
        Returns:
            Dict with screening results or None if failed
        """
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    ECOASSESS_API_URL,
                    headers={
                        "Authorization": f"Bearer {ECOASSESS_API_KEY}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "address": address,
                        "latitude": latitude,
                        "longitude": longitude,
                        "project_type": project_type,
                        "analysis_type": "full_screening"
                    },
                    timeout=30.0
                )
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"EcoAssess screening: {address} - Success")
                return {
                    "wetlands_risk": data.get("wetlands_risk", "low"),
                    "endangered_species_risk": data.get("endangered_species", "low"),
                    "noise_zone_risk": data.get("noise_zones", "low"),
                    "nepa_required": data.get("nepa_assessment_required", False),
                    "archaeology_risk": data.get("archaeology_risk", "low"),
                    "recommendation": data.get("recommendation", ""),
                    "api_cost": 2.50,  # Track cost
                }
            else:
                logger.error(f"EcoAssess error: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Environmental screening failed: {e}")
            return None

# Integration in free_trial_handler.py

async def _run_research_and_email(trial_id, email, address, project_type):
    """Updated to include environmental screening"""
    
    # Step 1: Geocode
    profile = geocode_profile_from_address(address)
    
    # Step 2: Research generation
    research_memo = await _generate_research_memo(address, project_type)
    
    # Step 3: ENVIRONMENTAL SCREENING (NEW)
    env_screening = await EnvironmentalScreeningService.get_screening(
        address=address,
        latitude=profile.latitude,
        longitude=profile.longitude,
        project_type=project_type
    )
    
    # Step 4: Format memo with environmental findings
    memo = _format_memo_plaintext(
        research_digest=research_memo,
        address=address,
        project_type=project_type,
        environmental_data=env_screening  # NEW
    )
    
    # Step 5: Send email
    await email_service.send_research_memo(
        to_email=email,
        address=address,
        research_memo=memo,
        environmental_data=env_screening  # NEW
    )
```

---

## 💎 PART 2: PREMIUM TIER FOR 250+ MW DATA CENTERS

### The Opportunity

**Current:** Standard $15K package for all projects  
**Gap:** 250+ MW data centers feel "templated", want customization  
**Solution:** Premium tier at $25K with IC consultant prep

### Premium Tier Spec

```
STANDARD TIER ($15K):
├─ Research memo (PDF)
├─ Punch list (PDF)
├─ Permit package (PDF)
└─ Delivery: 24 hours

PREMIUM TIER - DATA CENTER ($25K):
├─ Everything in Standard +
├─ IC Consultant Prep Call (30 min)
│  ├─ Discuss findings with IC firm
│  ├─ Prepare Phase 1 scope
│  └─ Confirm timeline expectations
├─ Custom Utility Analysis
│  ├─ RTO-specific queue data
│  ├─ Network upgrade cost breakdown
│  └─ Precedent project comparison
├─ Network Upgrade Analysis
│  ├─ Transmission vs. distribution options
│  ├─ Estimated upgrade scope & timeline
│  └─ Precedent upgrade costs from region
└─ Delivery: 24 hours (or 48 hours for IC call prep)
```

### Database Schema Change

```sql
-- Add to orders table
ALTER TABLE orders ADD COLUMN (
    tier TEXT DEFAULT 'standard', -- 'standard', 'premium'
    is_data_center_250plus BOOLEAN DEFAULT FALSE,
    ic_consultant_prep_call_scheduled BOOLEAN DEFAULT FALSE,
    ic_consultant_call_date TIMESTAMP,
    environmental_screening_included BOOLEAN DEFAULT FALSE,
    custom_utility_analysis BOOLEAN DEFAULT FALSE,
    network_upgrade_analysis BOOLEAN DEFAULT FALSE
);
```

### Frontend: Premium Tier Selector

```
┌─────────────────────────────────────────────────────────┐
│ What's your project size?                              │
│                                                        │
│ ○ Under 100 MW  → Standard Tier ($15K)               │
│ ○ 100-250 MW    → Standard Tier ($15K)               │
│ ○ 250+ MW       → Premium Tier ($25K) [RECOMMENDED] │
│                                                        │
│ Premium Tier includes:                                 │
│ ✓ IC consultant prep call (30 min)                   │
│ ✓ Custom RTO queue analysis                          │
│ ✓ Network upgrade cost breakdown                     │
│ ✓ Precedent project comparison                       │
│ ✓ + All standard features                            │
└─────────────────────────────────────────────────────────┘
```

### Backend: Premium Tier Processing

```python
# backend/premium_tier_handler.py

from datetime import datetime, timedelta

async def process_premium_tier_order(order_id: str, data: Dict):
    """
    Handle premium tier orders with IC consultant prep
    """
    
    # Step 1: Run standard research
    research = await standard_research(data)
    
    # Step 2: Generate custom utility analysis
    custom_utility = await generate_custom_utility_analysis(
        address=data['address'],
        mw_size=data['mw_size'],
        rto=data['rto']
    )
    
    # Step 3: Network upgrade analysis
    network_analysis = await estimate_network_upgrades(
        address=data['address'],
        mw_size=data['mw_size']
    )
    
    # Step 4: Schedule IC consultant call
    ic_call = await schedule_ic_consultant_call(
        order_id=order_id,
        customer_email=data['email'],
        preferred_date=data.get('preferred_call_date')
    )
    
    # Step 5: Combine into premium report
    premium_report = combine_premium_report(
        standard=research,
        custom_utility=custom_utility,
        network_analysis=network_analysis,
        ic_call_info=ic_call
    )
    
    return premium_report
```

---

## 🔌 PART 3: API INTEGRATION FOR IC PARTNERS

### Why IC Partners Need API Access

**Current Flow:**
1. IC firm recommends RegGuard to client
2. Client buys RegGuard report ($15K)
3. Client gives report to IC firm
4. IC firm manually extracts data into their report

**New Flow (with API):**
1. IC firm recommends RegGuard to client
2. Client buys RegGuard report ($15K)
3. IC firm pulls data directly via API
4. IC firm auto-populates their report (white-label)
5. IC firm resells as "EnergyLink + RegGuard" product

### API Spec

```
BASE URL: https://api.regguardagent.com/v1/ic-partner

AUTHENTICATION:
├─ API Key (for IC partner firms)
├─ Rate limit: 1000 req/day (per firm)
└─ Cost: Included in $8K wholesale pricing

ENDPOINTS:

1. POST /research/{trial_id}
   ├─ Get full research data for a completed trial
   ├─ Headers: X-API-Key, X-Partner-ID
   ├─ Response: {research_memo, punch_list, environmental_data}
   └─ Use: IC firm pulls completed research

2. GET /research/{trial_id}/pdf
   ├─ Get pre-generated PDFs
   ├─ Response: {memo_url, punch_list_url, permit_url}
   └─ Use: IC firm embeds in their white-label report

3. POST /research/create
   ├─ Create new research order from IC firm
   ├─ Body: {address, project_type, customer_email}
   ├─ Response: {research_id, status, estimated_completion}
   └─ Use: IC firm creates on behalf of customer (white-label)

4. GET /research/{research_id}/status
   ├─ Check research completion status
   ├─ Response: {status, progress%, estimated_time_remaining}
   └─ Use: IC firm polls for completion

5. POST /webhook/configure
   ├─ Set webhook for research completion
   ├─ Body: {webhook_url, events: ["research.completed", "research.failed"]}
   └─ Use: IC firm gets notified when research is ready
```

### Backend: API Implementation

```python
# backend/ic_partner_api.py

from fastapi import APIRouter, Header, HTTPException, Depends
from fastapi.responses import JSONResponse
import hmac
import hashlib

router = APIRouter(prefix="/v1/ic-partner")

# Verify API key
async def verify_ic_api_key(x_api_key: str = Header(...)) -> str:
    """Verify IC partner API key"""
    partner_id = await db.query(
        "SELECT partner_id FROM ic_partners WHERE api_key = ? AND is_active = true",
        (x_api_key,)
    )
    if not partner_id:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return partner_id

@router.post("/research/create")
async def create_research_via_api(
    request: CreateResearchRequest,
    partner_id: str = Depends(verify_ic_api_key)
):
    """IC partner creates research order for customer"""
    
    # Create order
    order = await db.create_order(
        email=request.customer_email,
        address=request.address,
        project_type=request.project_type,
        ic_partner_id=partner_id,
        white_label=True
    )
    
    # Track for billing (wholesale rate)
    await db.log_api_usage(
        partner_id=partner_id,
        endpoint="create_research",
        cost=8000  # $8K wholesale
    )
    
    # Queue research
    await queue_research_task(order.id)
    
    return {
        "research_id": order.id,
        "status": "queued",
        "estimated_completion": datetime.now() + timedelta(hours=24)
    }

@router.get("/research/{research_id}/pdf")
async def get_research_pdfs(
    research_id: str,
    partner_id: str = Depends(verify_ic_api_key)
):
    """Get PDF URLs for white-label embedding"""
    
    # Verify partner owns this research
    order = await db.get_order(research_id)
    if order.ic_partner_id != partner_id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    return {
        "memo_pdf": f"https://cdn.regguard.com/reports/{research_id}/memo.pdf",
        "punch_list_pdf": f"https://cdn.regguard.com/reports/{research_id}/punch_list.pdf",
        "permit_package_pdf": f"https://cdn.regguard.com/reports/{research_id}/permits.pdf",
        "embed_code": f'<iframe src="https://reports.regguard.com/{research_id}"></iframe>'
    }

@router.post("/webhook/configure")
async def configure_webhook(
    request: WebhookConfig,
    partner_id: str = Depends(verify_ic_api_key)
):
    """Configure webhook for research completion"""
    
    # Validate webhook URL
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                request.webhook_url,
                json={"test": True},
                timeout=5.0
            )
        except:
            raise HTTPException(status_code=400, detail="Webhook URL not reachable")
    
    # Store webhook config
    await db.save_webhook_config(
        partner_id=partner_id,
        webhook_url=request.webhook_url,
        events=request.events
    )
    
    return {"status": "configured"}

# Webhook firing
async def fire_research_completion_webhook(order_id: str):
    """Fire webhook when research completes"""
    
    order = await db.get_order(order_id)
    webhook_config = await db.get_webhook_config(order.ic_partner_id)
    
    if not webhook_config:
        return
    
    payload = {
        "event": "research.completed",
        "research_id": order.id,
        "timestamp": datetime.now().isoformat(),
        "data": {
            "address": order.address,
            "project_type": order.project_type,
            "pdf_urls": {...}
        }
    }
    
    # Sign webhook for security
    signature = hmac.new(
        webhook_config.secret.encode(),
        json.dumps(payload).encode(),
        hashlib.sha256
    ).hexdigest()
    
    async with httpx.AsyncClient() as client:
        await client.post(
            webhook_config.webhook_url,
            json=payload,
            headers={"X-RegGuard-Signature": signature}
        )
```

### Frontend: API Documentation

Create `/docs/api` page with:
- Interactive API explorer (Swagger UI)
- Code examples (Python, JavaScript, cURL)
- Authentication guide
- Webhook setup instructions
- Rate limit info

---

## ⏱️ PART 4: UTILITY-SPECIFIC TIMELINES

### What Contractors Need

**Current:** Generic timeline (12-18 months Phase 1)  
**Gap:** This doesn't account for actual utility queue positions  
**Solution:** Pull RTO/utility queue data + show real timelines

### Implementation

```
Database:
└─ Create utility_queue_data table
   ├─ rto (ERCOT, SPP, PJM, etc.)
   ├─ utility (specific utility name)
   ├─ queue_position (current queue depth)
   ├─ avg_phase1_days (average wait time)
   ├─ avg_phase2_days (average wait time)
   └─ last_updated (timestamp)

Backend:
└─ Create /utility-timelines endpoint
   ├─ Input: address, rto, utility
   ├─ Output: realistic timeline based on queue data
   └─ Update queue data weekly via FERC API

Frontend:
└─ Show on research memo
   ├─ "ERCOT Queue: 47 projects ahead"
   ├─ "Average Phase 1 wait: 12-18 months (based on current queue)"
   └─ "Your estimated timeline: Jan 2028"
```

### Code Implementation

```python
# backend/utility_timelines.py

from datetime import datetime, timedelta

class UtilityTimelineService:
    
    @staticmethod
    async def get_realistic_timeline(
        rto: str,
        utility: str,
        project_type: str = "solar"
    ) -> Dict:
        """Get realistic interconnection timeline"""
        
        # Get current queue data
        queue_data = await db.query(
            "SELECT * FROM utility_queue_data WHERE rto = ? AND utility = ?",
            (rto, utility)
        )
        
        if not queue_data:
            # Fallback to generic
            return _get_generic_timeline(rto)
        
        # Calculate based on queue position
        queue_position = queue_data.queue_position
        projects_ahead = queue_position
        
        # Average time per project in queue
        avg_days_per_project = 7  # Conservative estimate
        
        # Phase 1 timeline
        phase1_estimated = queue_data.avg_phase1_days + (projects_ahead * avg_days_per_project)
        phase1_date = datetime.now() + timedelta(days=phase1_estimated)
        
        # Phase 2 timeline (typically 30-40% longer)
        phase2_days = int(queue_data.avg_phase2_days * 1.3)
        phase2_date = phase1_date + timedelta(days=phase2_days)
        
        return {
            "phase1": {
                "months": phase1_estimated // 30,
                "days": phase1_estimated,
                "estimated_date": phase1_date.isoformat(),
                "confidence": "high" if queue_data.last_updated < (datetime.now() - timedelta(days=7)) else "medium"
            },
            "phase2": {
                "months": phase2_days // 30,
                "days": phase2_days,
                "estimated_date": phase2_date.isoformat()
            },
            "total_months": (phase1_estimated + phase2_days) // 30,
            "queue_position": projects_ahead,
            "data_source": f"{rto}/{utility}",
            "last_updated": queue_data.last_updated.isoformat()
        }
    
    @staticmethod
    async def update_queue_data():
        """Weekly task to update queue data from FERC API"""
        
        # Call FERC API for each RTO
        rtcs = ["ERCOT", "SPP", "PJM", "MISO"]
        
        for rto in rtcs:
            queue_info = await _fetch_ferc_queue_data(rto)
            
            for utility, data in queue_info.items():
                await db.upsert_queue_data(
                    rto=rto,
                    utility=utility,
                    queue_position=data['queue_depth'],
                    avg_phase1_days=data['avg_phase1_wait_days'],
                    avg_phase2_days=data['avg_phase2_wait_days'],
                    last_updated=datetime.now()
                )

# Frontend display
def format_timeline_display(timeline: Dict) -> str:
    return f"""
    INTERCONNECTION TIMELINE (based on {timeline['queue_position']} projects ahead)
    
    Phase 1 Feasibility: {timeline['phase1']['months']} months
                         (~{timeline['phase1']['estimated_date']})
    
    Phase 2 Impact Study: {timeline['phase2']['months']} months
                          (~{timeline['phase2']['estimated_date']})
    
    Total Timeline: {timeline['total_months']} months to grid connection
    
    Data: Updated {timeline['last_updated']} from {timeline['data_source']}
    """
```

---

## 💲 PART 5: BULK DISCOUNTS FOR RE DEVELOPERS

### Pricing Structure

```
STANDARD PRICING:
├─ 1 report: $15,000

BULK PRICING:
├─ 2-4 reports: $12,000 each (-20%)
├─ 5-9 reports: $10,000 each (-33%)
├─ 10+ reports: $9,000 each (-40%)
│  └─ Annual contract available
│
ENTERPRISE:
└─ Unlimited: $60,000/year
   └─ Volume override: $50,000/year if 20+ reports/year
```

### Implementation

```sql
-- Add pricing tier to orders
ALTER TABLE orders ADD COLUMN (
    bulk_discount_applied BOOLEAN DEFAULT FALSE,
    bulk_discount_percentage INTEGER DEFAULT 0,
    bulk_order_group_id VARCHAR(255)
);

-- Track bulk orders
CREATE TABLE bulk_orders (
    id VARCHAR(255) PRIMARY KEY,
    customer_id VARCHAR(255),
    order_ids TEXT[] (array of order IDs),
    total_reports INT,
    discount_percentage INT,
    total_cost INTEGER,
    created_at TIMESTAMP
);
```

### Frontend: Bulk Order Interface

```
┌─────────────────────────────────────────────────────┐
│ How many reports do you need?                       │
│                                                    │
│ Enter quantity: [5]                               │
│                                                    │
│ Price breakdown:                                   │
│ ├─ 5 reports × $12,000 = $60,000                 │
│ ├─ You save: $15,000 (20% discount!)             │
│ └─ Final: $60,000                                 │
│                                                    │
│ [Proceed to Checkout]                            │
│                                                    │
│ Bulk licenses valid for 6 months                  │
│ Unused reports expire after 12 months             │
└─────────────────────────────────────────────────────┘
```

### Backend: Bulk Order Processing

```python
@app.post("/orders/bulk-create")
async def create_bulk_order(request: BulkOrderRequest):
    """Create multiple reports with bulk discount"""
    
    quantity = request.quantity
    
    # Calculate discount
    if 2 <= quantity <= 4:
        discount = 0.20
        unit_price = 12000
    elif 5 <= quantity <= 9:
        discount = 0.33
        unit_price = 10000
    elif quantity >= 10:
        discount = 0.40
        unit_price = 9000
    else:
        unit_price = 15000
        discount = 0
    
    total_cost = quantity * unit_price
    
    # Create bulk order group
    bulk_group_id = str(uuid.uuid4())
    
    # Create individual orders
    order_ids = []
    for i in range(quantity):
        order = {
            "customer_email": request.customer_email,
            "address": request.addresses[i],
            "project_type": request.project_type,
            "bulk_order_group_id": bulk_group_id,
            "discount_percentage": int(discount * 100),
            "amount_cents": unit_price * 100
        }
        order_id = await db.create_order(order)
        order_ids.append(order_id)
    
    # Log bulk purchase
    await db.create_bulk_order({
        "id": bulk_group_id,
        "customer_id": request.customer_id,
        "order_ids": order_ids,
        "total_reports": quantity,
        "discount_percentage": int(discount * 100),
        "total_cost": total_cost * 100
    })
    
    # Create Stripe checkout for entire bulk group
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        line_items=[{
            "price_data": {
                "currency": "usd",
                "product_data": {
                    "name": f"RegGuard Bulk Reports (×{quantity})",
                    "description": f"{quantity} site research packages"
                },
                "unit_amount": total_cost * 100
            },
            "quantity": 1
        }],
        mode="payment",
        success_url="https://app.regguardagent.com/orders/success",
        cancel_url="https://app.regguardagent.com/orders/cancel",
        metadata={
            "bulk_group_id": bulk_group_id,
            "order_count": quantity
        }
    )
    
    return {"session_id": session.id, "checkout_url": session.url}
```

---

## 🤝 PART 6: CHANNEL MODEL FOR IC PARTNERS

### The Model

```
IC Partner (e.g., EnergyLink)
├─ Signs up as channel partner
├─ Gets wholesale pricing: $8K per report
├─ Resells to customers at: $15K per report
├─ Keeps margin: $7K per report
└─ 10+ referrals/month = $70K+ revenue

RegGuard Benefits:
├─ $8K revenue per sale (vs. $15K direct)
├─ But: 50+ referrals/month from 5 IC firms
└─ Total: $400K+ from channel (vs. $200K from direct)
```

### Implementation

```python
# backend/channel_partner_model.py

class ChannelPartnerService:
    
    @staticmethod
    async def onboard_ic_partner(
        firm_name: str,
        contact_email: str,
        expected_referrals_per_month: int
    ) -> Dict:
        """Onboard IC consulting firm as channel partner"""
        
        # Create partner record
        partner = {
            "id": str(uuid.uuid4()),
            "firm_name": firm_name,
            "contact_email": contact_email,
            "api_key": generate_secure_api_key(),
            "wholesale_price": 8000,  # $8K wholesale
            "status": "active",
            "created_at": datetime.now(),
            "referral_quota": expected_referrals_per_month
        }
        
        await db.create_channel_partner(partner)
        
        # Generate onboarding package
        onboarding = {
            "api_key": partner['api_key'],
            "api_docs": "https://docs.regguard.com/api",
            "marketing_materials": [
                "https://marketing.regguard.com/ic-partner-flyer.pdf",
                "https://marketing.regguard.com/case-study.pdf"
            ],
            "commission_structure": {
                "per_report": 7000,  # $7K margin
                "bulk_reports_5plus": 6000,  # Reduced margin
                "monthly_volume_bonus": "10% extra margin if 20+ reports"
            }
        }
        
        return onboarding
    
    @staticmethod
    async def track_partner_referral(
        partner_id: str,
        order_id: str
    ) -> None:
        """Track referral and calculate commission"""
        
        order = await db.get_order(order_id)
        
        commission = {
            "partner_id": partner_id,
            "order_id": order_id,
            "customer_email": order.email,
            "amount": 7000,  # $7K per report
            "status": "pending",
            "payout_date": datetime.now() + timedelta(days=30)  # 30-day payout
        }
        
        await db.create_commission(commission)
    
    @staticmethod
    async def generate_partner_dashboard():
        """Dashboard for IC partners to track referrals/commissions"""
        
        return {
            "api_usage": {
                "reports_created": 15,
                "revenue_generated": 105000,  # 15 × $7K
                "payout_pending": 35000  # 5 reports × $7K
            },
            "monthly_stats": {
                "referrals_this_month": 5,
                "volume_bonus_eligible": True,
                "bonus_amount": 5000
            }
        }

# Database schema
CREATE TABLE channel_partners (
    id VARCHAR(255) PRIMARY KEY,
    firm_name VARCHAR(255),
    contact_email VARCHAR(255),
    api_key VARCHAR(255) UNIQUE,
    wholesale_price INTEGER DEFAULT 8000,
    status VARCHAR(50) DEFAULT 'active',
    referral_quota INTEGER,
    created_at TIMESTAMP,
    last_referral TIMESTAMP
);

CREATE TABLE partner_commissions (
    id VARCHAR(255) PRIMARY KEY,
    partner_id VARCHAR(255) REFERENCES channel_partners(id),
    order_id VARCHAR(255),
    customer_email VARCHAR(255),
    amount INTEGER,
    status VARCHAR(50) DEFAULT 'pending',  -- pending, paid, cancelled
    payout_date TIMESTAMP,
    created_at TIMESTAMP
);
```

### Marketing: Channel Partner Signup Page

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│ REGGUARD IC PARTNER PROGRAM                             │
│                                                          │
│ Join 50+ consulting firms earning $70K+/month          │
│                                                          │
│ HOW IT WORKS:                                           │
│ ┌────────────────────────────────────────────────────┐ │
│ │ 1. You recommend RegGuard to clients ($8K cost)   │ │
│ │ 2. Customers see quality, buy full package ($15K) │ │
│ │ 3. You keep $7K per customer                      │ │
│ │ 4. You still do Phase 1 studies ($40K per client) │ │
│ │ 5. Total value: $47K per customer engagement     │ │
│ └────────────────────────────────────────────────────┘ │
│                                                          │
│ BENEFITS:                                               │
│ ├─ White-label API integration                         │
│ ├─ Automatic referral tracking & payouts              │
│ ├─ Co-marketing & lead sharing                        │
│ ├─ Quarterly partner summit                           │
│ └─ Volume bonuses (10% extra margin if 20+ reports)  │
│                                                          │
│ [Sign Up as Channel Partner]                           │
│ [View Partner Agreement]                               │
│ [See IC Partner Success Stories]                       │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

---

## 📅 IMPLEMENTATION TIMELINE

### WEEK 1-2: Foundation
- [ ] Contract with EcoAssess (environmental screening)
- [ ] Set up environmental API integration
- [ ] Add environmental section to frontend

### WEEK 3-4: Premium Tier
- [ ] Build $25K premium tier option
- [ ] Add IC consultant call scheduling
- [ ] Test with 3 data center prospects

### WEEK 5-6: API & Channel
- [ ] Build IC Partner API (create, get, webhook)
- [ ] Create API documentation
- [ ] Set up partner onboarding flow

### WEEK 7-8: Utility Timelines & Bulk
- [ ] Implement utility queue data feeds
- [ ] Display utility-specific timelines
- [ ] Add bulk discount logic

### WEEK 9-10: Marketing & Sales
- [ ] Create channel partner landing page
- [ ] Draft partnership agreements
- [ ] Launch partner signup

### WEEK 11-12: Testing & Refinement
- [ ] End-to-end testing (all features)
- [ ] Partner UAT with 2-3 IC firms
- [ ] Performance optimization
- [ ] Launch

---

## 💰 REVENUE IMPACT SUMMARY

| Feature | Implementation Cost | Year 1 Revenue | ROI |
|---------|---|---|---|
| Environmental Screening | $10K | +$730K | 73x |
| Premium Tier (250+ MW) | $15K | +$250K | 17x |
| IC Partner API | $20K | +$150K | 7.5x |
| Utility Timelines | $5K | +$40K | 8x |
| Bulk Discounts | $3K | +$50K | 17x |
| Channel Model | $5K | +$70K (margin) | 14x |
| **TOTAL** | **$58K** | **+$1.29M** | **22x** |

---

## 🎯 CRITICAL SUCCESS FACTORS

1. **Environmental screening is the gate-keeper**
   - Solves $730K gap
   - Must launch first (Week 1-2)
   - Without this: RE Dev + Data Center TAM cut in half

2. **Premium tier must convert**
   - Unproven at $25K
   - Need real customer validation
   - Aim: 50%+ conversion of 250+ MW prospects

3. **IC Partner channel needs LOIs**
   - Don't assume auto-scale
   - Get written agreements before launch
   - Start with 3-5 pilot firms

4. **API quality matters**
   - Partners will integrate this into their business
   - Poor API = poor referrals
   - Invest in documentation + support

---

## 🚀 RECOMMENDED PRIORITY

### DO FIRST (Week 1-2):
1. ✅ Environmental screening (solves $730K gap)
2. ✅ Premium tier framework ($25K)

### DO SECOND (Week 3-6):
3. ✅ IC Partner API (channel unlock)
4. ✅ Utility timelines (contractor value)

### DO THIRD (Week 7+):
5. ✅ Bulk discounts (optimization)
6. ✅ Channel sales push (scale)

This sequence maximizes revenue impact while managing implementation complexity.
