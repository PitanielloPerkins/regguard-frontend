# RegGuard Queue - Quick Start Guide

## 60-Second Setup

```bash
# 1. Navigate to project
cd /Users/tony_pitaniello/Desktop/reg-guard\ FINAL

# 2. Start both servers (from repo root)
./start.sh

# 3. Open browser
# Frontend: http://localhost:5173/queue
# Backend: http://localhost:8000/docs
```

## Testing Checklist

### Landing Page Test (/queue)
- [ ] Hero section renders with correct value prop
- [ ] "How It Works" shows 3 steps
- [ ] "Supported Forms" shows 4 form types
- [ ] Pricing grid shows Free/Pro/Enterprise
- [ ] FAQ expands/collapses
- [ ] "Get Started" buttons are clickable
- [ ] Mobile responsive (resize browser)

### Upload Form Test (/queue/upload)
- [ ] Form type radio buttons work
- [ ] Text input mode allows paste
- [ ] File upload mode accepts files
- [ ] "Auto-Fill Form" button triggers API call
- [ ] Loading state shows while processing
- [ ] Result displays with accuracy score
- [ ] PDF download button works

### Auto-Fill Test (with sample data)
```
Paste this into the text area:

Project: Acme Solar Farm Phase 1
Company: Acme Solar LLC
Location: Denver, Colorado  
County: Denver County
State: Colorado
Facility Type: Solar PV
Capacity: 10 MW
Contact Email: contact@acmesolar.com
Contact Phone: 555-123-4567
Interconnection Point: Denver West Substation
Expected Commercial Operation Date: 2026-12-31
RTO: WECC
```

Then:
- [ ] Click "Auto-Fill Form" button
- [ ] Wait for processing (should be <5 seconds)
- [ ] See accuracy report with confidence score
- [ ] See filled form preview
- [ ] Download PDF
- [ ] Open PDF and verify fields are filled correctly
- [ ] Check footer shows "Auto-filled by RegGuard Queue"

### API Test (Backend /docs)
1. Visit `http://localhost:8000/docs`
2. Find `/queue/auto-fill` endpoint
3. Try it out with JSON
4. [ ] Should get 200 response
5. [ ] Response includes `filled_form`, `accuracy_report`, `pdf_url`

---

## Success Metrics

✅ **All tests pass when:**
1. Landing page renders perfectly (no console errors)
2. Upload form accepts text and file input
3. Auto-fill API returns 200 with filled form data
4. Accuracy report shows >80% confidence
5. PDF downloads and opens correctly
6. No 404 or 500 errors in backend logs

---

## Next Steps After Testing

1. **Fix any bugs** - Make notes of issues encountered
2. **Share with friends** - Show 5-10 renewable energy devs, get feedback
3. **Iterate** - Improve form field detection based on feedback
4. **Start Phase 2** - Multi-RTO support (PJM, MISO, ERCOT)
5. **Plan launch** - Month 3 public launch target
