# Jurisdiction Cache System Documentation

## Overview

The `cached_jurisdictions` table is a global, multi-tenant lookup cache designed to eliminate redundant third-party API calls (particularly to Firecrawl) when jurisdiction data has already been fetched for a given ZIP code.

## Architecture

### Database Schema

```sql
CREATE TABLE public.cached_jurisdictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  zip_code VARCHAR(10) UNIQUE NOT NULL,
  city TEXT,
  state VARCHAR(2),
  firecrawl_payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

### Key Design Decisions

1. **UUID Primary Key** - Ensures global uniqueness, enables distributed systems
2. **UNIQUE(zip_code)** - One cache entry per ZIP code; upsert pattern for updates
3. **JSONB for Payload** - Stores raw Firecrawl markdown, queryable via JSONB operators
4. **UTC Timestamps** - Consistent time tracking for TTL/invalidation logic
5. **Indexes on zip_code, state, created_at** - Optimizes common query patterns

## Row Level Security (RLS)

### Policies

| Policy | Role | Action | Condition |
|--------|------|--------|-----------|
| Read All | `authenticated` | SELECT | `true` (all users can read) |
| Write | `authenticated` | INSERT | User is admin or service role |
| Update | `authenticated` | UPDATE | User is admin or service role |
| Delete | `authenticated` | DELETE | User is admin or service role |

### Permission Model

- **All authenticated users** can SELECT (read) any cached jurisdiction
- **Admins/service role only** can INSERT, UPDATE, DELETE
- **Public/anon users** can SELECT (if needed for pre-auth flows)

## Backend Integration

### Python Helper Module: `jurisdiction_cache.py`

Core functions:

#### `lookup_cached_jurisdiction(zip_code: str) -> Optional[Dict]`
```python
from jurisdiction_cache import lookup_cached_jurisdiction

# Check cache before calling Firecrawl
cached = lookup_cached_jurisdiction("75074")
if cached:
    firecrawl_data = cached["firecrawl_payload"]
    print(f"Cache hit: {cached['city']}, {cached['state']}")
else:
    # Call Firecrawl, then populate cache
    pass
```

#### `store_cached_jurisdiction(zip_code, city, state, firecrawl_payload) -> bool`
```python
from jurisdiction_cache import store_cached_jurisdiction

# After fetching from Firecrawl, cache it
success = store_cached_jurisdiction(
    zip_code="75074",
    city="Plano",
    state="TX",
    firecrawl_payload={"markdown": "...", "urls": [...]}
)
```

#### `get_cached_jurisdictions_by_state(state: str) -> list[Dict]`
```python
# Get all cached ZIPs for a state
tx_jurisdictions = get_cached_jurisdictions_by_state("TX")
print(f"Cached {len(tx_jurisdictions)} Texas jurisdictions")
```

#### `get_cache_stats() -> Dict`
```python
# Monitor cache health
stats = get_cache_stats()
print(f"Total entries: {stats['total_entries']}")
print(f"States covered: {stats['states_covered']}")
print(f"Oldest entry: {stats['oldest_entry_age_days']} days")
```

## API Endpoints

### `GET /cache/jurisdiction/{zip_code}`
Look up a cached jurisdiction by ZIP code.

**Request:**
```bash
curl http://localhost:8000/cache/jurisdiction/75074
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "zip_code": "75074",
  "city": "Plano",
  "state": "TX",
  "firecrawl_payload": {
    "markdown": "## Plano Building Codes...",
    "urls": ["https://...", "https://..."]
  },
  "created_at": "2026-06-20T14:32:10.000Z"
}
```

**Response (404):**
```json
{
  "detail": "No cached jurisdiction found for ZIP 12345"
}
```

### `GET /cache/jurisdictions/state/{state}`
Get all cached jurisdictions for a state.

**Request:**
```bash
curl http://localhost:8000/cache/jurisdictions/state/TX
```

**Response:**
```json
{
  "state": "TX",
  "count": 42,
  "jurisdictions": [
    {"zip_code": "75074", "city": "Plano", "state": "TX", ...},
    {"zip_code": "75001", "city": "Arlington", "state": "TX", ...}
  ]
}
```

### `GET /cache/stats`
Get cache statistics for monitoring.

**Request:**
```bash
curl http://localhost:8000/cache/stats
```

**Response:**
```json
{
  "total_entries": 127,
  "states_covered": 8,
  "states_list": ["CA", "CO", "TX", "NY", ...],
  "oldest_entry_age_days": 15
}
```

### `POST /cache/jurisdiction`
Store or update a jurisdiction (admin only).

**Request:**
```bash
curl -X POST http://localhost:8000/cache/jurisdiction \
  -H "Content-Type: application/json" \
  -d '{
    "zip_code": "75074",
    "city": "Plano",
    "state": "TX",
    "firecrawl_payload": {
      "markdown": "...",
      "urls": [...]
    }
  }'
```

**Response:**
```json
{
  "status": "success",
  "message": "Cached jurisdiction for ZIP 75074"
}
```

## Integration with Scraper

### Before (Without Cache)

```python
def scout_for_jurisdiction(zip_code: str, query: str):
    # Always calls Firecrawl, costs $$ and adds latency
    results = firecrawl_search(query)
    save_to_db(results)
    return results
```

### After (With Cache)

```python
from jurisdiction_cache import lookup_cached_jurisdiction, store_cached_jurisdiction

def scout_for_jurisdiction(zip_code: str, query: str):
    # Check cache first
    cached = lookup_cached_jurisdiction(zip_code)
    if cached:
        logger.info(f"Cache hit for {zip_code}")
        return cached["firecrawl_payload"]
    
    # Cache miss - call Firecrawl
    logger.info(f"Cache miss for {zip_code}, calling Firecrawl")
    results = firecrawl_search(query)
    
    # Populate cache for future use
    store_cached_jurisdiction(
        zip_code=zip_code,
        city=extracted_city,
        state=extracted_state,
        firecrawl_payload=results
    )
    
    return results
```

## Cost Savings

### Scenario: 1000 Users in Plano, TX

**Without Cache:**
- 1000 users × ~5 Firecrawl searches per user = 5,000 API calls
- At $0.10 per search = **$500 per month**

**With Cache:**
- First user: 5 Firecrawl calls = $0.50
- Remaining 999 users: 0 Firecrawl calls (all cache hits)
- **Total: $0.50 per month** ✓ 1000x savings!

## Cache Invalidation Strategy

### TTL-Based Invalidation
```python
from datetime import datetime, timezone, timedelta

def invalidate_old_cache(days_old: int = 30):
    """Remove cache entries older than N days."""
    cutoff = datetime.now(timezone.utc) - timedelta(days=days_old)
    # Delete where created_at < cutoff
    # (implement via Supabase delete query)
```

### Manual Invalidation
```python
from jurisdiction_cache import clear_cache_for_zip

# Invalidate single ZIP (e.g., after policy change)
clear_cache_for_zip("75074")
```

### Selective Re-cache
```python
# Re-fetch and update a single ZIP
results = firecrawl_search(query_for_zip("75074"))
store_cached_jurisdiction("75074", "Plano", "TX", results)
```

## Deployment

### 1. Run Migration

```bash
# Using Supabase CLI
supabase migration up

# Or manually execute SQL from backend/migrations/001_create_cached_jurisdictions.sql
```

### 2. Verify Table Creation

```sql
SELECT * FROM public.cached_jurisdictions LIMIT 0;
```

### 3. Test RLS Policies

```sql
-- As authenticated user, should work
SELECT * FROM public.cached_jurisdictions WHERE zip_code = '75074';

-- INSERT should fail for non-admin
INSERT INTO public.cached_jurisdictions (zip_code, city, state)
VALUES ('12345', 'TestCity', 'XX');  -- Fails unless admin
```

### 4. Seed Initial Cache (Optional)

```python
from jurisdiction_cache import store_cached_jurisdiction

# Populate cache with common ZIP codes
for zip_code in ["75074", "75001", "75002", ...]:
    scout_and_cache(zip_code)
```

## Monitoring & Maintenance

### Cache Hit Ratio
```python
# Track requests vs cache hits
cache_hits = 0
cache_misses = 0

if lookup_cached_jurisdiction(zip_code):
    cache_hits += 1
else:
    cache_misses += 1

hit_ratio = cache_hits / (cache_hits + cache_misses)
print(f"Cache hit ratio: {hit_ratio * 100:.1f}%")  # Target: >80%
```

### Common Queries

**See cache stats:**
```sql
SELECT 
  COUNT(*) as total_zips,
  COUNT(DISTINCT state) as states_covered,
  MIN(created_at) as oldest_entry,
  MAX(created_at) as newest_entry
FROM public.cached_jurisdictions;
```

**Find oldest entries:**
```sql
SELECT zip_code, city, state, created_at
FROM public.cached_jurisdictions
ORDER BY created_at ASC
LIMIT 10;
```

**See states with most cache:**
```sql
SELECT state, COUNT(*) as cached_zips
FROM public.cached_jurisdictions
GROUP BY state
ORDER BY cached_zips DESC;
```

## Security Considerations

1. **RLS is enforced** - Non-admins cannot write to cache
2. **JSONB is queryable** - Firecrawl markdown is stored intact, can be indexed
3. **No sensitive data** - Cache stores public jurisdiction info only
4. **Audit trail via created_at** - Can track cache age and necessity for invalidation
5. **Service role** - Backend processes use service role key (never exposed to frontend)

## Future Enhancements

- [ ] Cache versioning (track schema changes)
- [ ] Automatic TTL invalidation (scheduler job)
- [ ] Cache warmup script (pre-populate common ZIPs)
- [ ] Fallback chain (cache → Firecrawl → user input)
- [ ] Analytics dashboard (hit ratio, state coverage, cost savings)
- [ ] Selective invalidation (by state, date range, etc.)
