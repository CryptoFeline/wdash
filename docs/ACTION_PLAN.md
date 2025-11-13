# ACTION PLAN - Dashboard Improvements & New Features

**Status:** Active Planning  
**Date:** November 13, 2025  
**Priority:** High  

---

## Issues Overview

### Issue 1: Cold Load 500 Error & Render Wake-Up Needed
**Severity:** High | **Impact:** UX - Empty dashboard on first load  
**Root Cause:** Backend not fully warm on first request; frontend tries to access `/api/wallets/db` before backend is ready

**Current Flow:**
```
1. Frontend loads → Tries /api/wallets/db (500 error - backend cold starting)
2. User refreshes → Backend now warm → /api/wallets/db succeeds (loads 500 wallets)
```

**Problem:** User sees empty dashboard on first visit, needs manual refresh

**Proposed Solutions:**
- [ ] **Solution A:** Add retry logic to frontend Supabase load (exponential backoff)
- [ ] **Solution B:** Pre-warm backend on Netlify deploy via health check
- [ ] **Solution C:** Use direct Supabase client on frontend (no backend proxy) for initial load
- [ ] **Solution D:** Hybrid approach - try backend, fallback to direct Supabase client

**Architecture Question:** Should frontend access Supabase directly?
- **Current:** Frontend → Backend (via API route) → Supabase  
- **Proposed:** Frontend → Supabase (direct with JWT) + Backend keeps secure queries  
- **Tradeoff:** Direct Supabase is faster but exposes service key

---

### Issue 2: Incomplete Wallet Data in Database
**Severity:** High | **Impact:** Missing analytics data (Daily Profit, Risk metrics)  
**Root Cause:** Not all fields from GMGN API response are being saved to database

**Investigation Tasks:**
- [ ] Create test script (`test-fetch.js`) to run backend fetcher
- [ ] Examine full GMGN API JSON response structure
- [ ] Document all available fields in GMGN response
- [ ] Compare with what's being saved in `wallet.data` (Supabase)
- [ ] Identify missing fields (likely: `daily_profit_7d`, `risk` object)
- [ ] Update sync.js to capture all fields
- [ ] Verify Supabase schema can store full JSON

**Expected Outcome:** Schema document showing all 50+ wallet fields and what's missing

---

### Issue 3: Win Rate Filter (Min-Max)
**Severity:** Medium | **Impact:** UX - Can't filter by win rate  
**Task:** Add win rate slider filter (0-100%) to Advanced Filters

**Files to Modify:**
- `frontend/src/components/AdvancedFilters.tsx` - Add winRateMin/Max fields
- `frontend/src/components/FilterBar.tsx` - Pass through to filter logic
- `frontend/src/app/page.tsx` - Apply filter in useMemo

**Implementation:**
```typescript
// New filter values
const [advancedFilters, setAdvancedFilters] = useState({
  // ... existing filters
  winRateMin: 0,      // 0%
  winRateMax: 100,    // 100%
});

// Apply in wallet filter logic
filtered = filtered.filter(w => 
  w.winrate_7d >= advancedFilters.winRateMin / 100 &&
  w.winrate_7d <= advancedFilters.winRateMax / 100
);
```

---

## Feature 4: Tracked/Favourited Wallets System

**Severity:** Medium | **Impact:** UX - Allow users to bookmark wallets for monitoring  
**Scope:** New page + data fetching + storage  

### High-Level Architecture

```
┌─ Main Dashboard
│  ├─ Wallet Table (existing)
│  ├─ Row selection (checkboxes)
│  └─ "Add to Tracked" button
│
└─ Tracked Wallets Page (NEW)
   ├─ Table view (same style as dashboard)
   ├─ Fetch portfolio data for tracked wallets (from new APIs)
   ├─ Store API data locally (IndexedDB or localStorage)
   └─ Enhanced modal on row click (show token holdings, transactions, etc.)
```

### Data Flow

```
User selects wallet in dashboard
         ↓
Click "Add to Tracked" button
         ↓
Save wallet_address to localStorage (key: "tracked_wallets")
         ↓
Navigate to /tracked page
         ↓
Load tracked wallet addresses from localStorage
         ↓
Fetch additional data from new APIs:
  - Portfolio (tokens owned, balances)
  - Transaction history
  - Trading metrics
         ↓
Display in enhanced modal
```

### Storage Strategy

**localStorage structure:**
```json
{
  "tracked_wallets": {
    "0x123abc...": {
      "added_at": "2025-11-13T12:00:00Z",
      "notes": "Promising trader",
      "last_synced": "2025-11-13T12:30:00Z"
    },
    "0x456def...": {
      "added_at": "2025-11-13T12:05:00Z"
    }
  },
  "tracked_wallets_cache": {
    "0x123abc...": {
      "portfolio": { ... },
      "transactions": [ ... ],
      "fetched_at": "2025-11-13T12:30:00Z"
    }
  }
}
```

### Required Context (Pending from User)

⚠️ **MISSING INFORMATION - Request Clarification:**

1. **What are the new API sources?**
   - Which APIs provide portfolio/token data?
   - What's the data structure we need?
   - Rate limits and auth requirements?

2. **Portfolio data details:**
   - What tokens should we track?
   - Current holdings only, or historical?
   - Transaction types to include?

3. **UI/UX specifics:**
   - Where should "Add to Tracked" button appear?
   - Should we show tracked count badge?
   - Delete/remove from tracked action?
   - Sync interval for refreshing API data?

4. **Limits:**
   - Max tracked wallets per user?
   - Max API calls per session?
   - Cache expiry for portfolio data?

---

## Summary of Work Items

| # | Task | Issue | Priority | Est. Time |
|---|------|-------|----------|-----------|
| 1 | Fix cold load 500 error | Issue 1 | HIGH | 2-4h |
| 2 | Create test-fetch.js script | Issue 2 | HIGH | 1h |
| 3 | Audit wallet data completeness | Issue 2 | HIGH | 2h |
| 4 | Add win rate filter | Issue 3 | MEDIUM | 1.5h |
| 5 | Plan tracked wallets system | Feature 4 | MEDIUM | 2h (planning) |
| 6 | Build tracked wallets UI | Feature 4 | MEDIUM | 4-6h (after API context) |
| 7 | Integrate portfolio APIs | Feature 4 | MEDIUM | 4-8h (depends on APIs) |

---

## Next Steps

1. **Immediate:** Investigate Issue 1 (cold load)
2. **Quick Win:** Add win rate filter (Issue 3)
3. **High Impact:** Fix wallet data (Issue 2)
4. **Future:** Implement tracked wallets (Feature 4 - needs API context first)

**Total Estimated Time:** 14-20 hours (without Feature 4 API integration)

---

## Acceptance Criteria

### Issue 1 - RESOLVED when:
- [ ] First page load shows wallets without 500 error
- [ ] No manual refresh needed
- [ ] <3s load time even on cold start

### Issue 2 - RESOLVED when:
- [ ] Daily Profit 7d displays for all wallets
- [ ] Risk Analysis shows for all wallets
- [ ] Schema document created and verified
- [ ] All GMGN API fields captured

### Issue 3 - RESOLVED when:
- [ ] Win rate slider appears in Advanced Filters
- [ ] Filter works (0-100% range)
- [ ] Wallet table updates on change

### Feature 4 - RESOLVED when:
- [ ] Tracked wallets page exists
- [ ] Users can select/deselect wallets
- [ ] Portfolio data fetches and displays
- [ ] Data persists in localStorage

