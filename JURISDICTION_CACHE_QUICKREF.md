# Jurisdiction Cache Quick Reference

## File Structure

```
backend/
├── migrations/
│   └── 001_create_cached_jurisdictions.sql  # Migration script
├── jurisdiction_cache.py                     # Python helper functions
└── main.py                                   # FastAPI endpoints (imported in)
```

## Setup Checklist

- [ ] Run migration: `supabase migration up`
- [ ] Import `jurisdiction_cache` in `backend/main.py` ✓
- [ ] Add FastAPI endpoints to `main.py` ✓
- [ ] Test endpoints locally
- [ ] Deploy to production

## Key Files

### 1. Migration SQL
**File:** `backend/migrations/001_create_cached_jurisdictions.sql`

Creates:
- `cached_jurisdictions` table with UNIQUE zip_code constraint
- 5 indexes (zip_code, state, created_at, JSONB)
- 4 RLS policies (SELECT for all, INSERT/UPDATE/DELETE for admins)
- Table/column comments for documentation

### 2. Python Helper Module
**File:** `backend/jurisdiction_cache.py`

Functions:
- `lookup_cached_jurisdiction(zip_code)` → Dict | None
- `store_cached_jurisdiction(zip_code, city, state, payload)` → bool
- `get_cached_jurisdictions_by_state(state)` → List[Dict]
- `clear_cache_for_zip(zip_code)` → bool
- `get_cache_stats()` → Dict

### 3. FastAPI Endpoints
**File:** `backend/main.py` (added imports + 4 new routes)

Routes:
- `GET /cache/jurisdiction/{zip_code}` - Lookup single ZIP
- `GET /cache/jurisdictions/state/{state}` - Get all ZIPs in state
- `GET /cache/stats` - Cache statistics
- `POST /cache/jurisdiction` - Store/update (admin only)

## Usage Examples

### Backend Integration (in scraper.py or jurisdiction.py)

```python
from jurisdiction_cache import lookup_cached_jurisdiction, store_cached_jurisdiction

def get_jurisdiction_data(zip_code: str, scout_query: str):
    # 1. Check cache first
    cached = lookup_cached_jurisdiction(zip_code)
    if cached:
        logger.info(f"✓ Cache hit for {zip_code}")
        return cached["firecrawl_payload"]
    
    # 2. Cache miss - call Firecrawl
    logger.info(f"✗ Cache miss for {zip_code}, fetching from Firecrawl...")
    firecrawl_data = firecrawl_search(scout_query)
    
    # 3. Store in cache for next time
    store_cached_jurisdiction(
        zip_code="75074",
        city="Plano",
        state="TX",
        firecrawl_payload=firecrawl_data
    )
    
    return firecrawl_data
```

### Frontend/Admin Monitoring

```bash
# Check cache coverage
curl http://localhost:8000/cache/stats
# Returns: {total_entries, states_covered, oldest_entry_age_days}

# Get all cached Texas jurisdictions
curl http://localhost:8000/cache/jurisdictions/state/TX

# Lookup a single ZIP
curl http://localhost:8000/cache/jurisdiction/75074
```

## Database Queries

### Stats
```sql
SELECT 
  COUNT(*) as total_cached,
  COUNT(DISTINCT state) as states_covered,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM public.cached_jurisdictions;
```

### Invalidate Old Entries
```sql
DELETE FROM public.cached_jurisdictions
WHERE created_at < NOW() - INTERVAL '30 days';
```

### See Cache by State
```sql
SELECT state, COUNT(*) as count
FROM public.cached_jurisdictions
GROUP BY state
ORDER BY count DESC;
```

## Cost Savings Estimate

### Example: Plano, TX Market

| Scenario | Firecrawl Calls | Cost |
|----------|-----------------|------|
| Without cache | 5,000/month | $500 |
| With cache (after warmup) | 5/month | $0.50 |
| **Savings** | **99.9%** | **$499.50/month** |

Actual savings depend on:
- Geographic concentration of users
- Repeat searches in same ZIP codes
- Cache hit ratio
- Average searches per user

## RLS Security

| User Type | SELECT | INSERT | UPDATE | DELETE |
|-----------|--------|--------|--------|--------|
| Authenticated User | ✓ | ✗ | ✗ | ✗ |
| Admin User | ✓ | ✓ | ✓ | ✓ |
| Service Role | ✓ | ✓ | ✓ | ✓ |
| Public/Anon | ✓ | ✗ | ✗ | ✗ |

## Monitoring KPIs

**Track in your observability tool:**

1. **Cache Hit Ratio** - Target: >80% after warmup
   ```python
   cache_hits / (cache_hits + cache_misses)
   ```

2. **Cache Coverage** - States/ZIPs covered
   ```sql
   SELECT COUNT(DISTINCT state) FROM cached_jurisdictions;
   ```

3. **API Call Reduction** - Firecrawl calls saved
   ```
   Estimated Firecrawl calls avoided = (cache_hits * avg_searches_per_user)
   Monthly savings = avoided_calls * $0.10
   ```

4. **Cache Age** - Oldest entries need refresh?
   ```sql
   SELECT MAX(created_at - NOW()) FROM cached_jurisdictions;
   ```

## Troubleshooting

### Cache Lookups Return Empty
```python
# Check if table exists
result = db.query("SELECT * FROM cached_jurisdictions LIMIT 0")

# Check if RLS policies are blocking reads
# (should not be - SELECT is allowed for all authenticated users)

# Verify ZIP code format (must be 5 digits)
assert len(zip_code) == 5 and zip_code.isdigit()
```

### Write Operations Fail (Admin)
```python
# Check user role in token
# Ensure service_role key is used for inserts

# Verify admin flag in profiles table
SELECT is_admin FROM profiles WHERE id = user_id
```

### Performance: Slow Lookups
```sql
-- Check if indexes exist
SELECT schemaname, tablename, indexname 
FROM pg_indexes 
WHERE tablename = 'cached_jurisdictions';

-- Re-analyze table for query planner
ANALYZE public.cached_jurisdictions;
```

## Next Steps

1. **Deploy Migration**
   ```bash
   cd backend
   supabase migration up
   ```

2. **Test Locally**
   ```bash
   pytest tests/test_jurisdiction_cache.py
   ```

3. **Warm Up Cache** (seed common ZIPs)
   ```python
   for zip_code in TOP_CITIES_ZIPS:
       scout_and_cache(zip_code)
   ```

4. **Monitor Hit Ratio** - Should climb to >80% within days

5. **Schedule TTL Cleanup** (optional)
   ```python
   # Remove entries older than 30 days
   # Run daily via Vercel cron or Supabase scheduled function
   ```
