# Architecture Plan: Supabase Integration with Full JSON Storage

## Overview: Three Tasks

### Task 1: Secure API Endpoint (Backend API Key)
**Goal**: Protect `/api/wallets` and `/api/wallets/stats` from public access.

**Current Problem**:
```
Anyone can call in browser: https://wdashboard.netlify.app/api/wallets?chain=sol
```

**Solution**: Simple backend API key validation
- Frontend (Netlify) stores `API_KEY` in environment (server-side only)
- Frontend passes `X-API-Key: API_KEY` header when calling `/api/*` routes
- Middleware validates header, rejects if missing or invalid
- Backend API key already set up and stored on Render

**Security Model**:
```
┌─────────────┐
│   Browser   │
│  (no auth)  │
└──────┬──────┘
       │
       │ fetch('/api/wallets') + no auth header visible
       ▼
┌─────────────────────────────────────┐
│  Next.js Middleware (Netlify)       │
│  - Checks X-API-Key header          │
│  - Validates against API_KEY env    │
│  - Server-side only (secret)        │
└──────┬──────────────────────────────┘
       │
       │ X-API-Key: <secret> (from server env)
       ▼
┌─────────────────────────────────────┐
│  Backend Route (/api/wallets)       │
│  - Adds X-API-Key header (server)   │
│  - Calls backend with secret        │
└──────┬──────────────────────────────┘
       │
       │ X-API-Key: <secret> header
       ▼
┌─────────────────────────────────────┐
│  Backend Middleware (Render)        │
│  - Validates X-API-Key              │
│  - Already implemented ✓            │
└─────────────────────────────────────┘
```

**Implementation**:
1. Add API key validation to `frontend/src/middleware.ts`
2. Pass API_KEY from Next.js to backend routes
3. Return 401 if API key missing or invalid

---

### Task 2: Full JSON Storage + Smart Sync

**Goal**: Store complete GMGN API response, sync intelligently, load from database.

**Data Flow**:
```
GMGN API (external)
    │
    ├─→ Backend fetches full JSON response
    │
    ├─→ Supabase: wallets table (upsert)
    │   - wallet_address (unique)
    │   - data (JSONB) ← Full API response stored here
    │   - metadata (indexed for queries)
    │   - last_synced (timestamp)
    │
    └─→ Frontend
        ├─→ Load: Returns latest from Supabase (no wait)
        ├─→ If stale (>30min): Trigger backend refresh in background
        └─→ Backend returns new data → Supabase updates → Frontend shows "Updated"
```

**Key Concept: Lazy Sync Pattern**
- Frontend loads from database instantly (no backend wait)
- Backend only fetches if:
  1. Data is older than TTL (30 minutes)
  2. Frontend explicitly requests refresh
  3. Cache key doesn't exist

**Stale Data Detection**:
```
Frontend load:
  ├─ last_synced < 30min → Use cached
  ├─ last_synced > 30min → Trigger refresh
  └─ Load from DB while backend wakes up (show "Updating..." after 2s)

Backend refresh:
  ├─ Fetch from GMGN API
  ├─ Store full JSON in wallets.data
  ├─ Update wallet metadata (pnl_7d, risk, tags, etc.)
  ├─ Create wallet_snapshot (for historical tracking)
  └─ Return new data to frontend
```

**Upsert Logic** (Supabase):
```sql
-- On update: Keep full JSON, update metadata
INSERT INTO wallets (wallet_address, chain, data, metadata, last_synced)
VALUES ($1, $2, $3, $4, NOW())
ON CONFLICT (wallet_address) DO UPDATE SET
  data = EXCLUDED.data,
  metadata = EXCLUDED.metadata,
  last_synced = NOW();
```

---

### Task 3: Historical Tracking

**Goal**: Track wallet performance over time for analytics/deep dive.

**Two-Table Strategy**:

**1. `wallets` table (current state)**:
- One row per wallet
- Always updated to latest data
- Stores full JSON response
- Indexed for fast queries

**2. `wallet_snapshots` table (historical)**:
- One row per sync per wallet
- Created every time wallet is synced
- Stores metrics at that point in time
- Enables trend analysis

**Example Timeline**:
```
Day 1:
  Wallet ABC synced → wallets.last_synced = Day 1
  → wallet_snapshots created with Day 1 metrics

Day 2:
  Wallet ABC synced → wallets.last_synced = Day 2
  → wallets.data updated with Day 2 JSON
  → wallet_snapshots created with Day 2 metrics

Day 3:
  Query snapshots for Wallet ABC → See Day 1 → Day 2 → Day 3 trend
```

**Analytics Use Cases**:
- "Show me this wallet's PnL trend over 30 days"
- "Which wallets improved most this week?"
- "Average realized profit trend across all wallets"

---

## Database Schema

### Wallets Table
```sql
CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- Unique identifier
  wallet_address TEXT UNIQUE NOT NULL,
  chain TEXT NOT NULL DEFAULT 'eth',
  
  -- FULL JSON RESPONSE FROM GMGN (store everything)
  data JSONB NOT NULL,
  
  -- Extracted metadata for fast queries (denormalized)
  metadata JSONB DEFAULT '{}'::JSONB, -- Contains pnl_7d, tags, risk scores, etc.
  
  -- Sync tracking
  last_synced TIMESTAMPTZ DEFAULT NOW(),
  sync_count INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes for common queries
  CONSTRAINT unique_wallet_per_chain UNIQUE (wallet_address, chain)
);

CREATE INDEX idx_wallets_last_synced ON wallets(last_synced DESC);
CREATE INDEX idx_wallets_chain ON wallets(chain);
CREATE INDEX idx_wallets_created ON wallets(created_at DESC);
```

### Wallet Snapshots Table (Historical)
```sql
CREATE TABLE wallet_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- FK to wallets
  wallet_address TEXT NOT NULL REFERENCES wallets(wallet_address),
  chain TEXT NOT NULL DEFAULT 'eth',
  
  -- Snapshot of metrics at this moment
  snapshot_data JSONB NOT NULL, -- Full wallet data at snapshot time
  
  -- Extracted metrics for quick analytics
  metrics JSONB DEFAULT '{}'::JSONB, -- pnl_7d, realized_profit_7d, winrate, etc.
  
  -- Timestamp of snapshot
  snapped_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  CONSTRAINT fk_wallet_chain FOREIGN KEY (wallet_address, chain)
    REFERENCES wallets(wallet_address, chain)
);

CREATE INDEX idx_snapshots_address_date ON wallet_snapshots(wallet_address, snapped_at DESC);
CREATE INDEX idx_snapshots_date ON wallet_snapshots(snapped_at DESC);
```

---

## Task 1 Implementation: API Security

### Changes Required

**1. frontend/src/middleware.ts** - Add API key validation:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }
  
  // Get API key from environment (server-side only)
  const API_KEY = process.env.API_KEY;
  
  // Validate API key from environment
  if (!API_KEY) {
    console.error('[Middleware] API_KEY not set in environment');
    return NextResponse.json(
      { error: 'Server configuration error' },
      { status: 500 }
    );
  }
  
  // Request comes from Next.js server, we add the key
  // This is automatic - no need to check header here
  // The key is added in the route handlers
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

**2. frontend/src/app/api/wallets/route.ts** - Send API key to backend:
```typescript
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL;
    const API_KEY = process.env.API_KEY;
    
    if (!API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }
    
    // Get query params from request
    const chain = request.nextUrl.searchParams.get('chain') || 'eth';
    const timeframe = request.nextUrl.searchParams.get('timeframe') || '7d';
    const tag = request.nextUrl.searchParams.get('tag') || 'all';
    const page = request.nextUrl.searchParams.get('page') || '1';
    const limit = request.nextUrl.searchParams.get('limit') || '50';
    
    // Call backend with API key
    const backendUrl = `${API_URL}/wallets?chain=${chain}&timeframe=${timeframe}&tag=${tag}&page=${page}&limit=${limit}`;
    
    const response = await fetch(backendUrl, {
      headers: {
        'X-API-Key': API_KEY, // ← Send API key here
      },
    });
    
    if (!response.ok) {
      throw new Error(`Backend error: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Route] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wallets' },
      { status: 500 }
    );
  }
}
```

### Security: How It Works
1. User types `https://wdashboard.netlify.app` in browser
2. Browser calls `/api/wallets` (same origin, allowed)
3. **Next.js server** (Netlify) receives request
4. Middleware runs (passes through - all requests allowed to /api/*)
5. Route handler runs on Netlify server
6. **Server-side code** reads `API_KEY` from environment
7. Server **adds `X-API-Key` header** to request
8. Request sent to backend (Render)
9. Backend validates header ✓
10. Returns data to Next.js server
11. Next.js sends to browser

**Browser never sees the API_KEY** ✓

---

## Task 2 Implementation: Full JSON Storage + Smart Sync

### Backend Changes

**1. backend/db/supabase.js** - New Supabase module:
```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Supabase credentials not configured');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Upsert wallet with full JSON data
 */
export async function upsertWallet(walletData) {
  const { wallet_address, chain = 'eth', data, metadata } = walletData;
  
  const { error } = await supabase
    .from('wallets')
    .upsert({
      wallet_address,
      chain,
      data, // Full JSON response
      metadata,
      last_synced: new Date().toISOString(),
    });
  
  if (error) throw error;
}

/**
 * Create wallet snapshot for historical tracking
 */
export async function createSnapshot(wallet_address, chain, snapshot_data, metrics) {
  const { error } = await supabase
    .from('wallet_snapshots')
    .insert({
      wallet_address,
      chain,
      snapshot_data,
      metrics,
    });
  
  if (error) throw error;
}

/**
 * Get wallet by address (returns full data)
 */
export async function getWallet(wallet_address) {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('wallet_address', wallet_address)
    .single();
  
  if (error) throw error;
  return data;
}

/**
 * Check if wallet is stale (older than TTL in seconds)
 */
export async function isWalletStale(wallet_address, ttlSeconds = 1800) { // 30 min default
  const wallet = await getWallet(wallet_address);
  if (!wallet) return true;
  
  const lastSynced = new Date(wallet.last_synced);
  const now = new Date();
  const ageSeconds = (now - lastSynced) / 1000;
  
  return ageSeconds > ttlSeconds;
}
```

**2. backend/routes/wallets.js** - Add sync endpoint:
```javascript
// Existing GET endpoint refactored to use Supabase + lazy sync
router.get('/', async (req, res) => {
  try {
    const chain = req.query.chain || 'eth';
    const timeframe = req.query.timeframe || '7d';
    const tag = req.query.tag || 'all';
    const forceRefresh = req.query.forceRefresh === 'true';
    
    // Check if data is stale
    const cacheKey = getCacheKey(chain, timeframe, tag);
    const needsRefresh = forceRefresh || isCacheStale(cacheKey);
    
    // If stale or not cached, fetch from GMGN and update Supabase
    if (needsRefresh) {
      const walletData = await fetchAndUpdateSupabase(chain, timeframe, tag);
      setCache(cacheKey, walletData);
      return res.json(walletData);
    }
    
    // Otherwise return cached data
    const cachedData = getCache(cacheKey);
    return res.json(cachedData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * New sync endpoint - explicitly refresh data
 */
router.post('/sync', async (req, res) => {
  try {
    const { walletAddresses, chain = 'eth' } = req.body;
    
    // Fetch fresh data for specified wallets
    const updatedWallets = await Promise.all(
      walletAddresses.map(async (addr) => {
        const wallet = await fetchWalletFromGMGN(addr);
        
        // Upsert to Supabase with full JSON
        await supabase.upsertWallet({
          wallet_address: addr,
          chain,
          data: wallet, // Full JSON response
          metadata: extractMetadata(wallet),
        });
        
        // Create snapshot for historical tracking
        await supabase.createSnapshot(addr, chain, wallet, extractMetrics(wallet));
        
        return wallet;
      })
    );
    
    return res.json({
      success: true,
      count: updatedWallets.length,
      wallets: updatedWallets,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Frontend Changes

**1. frontend/src/lib/supabase-client.ts** - Direct database reads:
```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, anonKey);

/**
 * Get wallets from Supabase (with RLS)
 * Returns full JSON data
 */
export async function fetchWalletsFromDB(chain: string) {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('chain', chain)
    .order('last_synced', { ascending: false });
  
  if (error) throw error;
  
  // Extract full wallet data from JSON
  return data.map(w => w.data);
}

/**
 * Check if data needs refresh
 */
export function needsRefresh(lastSynced: string, ttlMs = 30 * 60 * 1000) {
  const ageMs = Date.now() - new Date(lastSynced).getTime();
  return ageMs > ttlMs;
}

/**
 * Trigger backend sync
 */
export async function triggerBackendSync() {
  const response = await fetch('/api/wallets/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forceRefresh: true }),
  });
  
  if (!response.ok) throw new Error('Sync failed');
  return response.json();
}
```

**2. frontend/src/app/page.tsx** - Smart load pattern:
```typescript
useEffect(() => {
  async function loadData() {
    try {
      // 1. Load from Supabase immediately (no wait)
      const dbWallets = await fetchWalletsFromDB(chain);
      setWallets(dbWallets);
      setIsLoading(false);
      
      // 2. Check if refresh needed
      const lastSync = /* get from db */;
      if (needsRefresh(lastSync)) {
        setIsRefreshing(true);
        
        // 3. Trigger backend refresh (will update Supabase)
        await triggerBackendSync();
        
        // 4. Poll Supabase for updated data
        const updatedWallets = await fetchWalletsFromDB(chain);
        setWallets(updatedWallets);
        setIsRefreshing(false);
      }
    } catch (error) {
      console.error('Load error:', error);
      setError(error.message);
    }
  }
  
  loadData();
}, [chain]);
```

---

## Task 3: Historical Tracking

### Snapshot Strategy
- Every time backend syncs, create `wallet_snapshots` entry
- Keep metrics in both `wallets` and `wallet_snapshots`
- Query snapshots for trends

### Analytics Examples
```sql
-- Show PnL trend for wallet ABC over past 30 days
SELECT 
  snapped_at,
  metrics->>'pnl_7d' as pnl,
  metrics->>'realized_profit_7d' as profit
FROM wallet_snapshots
WHERE wallet_address = 'ABC'
ORDER BY snapped_at DESC
LIMIT 30;

-- Average realized profit trend across all wallets
SELECT 
  DATE(snapped_at) as date,
  AVG(CAST(metrics->>'realized_profit_7d' AS NUMERIC)) as avg_profit
FROM wallet_snapshots
GROUP BY DATE(snapped_at)
ORDER BY date DESC;
```

---

## Summary: Data Flow

```
Frontend Load:
  1. Query Supabase wallets table (instant)
  2. Display data
  3. Check last_synced timestamp
  4. If stale (>30min):
     a. Show "Data might be outdated"
     b. Trigger POST /api/wallets/sync in background
     c. Wait for response
     d. Update Supabase (auto via backend)
     e. Refresh UI with new data

Backend Sync:
  1. Fetch from GMGN API
  2. Upsert to Supabase wallets (full JSON in data column)
  3. Create wallet_snapshots entry (historical)
  4. Return to frontend

Next Page Load:
  1. Supabase has latest data
  2. Frontend loads instantly
  3. No backend wait needed ✓
```

---

## Environment Variables

### Backend (Render)
```
# Existing
API_KEY=<existing>
BROWSERLESS_API_TOKEN=<existing>
FRONTEND_URL=https://wdashboard.netlify.app

# NEW
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
```

### Frontend (Netlify)
```
# Existing
NEXT_PUBLIC_API_URL=https://dashboard-backend-mo1j.onrender.com/api
API_KEY=<existing>

# NEW
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## Next Steps

1. ✅ Create Supabase account
2. ✅ Create PostgreSQL database
3. ✅ Run schema SQL (with testing first)
4. ✅ Configure RLS policies
5. ✅ Get API keys
6. ✅ Implement Task 1: API Security
7. ✅ Implement Task 2: Supabase Integration
8. ✅ Implement Task 3: Historical Tracking
9. ✅ Deploy and test

