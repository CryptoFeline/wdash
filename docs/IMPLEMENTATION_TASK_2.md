# Task 2: Full JSON Storage + Smart Sync

## Overview

**Goal**: Store complete GMGN API response in Supabase, implement intelligent sync pattern.

**Key Pattern**: Load from DB instantly → Check staleness → Refresh in background

```
Frontend Load:
  1. GET from Supabase (instant, no wait)
  2. Display data
  3. Check last_synced < 30 minutes?
     ├─ YES → Done, data is fresh
     └─ NO → Trigger background refresh
         └─ Backend fetches GMGN
         └─ Stores full JSON in Supabase
         └─ Frontend polls for update
         └─ Shows "Updated!" message
```

---

## Backend Implementation

### Step 1: Create Supabase Module

File: `backend/db/supabase.js`

```javascript
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with service role key
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('❌ Supabase credentials not configured in environment');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log(`[Supabase] Connected to ${supabaseUrl}`);

/**
 * Upsert wallet with full JSON data and extracted metadata
 * 
 * @param {Object} walletData
 * @param {string} walletData.wallet_address - Unique wallet address
 * @param {string} walletData.chain - Chain name (eth, sol, etc.)
 * @param {Object} walletData.data - Full GMGN API response
 * @param {Object} walletData.metadata - Extracted metrics for indexing
 * 
 * @example
 * await upsertWallet({
 *   wallet_address: '0x1234...',
 *   chain: 'eth',
 *   data: { ...full_gmgn_response },
 *   metadata: {
 *     pnl_7d: 0.5,
 *     realized_profit_7d: 12345.67,
 *     winrate_7d: 0.65,
 *     risk: { ... }
 *   }
 * });
 */
export async function upsertWallet(walletData) {
  const { wallet_address, chain = 'eth', data, metadata = {} } = walletData;
  
  if (!wallet_address || !data) {
    throw new Error('wallet_address and data are required');
  }
  
  try {
    const { error } = await supabase
      .from('wallets')
      .upsert(
        {
          wallet_address,
          chain,
          data, // Full JSON response stored here
          metadata, // Extracted metrics for indexed queries
          last_synced: new Date().toISOString(),
        },
        {
          onConflict: 'wallet_address,chain', // Upsert on composite key
        }
      );
    
    if (error) {
      throw error;
    }
    
    console.log(`[Supabase] Upserted wallet: ${wallet_address} (${chain})`);
  } catch (error) {
    console.error('[Supabase] Upsert failed:', error);
    throw error;
  }
}

/**
 * Create wallet snapshot for historical tracking
 * Called every time a wallet is synced
 * 
 * @param {string} wallet_address
 * @param {string} chain
 * @param {Object} snapshot_data - Full wallet data at snapshot time
 * @param {Object} metrics - Extracted metrics object
 */
export async function createSnapshot(wallet_address, chain, snapshot_data, metrics) {
  if (!wallet_address || !snapshot_data) {
    throw new Error('wallet_address and snapshot_data are required');
  }
  
  try {
    const { error } = await supabase
      .from('wallet_snapshots')
      .insert({
        wallet_address,
        chain,
        snapshot_data,
        metrics: metrics || {},
      });
    
    if (error) {
      throw error;
    }
    
    console.log(`[Supabase] Created snapshot: ${wallet_address}`);
  } catch (error) {
    console.error('[Supabase] Snapshot creation failed:', error);
    throw error;
  }
}

/**
 * Get wallet by address (returns current state)
 */
export async function getWallet(wallet_address) {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('wallet_address', wallet_address)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows, which is OK
      throw error;
    }
    
    return data || null;
  } catch (error) {
    console.error('[Supabase] Get wallet failed:', error);
    throw error;
  }
}

/**
 * Get all wallets for a chain
 */
export async function getWalletsByChain(chain) {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('chain', chain)
      .order('last_synced', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('[Supabase] Get wallets by chain failed:', error);
    throw error;
  }
}

/**
 * Check if wallet data is stale
 * 
 * @param {string} wallet_address
 * @param {number} ttlSeconds - Time to live in seconds (default 1800 = 30 min)
 * @returns {boolean} true if stale, false if fresh
 */
export async function isWalletStale(wallet_address, ttlSeconds = 1800) {
  try {
    const wallet = await getWallet(wallet_address);
    
    if (!wallet) {
      return true; // No data = stale
    }
    
    const lastSynced = new Date(wallet.last_synced);
    const now = new Date();
    const ageSeconds = (now - lastSynced) / 1000;
    
    return ageSeconds > ttlSeconds;
  } catch (error) {
    console.error('[Supabase] Staleness check failed:', error);
    return true; // Assume stale on error
  }
}

/**
 * Get wallet snapshots for trend analysis
 * 
 * @param {string} wallet_address
 * @param {number} days - How many days back (default 30)
 */
export async function getWalletSnapshots(wallet_address, days = 30) {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    const { data, error } = await supabase
      .from('wallet_snapshots')
      .select('*')
      .eq('wallet_address', wallet_address)
      .gte('snapped_at', since.toISOString())
      .order('snapped_at', { ascending: false });
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('[Supabase] Get snapshots failed:', error);
    return [];
  }
}

/**
 * Clear wallet from database (for testing/debugging)
 */
export async function deleteWallet(wallet_address, chain) {
  try {
    const { error } = await supabase
      .from('wallets')
      .delete()
      .eq('wallet_address', wallet_address)
      .eq('chain', chain);
    
    if (error) {
      throw error;
    }
    
    console.log(`[Supabase] Deleted wallet: ${wallet_address}`);
  } catch (error) {
    console.error('[Supabase] Delete failed:', error);
    throw error;
  }
}

export default supabase;
```

### Step 2: Create Sync Endpoint

File: `backend/routes/sync.js`

```javascript
import express from 'express';
import { 
  upsertWallet, 
  createSnapshot 
} from '../db/supabase.js';
import { 
  fetchGMGNData,
  extractMetadata,
  extractMetrics
} from '../scraper/fetcher.js';

const router = express.Router();

/**
 * POST /api/sync
 * Manually trigger sync for specified wallets
 * 
 * Body:
 * {
 *   "walletAddresses": ["0x1234...", "0x5678..."],
 *   "chain": "eth",
 *   "timeframe": "7d"
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { walletAddresses = [], chain = 'eth', timeframe = '7d' } = req.body;
    
    if (!walletAddresses || walletAddresses.length === 0) {
      return res.status(400).json({
        error: 'walletAddresses array required in body'
      });
    }
    
    console.log(`[Sync] Starting sync for ${walletAddresses.length} wallets...`);
    
    const results = [];
    const errors = [];
    
    // Sync each wallet
    for (const walletAddress of walletAddresses) {
      try {
        // 1. Fetch fresh data from GMGN
        const response = await fetchGMGNData({
          chain,
          timeframe,
          wallet: walletAddress // If fetching single wallet
        });
        
        const walletData = response.data; // The full API response
        
        // 2. Extract metadata for indexing
        const metadata = extractMetadata(walletData);
        
        // 3. Upsert to Supabase (full JSON + metadata)
        await upsertWallet({
          wallet_address: walletAddress,
          chain,
          data: walletData, // Full GMGN response
          metadata,
        });
        
        // 4. Create snapshot for historical tracking
        const metrics = extractMetrics(walletData);
        await createSnapshot(
          walletAddress,
          chain,
          walletData,
          metrics
        );
        
        results.push({
          wallet_address: walletAddress,
          status: 'success',
          synced_at: new Date().toISOString()
        });
        
      } catch (error) {
        console.error(`[Sync] Error syncing ${walletAddress}:`, error);
        errors.push({
          wallet_address: walletAddress,
          status: 'error',
          error: error.message
        });
      }
    }
    
    return res.json({
      message: 'Sync completed',
      total: walletAddresses.length,
      successful: results.length,
      failed: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined
    });
    
  } catch (error) {
    console.error('[Sync] Endpoint error:', error);
    res.status(500).json({
      error: 'Sync failed',
      message: error.message
    });
  }
});

/**
 * POST /api/sync/full
 * Full refresh - fetch all wallets and sync to Supabase
 */
router.post('/full', async (req, res) => {
  try {
    const { chain = 'eth', timeframe = '7d', tag = 'all' } = req.body;
    
    console.log(`[Sync] Starting full sync for ${chain}/${timeframe}/${tag}...`);
    
    // Fetch all wallets from GMGN
    const response = await fetchGMGNData({
      chain,
      timeframe,
      tag: tag === 'all' ? null : tag,
      limit: 200
    });
    
    const wallets = response.data?.rank || [];
    
    if (wallets.length === 0) {
      return res.status(400).json({
        error: 'No wallets fetched from GMGN'
      });
    }
    
    // Sync each wallet to Supabase
    const results = [];
    
    for (const wallet of wallets) {
      try {
        const metadata = extractMetadata(wallet);
        const metrics = extractMetrics(wallet);
        
        await upsertWallet({
          wallet_address: wallet.wallet_address,
          chain,
          data: wallet, // Full wallet object
          metadata,
        });
        
        await createSnapshot(
          wallet.wallet_address,
          chain,
          wallet,
          metrics
        );
        
        results.push(wallet.wallet_address);
      } catch (error) {
        console.error(`[Sync] Error syncing wallet:`, error);
      }
    }
    
    console.log(`[Sync] Full sync completed: ${results.length} wallets`);
    
    return res.json({
      message: 'Full sync completed',
      synced_count: results.length,
      synced_at: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Sync] Full sync error:', error);
    res.status(500).json({
      error: 'Full sync failed',
      message: error.message
    });
  }
});

export default router;
```

### Step 3: Update Wallets Route for Database Loading

File: `backend/routes/wallets.js` (add at top)

```javascript
// Add Supabase import
import { 
  getWalletsByChain,
  upsertWallet,
  createSnapshot
} from '../db/supabase.js';
import { extractMetadata, extractMetrics } from '../scraper/fetcher.js';
```

Then update the GET endpoint:

```javascript
/**
 * GET /api/wallets
 * Load from Supabase (primary), optionally refresh from GMGN if stale
 */
router.get('/', async (req, res) => {
  try {
    const chain = req.query.chain || 'eth';
    const timeframe = req.query.timeframe || '7d';
    const tag = req.query.tag || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const forceRefresh = req.query.forceRefresh === 'true';

    console.log(`[API] GET /api/wallets - chain: ${chain}, timeframe: ${timeframe}, forceRefresh: ${forceRefresh}`);

    // 1. Load from Supabase (fast)
    let allWallets = await getWalletsByChain(chain);
    
    // 2. If empty or forced refresh, fetch from GMGN
    if (allWallets.length === 0 || forceRefresh) {
      console.log(`[API] Fetching fresh data from GMGN...`);
      
      const { fetchGMGNData } = await import('../scraper/fetcher.js');
      const response = await fetchGMGNData({
        chain,
        timeframe,
        tag: tag === 'all' ? null : tag,
        limit: 200
      });
      
      const gmgnWallets = response.data?.rank || [];
      
      // Upsert all to Supabase
      for (const wallet of gmgnWallets) {
        try {
          const metadata = extractMetadata(wallet);
          const metrics = extractMetrics(wallet);
          
          await upsertWallet({
            wallet_address: wallet.wallet_address,
            chain,
            data: wallet,
            metadata,
          });
          
          await createSnapshot(
            wallet.wallet_address,
            chain,
            wallet,
            metrics
          );
        } catch (error) {
          console.error('[API] Error upserting wallet:', error);
        }
      }
      
      // Reload from database
      allWallets = await getWalletsByChain(chain);
    }

    // 3. Paginate results
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = allWallets.slice(start, end);

    return res.json({
      data: paginatedData.map(w => w.data), // Return full JSON
      page,
      limit,
      total: allWallets.length,
      totalPages: Math.ceil(allWallets.length / limit),
      hasMore: end < allWallets.length,
      source: forceRefresh ? 'fresh' : 'cached'
    });
    
  } catch (error) {
    console.error('[API] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch wallets',
      message: error.message
    });
  }
});
```

### Step 4: Add Sync Route to Server

File: `backend/server.js`

```javascript
// Add import at top
import syncRouter from './routes/sync.js';

// Add route (after wallets route)
app.use('/api/sync', syncRouter);
```

---

## Frontend Implementation

### Step 1: Create Supabase Client

File: `frontend/src/lib/supabase-client.ts`

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Wallet } from '@/types/wallet';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !anonKey) {
  console.warn('[Supabase] Missing credentials in environment');
}

export const supabase = createClient(
  supabaseUrl || '',
  anonKey || ''
);

/**
 * Load wallets from Supabase directly
 * Uses anon key with RLS (public read access)
 */
export async function loadWalletsFromDB(chain: string): Promise<Wallet[]> {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('data, last_synced')
      .eq('chain', chain)
      .order('last_synced', { ascending: false });
    
    if (error) {
      console.error('[Supabase] Load error:', error);
      return [];
    }
    
    // Extract wallet data from JSON column
    return data
      .map(row => row.data)
      .filter(wallet => wallet && wallet.wallet_address);
    
  } catch (error) {
    console.error('[Supabase] Load failed:', error);
    return [];
  }
}

/**
 * Get last sync time for staleness check
 */
export async function getLastSyncTime(chain: string): Promise<Date | null> {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('last_synced')
      .eq('chain', chain)
      .order('last_synced', { ascending: false })
      .limit(1)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return new Date(data.last_synced);
  } catch (error) {
    console.error('[Supabase] Sync time check failed:', error);
    return null;
  }
}

/**
 * Check if data is stale (older than TTL)
 * 
 * @param lastSyncTime - Timestamp of last sync
 * @param ttlMinutes - Time to live in minutes (default 30)
 */
export function isDataStale(lastSyncTime: Date | null, ttlMinutes = 30): boolean {
  if (!lastSyncTime) return true;
  
  const now = new Date();
  const ageMinutes = (now.getTime() - lastSyncTime.getTime()) / (1000 * 60);
  
  return ageMinutes > ttlMinutes;
}

/**
 * Trigger backend sync
 * 
 * @param chain - Chain to refresh
 * @param timeframe - Timeframe for refresh
 * @param tag - Tag to refresh
 */
export async function triggerBackendSync(
  chain: string,
  timeframe: string,
  tag: string
): Promise<boolean> {
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chain,
        timeframe,
        tag,
        forceRefresh: true
      })
    });
    
    if (!response.ok) {
      console.error('[Sync] Backend returned error:', response.status);
      return false;
    }
    
    const data = await response.json();
    console.log('[Sync] Backend sync completed:', data);
    return true;
    
  } catch (error) {
    console.error('[Sync] Trigger failed:', error);
    return false;
  }
}

/**
 * Wait for new data to arrive in Supabase
 * Polls up to 60 seconds
 */
export async function waitForNewData(
  chain: string,
  targetTime: Date,
  maxWaitMs: number = 60000
): Promise<Wallet[]> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const wallets = await loadWalletsFromDB(chain);
    const lastSync = await getLastSyncTime(chain);
    
    if (lastSync && lastSync > targetTime) {
      console.log('[Sync] New data detected');
      return wallets;
    }
    
    // Wait 2 seconds before polling again
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('[Sync] Timeout waiting for new data');
  return await loadWalletsFromDB(chain);
}
```

### Step 2: Update Page Component

File: `frontend/src/app/page.tsx` (update data loading logic)

```typescript
'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  loadWalletsFromDB, 
  getLastSyncTime, 
  isDataStale,
  triggerBackendSync,
  waitForNewData
} from '@/lib/supabase-client';
import type { Wallet } from '@/types/wallet';

export default function Home() {
  const [chain, setChain] = useState('sol');
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load data from Supabase
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        setError(null);
        
        // 1. Load from Supabase (instant, no wait)
        const dbWallets = await loadWalletsFromDB(chain);
        setWallets(dbWallets);
        
        // 2. Get last sync time
        const syncTime = await getLastSyncTime(chain);
        setLastSync(syncTime);
        
        // 3. Check if refresh needed
        if (isDataStale(syncTime, 30)) {
          // Data is stale, trigger background refresh
          setIsRefreshing(true);
          
          const syncTime = new Date();
          
          // Trigger backend sync (fire and forget initially)
          const syncSuccess = await triggerBackendSync(chain, '7d', 'all');
          
          if (syncSuccess) {
            // Wait for new data to arrive
            const refreshedWallets = await waitForNewData(chain, syncTime);
            setWallets(refreshedWallets);
            
            // Update last sync time
            const newSyncTime = await getLastSyncTime(chain);
            setLastSync(newSyncTime);
          }
          
          setIsRefreshing(false);
        }
        
      } catch (err) {
        console.error('[Page] Load error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [chain]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      
      const syncTime = new Date();
      const success = await triggerBackendSync(chain, '7d', 'all');
      
      if (success) {
        const refreshedWallets = await waitForNewData(chain, syncTime);
        setWallets(refreshedWallets);
        
        const newSyncTime = await getLastSyncTime(chain);
        setLastSync(newSyncTime);
      }
      
    } catch (err) {
      console.error('[Page] Refresh error:', err);
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setIsRefreshing(false);
    }
  }, [chain]);

  // ... rest of component
  
  return (
    <div>
      {/* Loading state */}
      {isLoading && <div>Loading from database...</div>}
      
      {/* Refresh state */}
      {isRefreshing && <div>Updating data...</div>}
      
      {/* Stale indicator */}
      {lastSync && isDataStale(lastSync, 30) && (
        <div className="text-yellow-600">
          ⚠️ Data might be outdated (last updated {lastSync.toLocaleTimeString()})
        </div>
      )}
      
      {/* Data display */}
      {wallets.length > 0 && (
        <div>
          <button onClick={handleManualRefresh} disabled={isRefreshing}>
            {isRefreshing ? 'Updating...' : 'Refresh Data'}
          </button>
          {/* Wallet table */}
        </div>
      )}
    </div>
  );
}
```

---

## Environment Variables

### Backend (Render)
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
```

### Frontend (Netlify)
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

---

## Testing

### Test Backend Sync
```bash
curl -X POST http://localhost:3001/api/sync/full \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <API_KEY>" \
  -d '{"chain": "eth"}'
```

### Test Frontend Load
1. Go to http://localhost:3000
2. Check console: Should see `[Supabase] Load...`
3. Data should load from Supabase
4. Check staleness
5. If stale, should trigger refresh

---

## Summary

✅ Store full JSON in Supabase
✅ Load instantly from database
✅ Check staleness and refresh if needed
✅ Create snapshots for historical tracking
✅ Frontend never waits for backend

**Next**: Task 3 - Historical Tracking & Analytics

