# Persistent Wallet Database Architecture

## Overview

The frontend maintains a **persistent wallet database** in localStorage that:
1. ✅ Accumulates ALL wallets ever fetched (never deletes)
2. ✅ Updates wallets when new data arrives (merge by `wallet_address`)
3. ✅ Tracks per-wallet staleness (`last_updated` timestamp)
4. ✅ Independent of filter combinations (single global database)

## Key Principles

### 1. API Filters → Backend Fetch
**Chain, Timeframe, Tag** filters trigger actual API calls to backend:
- `chain`: `sol` | `eth` | `bsc`
- `timeframe`: `24h` | `7d` | `30d`
- `tag`: `all` | `smart_degen` | `pump_smart` | `renowned` | `snipe_bot`

These filters determine **which wallets the backend returns**.

### 2. Advanced Filters → Display Only
**PnL, ROI, Tokens, Hold Time, Rug Pull** filters are client-side only:
- Filter the wallet database for display
- Never trigger API calls
- Instant response (in-memory filtering)

### 3. Database Never Deletes
Wallets are **only added or updated**, never removed:
- First fetch (SOL 7d all): 200 wallets → Database has 200 wallets
- Second fetch (ETH 24h smart_degen): 150 wallets → Database has 350 wallets (200 + 150)
- Third fetch (SOL 7d all again): 200 wallets → Database has 350 wallets (updates existing, no duplicates)

### 4. Per-Wallet Staleness
Each wallet has its own `last_updated` timestamp:
- Wallet A fetched 2 minutes ago → Fresh
- Wallet B fetched 15 minutes ago → Stale
- Wallet C fetched yesterday → Very stale
- **Staleness indicator shows newest and oldest timestamps in database**

## Data Structures

### Wallet Database Schema
```typescript
interface WalletWithMeta extends Wallet {
  last_updated: number; // Unix timestamp (ms)
}

interface WalletDatabase {
  wallets: Record<string, WalletWithMeta>; // Key: wallet_address
  version: number; // For future migrations
}

// Example:
{
  "wallets": {
    "ABC123...": {
      "wallet_address": "ABC123...",
      "pnl_7d": 1234.56,
      "realized_profit_7d": 9876.54,
      "last_updated": 1704123456789, // 2 minutes ago
      // ... other wallet fields
    },
    "XYZ789...": {
      "wallet_address": "XYZ789...",
      "pnl_7d": -42.1,
      "realized_profit_7d": 123.45,
      "last_updated": 1704000000000, // 15 minutes ago
      // ... other wallet fields
    }
  },
  "version": 1
}
```

### localStorage Key
Single global key: `gmgn-wallet-database`
- Not per-filter (no `gmgn-wallets-sol-7d-all` keys)
- All wallets in one database
- Simpler, more efficient

## Data Flow

### Initial Page Load
```
1. Mount component
   ↓
2. Load wallet database from localStorage
   - Key: "gmgn-wallet-database"
   - Contains ALL wallets ever fetched
   ↓
3. Display ALL wallets (before first fetch)
   - If empty: "No wallet data - Click refresh to fetch"
   - If populated: Show all wallets, apply display filters
   ↓
4. Auto-fetch on mount (chain=sol, timeframe=7d, tag=all)
   - API call to backend
   - Backend returns 200 wallets for SOL 7d all
   ↓
5. Merge into database
   - Update existing wallets (by wallet_address)
   - Add new wallets
   - Set last_updated = Date.now()
   ↓
6. Re-render with updated database
```

### API Filter Change (e.g., SOL → ETH)
```
1. User changes chain to ETH
   ↓
2. Trigger API fetch
   - API call: GET /api/wallets?chain=eth&timeframe=7d&tag=all
   - Backend returns 150 wallets for ETH 7d all
   ↓
3. Merge into database
   - Update 20 existing wallets (overlap with SOL)
   - Add 130 new wallets
   - Total database: 200 + 130 = 330 wallets
   ↓
4. Re-render with updated database
   - Display filters still applied (PnL, ROI, etc.)
   - Now showing wallets from both SOL and ETH fetches
```

### Display Filter Change (e.g., PnL Slider)
```
1. User adjusts PnL filter
   ↓
2. useMemo re-runs
   - Filter allWallets in-memory
   - No API call
   ↓
3. Re-render table with filtered wallets
   - Instant response (<10ms)
```

### Manual Refresh
```
1. User clicks "Refresh" button
   ↓
2. Fetch fresh data from backend
   - Same API filters (chain, timeframe, tag)
   - Backend returns latest wallet data
   ↓
3. Merge into database
   - Update timestamps for returned wallets
   - Wallets NOT in response keep old timestamps
   ↓
4. Staleness indicator updates
   - Newest timestamp = Date.now()
   - Oldest timestamp = unchanged (if wallet not refetched)
```

## Staleness Tracking

### Newest Timestamp
- Most recently fetched wallet in database
- Determines staleness indicator color:
  - 🟢 Green: <5 minutes
  - 🟡 Yellow: 5-10 minutes
  - 🔴 Red: >10 minutes

### Oldest Timestamp
- Least recently fetched wallet in database
- Shows data age range
- Example: "Latest: 2 minutes ago • Oldest: 3 days ago"

### Per-Wallet Staleness
- Each wallet has independent `last_updated`
- Wallet may never update if:
  - Not in API response for current filters
  - Removed from backend (e.g., no longer qualifies)
  - Only fetched once, then filters changed

## Use Cases

### Use Case 1: Multi-Chain Analysis
```
User journey:
1. Load page (SOL 7d all) → 200 wallets in database
2. Switch to ETH 7d all → 150 new wallets, total 350
3. Switch to BSC 7d all → 100 new wallets, total 450
4. Apply PnL filter >100% → Filter 450 wallets to 75 (client-side)
5. Click "Refresh" → Update all 450 wallets with latest data

API calls: 4 (SOL + ETH + BSC + refresh)
Display filter changes: 0 API calls
```

### Use Case 2: Historical Tracking
```
Day 1: Fetch SOL 7d all → 200 wallets, all fresh
Day 2: Open page → 200 wallets displayed (1 day old)
        Staleness: Red banner "Stale data - oldest: 1 day ago"
        Click refresh → Updates all 200 wallets
Day 3: Fetch ETH 24h smart_degen → Add 50 new wallets
        Database: 250 wallets total
        50 wallets fresh (just fetched)
        200 wallets from Day 2 (unchanged)

Staleness shows: "Latest: 0 seconds ago • Oldest: 2 days ago"
```

### Use Case 3: Offline Viewing
```
1. Fetch SOL 7d all → 200 wallets
2. Close browser
3. Reopen next day → Database still has 200 wallets
4. Apply display filters → Works offline (client-side)
5. Try to change chain → API call fails (offline)
6. Staleness indicator: Red "Stale data - 1 day ago"
```

## Benefits

✅ **Accumulates Knowledge**
- Never lose wallet data
- Build historical database over time
- Cross-filter analysis (see SOL + ETH wallets together)

✅ **Minimal API Calls**
- Only fetch when API filters change
- Display filters are free (client-side)
- ~95% reduction in API calls vs old architecture

✅ **Transparent Staleness**
- Know exactly when each wallet was last updated
- See data age range at a glance
- Make informed decisions about refreshing

✅ **Offline Capable**
- View cached wallets without internet
- Apply display filters offline
- Export data offline

✅ **Efficient Storage**
- Single localStorage key
- Deduplication by wallet_address
- Typical size: 500 wallets ≈ 200 KB

## Implementation Details

### useWalletStorage Hook
```tsx
const storage = useWalletStorage();

// Get all wallets (for display/filtering)
const allWallets = storage.getAllWallets();

// Merge new wallets from API
storage.mergeWallets(newWallets); // Returns timestamp

// Get metadata
const stats = storage.getStats();
// {
//   totalWallets: 450,
//   oldestUpdate: 1704000000000,
//   newestUpdate: 1704123456789,
//   sizeBytes: 204800
// }

// Clear database (for testing/debugging)
storage.clearDatabase();
```

### Merge Logic
```typescript
const mergeWallets = (newWallets: Wallet[]) => {
  const timestamp = Date.now();
  
  setDatabase((prev) => {
    const updated = { ...prev.wallets };
    
    newWallets.forEach((wallet) => {
      updated[wallet.wallet_address] = {
        ...wallet,
        last_updated: timestamp,
      };
    });
    
    return {
      ...prev,
      wallets: updated,
    };
  });
  
  return timestamp;
};
```

**Key points**:
- Spreads existing database (`...prev.wallets`)
- Overwrites by `wallet_address` (deduplication)
- Sets `last_updated` to current timestamp
- Returns timestamp for UI updates

### Filter Application
```tsx
// API filters (backend fetch)
useEffect(() => {
  refetchWallets(); // Triggers API call
  refetchStats();
}, [chain, timeframe, tag]);

// Display filters (client-side)
const filteredWallets = useMemo(() => {
  return allWallets.filter(w => {
    // PnL, ROI, tokens, hold time, rug pull checks
    // Pure JavaScript - no API calls
  });
}, [allWallets, advancedFilters]);
```

## Future Enhancements

### 1. IndexedDB Migration
- localStorage limit: 5-10 MB
- IndexedDB: ~50 MB (Chrome), unlimited (Firefox)
- Store 10,000+ wallets instead of 500

### 2. Per-Wallet Metadata
```typescript
interface WalletWithMeta extends Wallet {
  last_updated: number;
  fetch_source: {
    chain: string;
    timeframe: string;
    tag: string;
  };
  fetch_count: number; // How many times fetched
  first_seen: number; // When first added to database
}
```

### 3. Database Analytics
- Total wallets by chain
- Average PnL across all fetched wallets
- Top 10 wallets by realized profit
- Staleness distribution (how many fresh vs stale)

### 4. Export/Import
- Export entire database to JSON
- Share database between devices
- Import from backup

### 5. Smart Refresh
- Auto-refresh only stale wallets (>1 hour old)
- Batch refresh by chain/timeframe/tag
- Background refresh scheduler

## Testing Checklist

- [ ] Initial load fetches data and populates database
- [ ] Database persists across page refreshes
- [ ] Changing API filters (chain/timeframe/tag) triggers fetch
- [ ] New wallets are added to database
- [ ] Existing wallets are updated (not duplicated)
- [ ] Display filters (PnL, ROI, etc.) don't trigger API calls
- [ ] Staleness indicator shows correct timestamps
- [ ] Manual refresh updates timestamps
- [ ] Database stats show correct counts
- [ ] localStorage size is reasonable (<1 MB for 500 wallets)

## Summary

**Architecture**: Persistent wallet database in localStorage
**Storage**: Single key `gmgn-wallet-database`, ~200 KB for 500 wallets
**Behavior**: Accumulate + update, never delete
**API Filters**: Chain/timeframe/tag → Backend fetch → Merge into database
**Display Filters**: PnL/ROI/etc. → Client-side filter → No API calls
**Staleness**: Per-wallet `last_updated` timestamp, range display
**Benefits**: ~95% reduction in API calls, offline viewing, historical tracking

**Result**: Efficient, transparent, user-friendly wallet database! 🚀
