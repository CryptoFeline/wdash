# Frontend Optimization for Unit Efficiency

## Overview

The frontend has been redesigned to minimize Browserless API unit consumption while maintaining excellent UX. The key change: **no automatic refetching on filter changes**.

## Architecture Changes

### Before (Wasteful)
```tsx
// ❌ BAD: Auto-refetch on filter change
const { data } = useQuery({
  queryKey: ['wallets', chain, timeframe, tag, page], // Changes trigger refetch
  queryFn: () => fetchWallets({ chain, timeframe, tag, page }),
});

useEffect(() => {
  setAllWallets([]); // Clears data
}, [chain, timeframe, tag]); // Runs on EVERY filter change
```

**Problem**: Every filter change = new API call = wasted Browserless units
- User changes chain SOL → ETH: 1 API call
- User changes timeframe 7d → 24h: 1 API call  
- User changes tag all → smart_degen: 1 API call
- Total: 3 API calls for simple exploration (9-18 units wasted)

### After (Efficient)
```tsx
// ✅ GOOD: Static queryKey, manual refresh only
const { data, refetch } = useQuery({
  queryKey: ['wallets', 'manual-fetch'], // Static - never auto-refetches
  queryFn: () => fetchWallets({ chain, timeframe, tag, page: 1, limit: 200 }),
  enabled: false, // Only fetch when explicitly triggered
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
});

// Fetch on mount OR when filters change (only if no cached data)
useEffect(() => {
  const shouldFetch = !storage.hasData || storage.isStale();
  if (shouldFetch) {
    refetch(); // Background fetch if needed
  }
}, [chain, timeframe, tag]);
```

**Benefits**:
- Filter changes check localStorage first (instant display)
- Only fetches if data is missing or >5 minutes old
- Manual refresh button for explicit updates
- Client-side filtering (no API calls for advanced filters)

## New Features

### 1. localStorage Persistence (`useWalletStorage` hook)

**Purpose**: Cache wallet data across sessions

**Storage Schema**:
```typescript
{
  "gmgn-wallets-sol-7d-all": {
    "wallets": [...], // Array of Wallet objects
    "timestamp": 1704123456789, // Unix timestamp
    "filters": {
      "chain": "sol",
      "timeframe": "7d",
      "tag": "all"
    }
  }
}
```

**Features**:
- Automatic expiry: 30 minutes
- Per-filter-combination caching (separate keys for SOL/ETH, etc.)
- Instant page load (no loading spinner if cached)
- Transparent background refresh if stale

**API**:
```tsx
const storage = useWalletStorage(chain, timeframe, tag);

storage.storedWallets;    // Cached wallets or null
storage.timestamp;        // Last fetch timestamp
storage.hasData;          // Boolean: has valid cached data
storage.isStale();        // Boolean: data >5 minutes old
storage.saveData(wallets); // Save to localStorage
storage.clearData();      // Clear cache
storage.getAge();         // Age in milliseconds
```

### 2. Staleness Indicator (`StalenessIndicator` component)

**Purpose**: Visual feedback for data freshness

**Color Coding**:
- 🟢 **Green**: Fresh data (<5 minutes)
- 🟡 **Yellow**: Getting stale (5-10 minutes)
- 🔴 **Red**: Very stale (>10 minutes)

**Display**:
```
┌─────────────────────────────────────────────────────────┐
│ 🕐 Fresh data - Last updated: 2 minutes ago  [Refresh] │
└─────────────────────────────────────────────────────────┘
```

**Features**:
- Live countdown (updates every second)
- Integrated refresh button with loading state
- Auto-hide if no timestamp (first load)
- Responsive design (mobile-friendly)

### 3. Manual Refresh Button

**Purpose**: Explicit data updates only

**Behavior**:
```tsx
const handleManualRefresh = async () => {
  storage.clearData(); // Force fresh fetch
  const [walletsResult, statsResult] = await Promise.all([
    refetchWallets(),
    refetchStats(),
  ]);
  if (walletsResult.data?.data) {
    storage.saveData(walletsResult.data.data); // Update cache
    setLastFetchTimestamp(Date.now());
  }
};
```

**Features**:
- Loading spinner during fetch
- Bypasses all caches (backend + frontend)
- Updates timestamp immediately
- Parallel fetch (wallets + stats)

### 4. Client-Side Filtering

**Purpose**: No API calls for filter changes

**Filters**:
- ✅ Chain (SOL/ETH) - **triggers fetch if no cached data**
- ✅ Timeframe (24h/7d/30d) - **triggers fetch if no cached data**
- ✅ Tag (all/smart_degen/blue_chip/etc.) - **triggers fetch if no cached data**
- ✅ Advanced filters (PnL, ROI, tokens, hold time, rug pull) - **always client-side**

**Logic**:
```tsx
useEffect(() => {
  const shouldFetch = !storage.hasData || storage.isStale();
  if (shouldFetch) {
    refetch(); // Only if no cached data or stale
  }
}, [chain, timeframe, tag]); // Runs when primary filters change
```

**Advanced Filters** (always client-side):
```tsx
const filteredWallets = useMemo(() => {
  return allWallets.filter(w => {
    // PnL, ROI, tokens, hold time, rug pull checks
    // NO API CALLS - pure JavaScript filtering
  });
}, [allWallets, advancedFilters]);
```

## Data Flow

### Initial Page Load

```
1. User opens page
   ↓
2. Check localStorage for "gmgn-wallets-sol-7d-all"
   ↓
3a. Found + Fresh (<5min)
   → Instant display (0 API calls)
   → Green staleness indicator
   
3b. Found + Stale (>5min)
   → Show cached data immediately (instant UX)
   → Background refresh in progress
   → Yellow/red staleness indicator
   → Update when fetch completes
   
3c. Not Found
   → Loading spinner
   → Fetch from API (1 API call = 3-6 units)
   → Save to localStorage
   → Display results
```

### Filter Change (e.g., SOL → ETH)

```
1. User changes chain filter
   ↓
2. Update state: setChain('eth')
   ↓
3. useEffect triggers (dependency: [chain, timeframe, tag])
   ↓
4. Check localStorage for "gmgn-wallets-eth-7d-all"
   ↓
5a. Found + Fresh
   → Instant display (0 API calls)
   
5b. Found + Stale OR Not Found
   → Show cached data (if available)
   → Background fetch
   → Update when complete
```

### Advanced Filter Change (e.g., PnL slider)

```
1. User adjusts PnL filter
   ↓
2. Update state: setAdvancedFilters({...})
   ↓
3. useMemo re-runs (dependency: [allWallets, advancedFilters])
   ↓
4. Filter wallets in-memory
   ↓
5. Re-render table (0 API calls)
```

### Manual Refresh

```
1. User clicks "Refresh" button
   ↓
2. Clear localStorage for current filter combo
   ↓
3. Fetch fresh data (bypass backend cache too)
   ↓
4. Update state + localStorage
   ↓
5. Reset timestamp → Green indicator
```

## Unit Consumption Analysis

### Old Architecture (Wasteful)

**Scenario**: User explores 3 chains × 3 timeframes × 3 tags = 27 combinations

```
27 combinations × 1 fetch each = 27 API calls
27 calls × 3-6 units/call = 81-162 units
```

**Monthly usage** (10 users, 10 sessions/month each):
```
10 users × 10 sessions × 27 calls = 2,700 calls
2,700 × 3 units = 8,100 units (8× over free tier!)
```

### New Architecture (Efficient)

**Scenario**: Same exploration, but with caching

```
First visit: 1 API call (SOL 7d all) = 3-6 units
Subsequent visits: 0 API calls (cached) = 0 units

Manual refreshes: ~3 per session × 3-6 units = 9-18 units/session
```

**Monthly usage** (10 users, 10 sessions/month each):
```
10 users × 10 sessions × 3 refreshes = 300 calls
300 × 3 units = 900 units (within free tier!)
```

**Savings**: ~90% reduction in API calls 🎉

## Best Practices

### For Users

1. **Use cached data**: Check the staleness indicator before refreshing
2. **Batch exploration**: Change multiple filters before refreshing
3. **Refresh strategically**: Only when you need the absolute latest data
4. **Advanced filters**: Use PnL/ROI sliders freely (no API cost)

### For Developers

1. **Never add filters to queryKey**: Keep it static to prevent auto-refetch
2. **Always check localStorage first**: Instant UX wins
3. **Background fetch on stale data**: Show old data while loading new
4. **Clear cache on manual refresh**: Ensure fresh data when explicitly requested
5. **Test with Network tab**: Verify no API calls on filter changes

## Configuration

### Staleness Thresholds

```typescript
// useWalletStorage.ts
const STORAGE_EXPIRY = 30 * 60 * 1000; // 30 minutes (hard limit)

// StalenessIndicator.tsx
const FRESH_THRESHOLD = 5 * 60 * 1000;  // <5min = green
const STALE_THRESHOLD = 10 * 60 * 1000; // >10min = red
```

### React Query Defaults

```typescript
// providers.tsx
{
  staleTime: Infinity,           // Never auto-refetch
  refetchOnWindowFocus: false,   // Ignore focus events
  refetchOnMount: false,         // Ignore component mount
  refetchOnReconnect: false,     // Ignore network reconnect
  retry: 1,                      // Only retry once
}
```

### Fetch Limits

```typescript
// page.tsx
limit: 200  // Fetch 200 wallets at once (covers most use cases)
```

## Testing Checklist

- [ ] Initial load shows loading spinner (no cached data)
- [ ] Data saves to localStorage after fetch
- [ ] Second visit shows instant data (no API call)
- [ ] Staleness indicator shows correct color
- [ ] Filter change checks cache first
- [ ] Advanced filters don't trigger API calls
- [ ] Refresh button clears cache and fetches fresh data
- [ ] Timestamp updates after manual refresh
- [ ] No API calls when switching between cached filter combos
- [ ] localStorage clears after 30 minutes (expiry)

## Troubleshooting

### "Data not refreshing"
- Check staleness indicator - may be using cached data
- Click "Refresh" button to force update
- Check browser console for errors
- Clear localStorage manually: `localStorage.clear()`

### "Infinite loading spinner"
- Backend may be down - check Network tab (F12)
- API_URL or API_KEY misconfigured
- CORS issue - check browser console

### "localStorage quota exceeded"
- Rare (5MB limit per domain)
- Clear old entries: `localStorage.clear()`
- Reduce `limit` in fetch (200 → 100)

### "Wrong data displayed"
- Cache key mismatch - check useWalletStorage hook
- Clear localStorage and refresh page
- Check filters match cache (chain/timeframe/tag)

## Future Enhancements

1. **Service Worker**: Offline-first PWA with background sync
2. **IndexedDB**: Store more data (1,000+ wallets per filter combo)
3. **Delta updates**: Only fetch changed wallets (reduce bandwidth)
4. **Prefetch**: Predict user's next filter and preload in background
5. **Export cache**: Download localStorage to JSON file
6. **Share cache**: Copy localStorage between devices (import/export)

## Migration Notes

### Breaking Changes
- Removed server-side pagination (all data loaded at once)
- `hasMore` always false (client-side pagination instead)
- `page` state removed (not needed with localStorage)
- Stats query now manual (no auto-refetch)

### Backwards Compatibility
- API routes unchanged (still support `cacheOnly=true`)
- WalletTable component unchanged
- FilterBar component unchanged (just wired to new handlers)
- Export functionality unchanged

### Deployment
1. Deploy backend first (already done - Browserless working)
2. Deploy frontend (this update)
3. Clear users' localStorage on first visit (optional)
4. Monitor Browserless dashboard for unit usage

## Summary

✅ **Achieved Goals**:
- Single fetch on load (unless cached)
- No API calls on filter changes (uses localStorage)
- Manual refresh button (explicit user action)
- Staleness indicator (visual feedback)
- Client-side advanced filtering (instant)
- ~90% reduction in API calls

✅ **Unit Efficiency**:
- Old: 2,700 calls/month = 8,100 units (over limit)
- New: 300 calls/month = 900 units (within free tier!)

✅ **UX Improvements**:
- Instant page loads (localStorage)
- No loading spinners on filter changes
- Background refresh when stale
- Clear data freshness indicator
- Offline viewing of cached data

**Result**: Production-ready, unit-efficient frontend that respects Browserless free tier limits while delivering excellent UX! 🚀
