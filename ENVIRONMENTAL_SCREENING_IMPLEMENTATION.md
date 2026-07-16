# Environmental Screening Implementation Guide

## Overview

The environmental screening feature uses **Firecrawl** (web search) + **Gemini Vision** (synthesis) to provide comprehensive environmental risk assessment for data center and construction sites.

**Key Benefits:**
- ✅ Reuses existing Firecrawl + Gemini clients
- ✅ No new external API integrations required
- ✅ 1-2 week implementation timeline
- ✅ $5-10K development cost
- ✅ Automatic inclusion in free trial memos
- ✅ Professional environmental analysis included in all reports

---

## Architecture

### Data Flow

```
User submits free trial
    ↓
Backend geocodes address
    ↓
Firecrawl searches 6 environmental databases:
  • USGS Wetlands
  • USFWS Endangered Species
  • FEMA Flood Zones
  • Local noise ordinances
  • EPA NEPA requirements
  • State-specific requirements
    ↓
Results parsed and formatted
    ↓
Gemini synthesizes into professional assessment
    ↓
Combined with research memo
    ↓
Sent to user via email
    ↓
(PREMIUM: Also displayed in dashboard PDF)
```

### Files Created

1. **`backend/environmental_screening.py`** - Main service class
2. **`backend/free_trial_handler.py`** (updated) - Integration into free trial flow
3. **`frontend/src/components/EnvironmentalScreeningDisplay.tsx`** - Display component

---

## Backend Implementation Details

### 1. EnvironmentalScreeningService

Located in `backend/environmental_screening.py`

**Main Method:**
```python
async def get_environmental_screening(
    address: str,
    city: str,
    state: str,
    latitude: float,
    longitude: float,
    project_type: str = "data-center"
) -> Dict
```

**Returns:**
```json
{
  "address": "123 Main St, Austin, TX",
  "risk_level": "MEDIUM",
  "screening_data": {
    "wetlands": { "found": true, "count": 2, "risk_level": "MEDIUM", ... },
    "endangered_species": { "found": true, "count": 1, "risk_level": "HIGH", ... },
    "flood_zones": { "in_flood_zone": false, "zone_type": "X (Low risk)", ... },
    "noise_zones": { "ordinances_found": 3, "risk_level": "MEDIUM", ... },
    "nepa": { "required": true, "risk_level": "MEDIUM", ... },
    "state_requirements": { "found": true, "count": 5, "risk_level": "MEDIUM", ... }
  },
  "synthesis": "Professional environmental assessment text from Gemini...",
  "timestamp": "2026-07-15T18:30:00"
}
```

### 2. Integration into Free Trial Flow

**Modified:** `backend/free_trial_handler.py`

**New Functions:**
- `_run_environmental_screening()` - Executes screening
- `_combine_memo_with_environmental()` - Merges results with research memo

**Flow:**
```python
async def _run_research_and_email():
    # 1. Generate research memo
    research_memo = await _generate_research_memo(...)
    
    # 2. Run environmental screening (NEW)
    environmental_screening = await _run_environmental_screening(...)
    
    # 3. Combine and send
    combined_memo = _combine_memo_with_environmental(
        research_memo,
        environmental_screening
    )
    
    # 4. Email to user
    await email_service.send_research_memo(...)
```

### 3. Required Environment Variables

Add to `.env`:
```bash
GEMINI_API_KEY=your_gemini_api_key
# FIRECRAWL_API_KEY should already exist
```

### 4. Dependencies

Ensure `requirements.txt` includes:
```
google-generativeai>=0.3.0
firecrawl-py>=0.0.8
```

---

## Frontend Implementation Details

### 1. EnvironmentalScreeningDisplay Component

Located in `frontend/src/components/EnvironmentalScreeningDisplay.tsx`

**Props:**
```typescript
interface EnvironmentalScreeningDisplayProps {
  data: {
    address: string;
    risk_level: "HIGH" | "MEDIUM" | "LOW";
    synthesis: string;
    screening_data: ScreeningData;
  };
}
```

**Usage:**
```tsx
import { EnvironmentalScreeningDisplay } from '@/components/EnvironmentalScreeningDisplay';

<EnvironmentalScreeningDisplay data={screeningResult} />
```

**Features:**
- ✅ Executive summary from Gemini
- ✅ 6 category breakdowns with risk levels
- ✅ Color-coded risk indicators
- ✅ Recommendation text for each category
- ✅ Risk summary matrix
- ✅ Next steps guidance
- ✅ Responsive design
- ✅ Professional styling

### 2. Integration Points

**In free trial results page:**
```tsx
// After user runs free trial, show results
const [screeningData, setScreeningData] = useState(null);

useEffect(() => {
  const fetchResults = async () => {
    const response = await fetch('/api/free-trial-results?trial_id=' + trialId);
    const data = await response.json();
    setScreeningData(data.environmental_screening);
  };
  fetchResults();
}, [trialId]);

return screeningData ? (
  <EnvironmentalScreeningDisplay data={screeningData} />
) : (
  <div>Loading results...</div>
);
```

**In premium report PDF (future):**
- Include full environmental screening section
- Generate PDF from component
- Include all risk details and recommendations

---

## Deployment Checklist

### Pre-Deployment

- [ ] Add `GEMINI_API_KEY` to backend `.env`
- [ ] Verify Firecrawl client is properly initialized in `research_memo.py`
- [ ] Install dependencies: `pip install -r requirements.txt`
- [ ] Test environmental screening locally with sample address

### Deployment Steps

1. **Push code:**
   ```bash
   git add backend/environmental_screening.py
   git add backend/free_trial_handler.py
   git add frontend/src/components/EnvironmentalScreeningDisplay.tsx
   git commit -m "feat: add environmental screening to free trial"
   git push
   ```

2. **Update backend `.env` on Render:**
   - Log into Render dashboard
   - Go to backend service
   - Add `GEMINI_API_KEY` environment variable

3. **Deploy Render:**
   - Redeploy backend service to pick up new files

4. **Deploy Vercel:**
   - Frontend will auto-deploy from GitHub push

5. **Test:**
   - Submit free trial request
   - Check email for research memo with environmental screening
   - Verify risk levels and recommendations are present

### Post-Deployment Monitoring

- Monitor Firecrawl API usage (should not exceed quota)
- Monitor Gemini API usage and costs
- Track error logs for failed screenings
- Collect user feedback on environmental findings

---

## Search Queries Used

Environmental screening uses these Firecrawl search patterns:

1. **Wetlands:** `"wetlands near {address} {state} USGS wetlands map"`
2. **Species:** `"endangered species threatened {address} {state} USFWS habitat"`
3. **Flood Zones:** `"FEMA flood zone {address} flood map zone A zone X"`
4. **Noise:** `"{city} {state} noise ordinance code decibel limits industrial zoning"`
5. **NEPA:** `"NEPA environmental assessment {state} federal project requirements"`
6. **State:** `"{state} environmental requirements {project_type} project regulations"`

All searches run in parallel for speed (~2-5 seconds total).

---

## Cost Analysis

### API Costs

**Firecrawl:**
- ~6 searches per free trial = 0.06 credits per trial
- At $5/1000 credits = $0.0003 per trial
- Negligible cost

**Gemini:**
- 1 synthesis prompt per trial = ~50 tokens input
- At $0.075/1M input tokens = $0.0000037 per trial
- Negligible cost

**Total per trial:** < $0.001 (essentially free)

### Development Timeline

- Day 1-2: Environmental screening service (8 hours)
- Day 3: Frontend component (4 hours)
- Day 4: Integration & testing (4 hours)
- Day 5: Deployment & monitoring (2 hours)

**Total:** ~18 hours = $5-10K at standard rates

---

## Future Enhancements

### Phase 2: Premium Features

1. **Premium PDF Report**
   - Include full environmental screening in downloadable PDF
   - Add detailed maps and regulatory links
   - Generate executive summary for executives

2. **Environmental Consulting Partnership**
   - Offer premium environmental consultant review
   - Referral program with consultants
   - Upsell from free analysis to professional review

3. **Real-Time Environmental Alerts**
   - Monitor sites for regulatory changes
   - Email alerts when new issues detected
   - Annual report regeneration for monitoring tier

4. **Integration with State Databases**
   - Direct API connections for more accurate data
   - Real-time permit tracking
   - Automated compliance checklists

### Phase 3: Enterprise Features

1. **Bulk Environmental Analysis**
   - Analyze 100+ sites at once
   - Portfolio-level environmental risk dashboard
   - Trend analysis and benchmarking

2. **Environmental Liability Assessment**
   - Calculate potential remediation costs
   - Estimate insurance premiums
   - Risk-adjusted financial modeling

3. **Automated Permit Prep**
   - Environmental impact statements (auto-generated)
   - Mitigation measure recommendations
   - Permit application sections pre-filled

---

## Testing Recommendations

### Manual Testing

**Test Case 1: Low-Risk Site**
```
Address: Rural farm, no water bodies
Expected: LOW risk overall, minimal findings
```

**Test Case 2: High-Risk Site**
```
Address: Urban wetlands near endangered species habitat
Expected: HIGH risk, multiple findings, consultants recommended
```

**Test Case 3: Flood Zone Site**
```
Address: Near major river in 100-year flood zone
Expected: HIGH risk, flood insurance required
```

### Automated Testing

```python
# In tests/test_environmental_screening.py

@pytest.mark.asyncio
async def test_environmental_screening_service():
    service = EnvironmentalScreeningService(
        firecrawl_client=mock_firecrawl,
        gemini_client=mock_gemini
    )
    
    result = await service.get_environmental_screening(
        address="123 Test St",
        city="Austin",
        state="TX",
        latitude=30.2672,
        longitude=-97.7431,
        project_type="data-center"
    )
    
    assert result["risk_level"] in ["HIGH", "MEDIUM", "LOW"]
    assert "synthesis" in result
    assert "screening_data" in result
```

---

## Support & Troubleshooting

### Common Issues

**Issue:** "GEMINI_API_KEY not configured"
- **Fix:** Add `GEMINI_API_KEY` to Render environment variables

**Issue:** Firecrawl search returns no results
- **Fix:** Verify Firecrawl client is initialized and has API quota
- **Fallback:** Service returns empty findings gracefully

**Issue:** Gemini synthesis takes too long
- **Fix:** Use faster model (`gemini-1.5-flash` instead of `gemini-1.5-pro`)
- **Timeout:** Set 10-second timeout on Gemini requests

**Issue:** Email not received with environmental screening
- **Fix:** Check email service logs, verify SMTP credentials

---

## Success Metrics

Track these KPIs to measure environmental screening impact:

1. **Adoption:** % of free trials that receive environmental screening
2. **Quality:** User feedback on accuracy and usefulness of findings
3. **Conversion:** % of free trial → paid upgrade due to environmental concerns
4. **Premium Tier:** % of environmental findings that trigger premium tier purchase
5. **Support:** % reduction in support emails about environmental compliance

---

## Questions?

Refer to:
- `COMPLETE_PREMIUM_FEATURES_IMPLEMENTATION.md` for code details
- `backend/environmental_screening.py` for service implementation
- `frontend/src/components/EnvironmentalScreeningDisplay.tsx` for UI component

For Gemini API issues: See [Google AI documentation](https://ai.google.dev/)
For Firecrawl issues: See [Firecrawl documentation](https://firecrawl.dev/)
