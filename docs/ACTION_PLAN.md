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

**USER SOLUTION:**
- ✅ **Implement Solution E:** On frontend load (if it's the first time, and we don't have cache already) we immediately ping /health endpoint of backend to wake it up, then display a modal with backdrop blur saying "Backend is loading", then proceed to test backend every 5 seconds - if backend properly responds, we hide the modal and load the dashboard normally. This ensures users are informed and do not see an empty dashboard.
---

### Issue 2: Incomplete Wallet Data in Database
**Severity:** High | **Impact:** Missing analytics data (Daily Profit, Risk metrics)  
**Root Cause:** Not all fields from GMGN API response are being saved to database (case may vary based on investigation)

**Investigation Tasks:**
- [ ] Create test script (`test-fetch.js`) to run backend fetcher
- [ ] Examine full GMGN API JSON response structure (and per wallet data)
- [ ] Document all available fields in GMGN response - unified
- [ ] Compare with what's being saved in `wallet.data` (Supabase)
- [ ] Identify missing fields (likely: `daily_profit_7d`, `risk` object)
- [ ] Update sync.js to capture all fields properly
- [ ] Verify Supabase schema can store full JSON
- [ ] Verify new data is properly received when displaying

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

- Set slider range 0-100%, step 1%, default limit is 65% (we show values above 65%)

---

## Feature 4: Tracked/Favourited Wallets System

**Severity:** Medium | **Impact:** UX - Allow users to bookmark wallets for monitoring  
**Scope:** New page + data fetching + storage  

### High-Level Architecture

```
┌─ Main Dashboard
│  ├─ Wallet Table (existing)
│  ├─ Row selection (checkboxes - existing for data download)
│  └─ Add an icon button before first column row selection (new)
│
└─ Tracked Wallets Page (NEW)
   ├─ Table view (same style as dashboard table)
   ├─ Same data displayed as dashboard for selected wallets (same as dashboard table)
   ├─ Fetch portfolio data for tracked wallets only (from new APIs)
   ├─ Store API data locally (IndexedDB and localStorage)
   └─ Enhanced modal on row click (show token holdings, transactions, etc. - TBD!)
```

### Data Flow

```
User selects wallet(s) in main dashboard
         ↓
Click icon button - we use lucide bookmarkPlus (grey) to add, which turns into bookmarkCheck (green) to show tracked (on bookmarkChecked click we untrack the wallet - it's a toggle)
         ↓
Save tracked_wallet_address to localStorage (key: "tracked_wallets")
         ↓
Add "Tracked Wallets" button to header - on click navigate to /tracked page
         ↓
Load tracked wallet addresses from localStorage's tracked_wallet_wallets
         ↓
Fetch additional data from new APIs for tracked_wallet_address:
  - Portfolio (tokens owned/traded, balances)
  - Transaction history (swaps)
  - Trading metrics (PnL, ROI, etc.)
  - Trading analytics (per-token trade patterns: when bought/sold, how much, how long, what gain, etc. - we may need token price API for this)
         ↓
Display in enhanced modal - design proper UI/UX for this
```

### Storage Strategy

**localStorage structure:**
```json
{
  "tracked_wallets": {
    "0x123abc...": {
      "added_at": "2025-11-13T12:00:00Z", // when user added to tracked
      "last_synced": "2025-11-13T12:30:00Z", // last time we fetched API data
      "synced_data": { ... }, // Supabase wallet data (from main dashboard)
      "tracked_wallets_data": { // Newly fetched portfolio/transaction data (new API)
        "portfolio": { ... }, // Tokens held/traded, balances
        "transactions": [ ... ], // Array of transaction objects
        "metrics": { ... }, // PnL, ROI, etc.
        "analytics": { ... }, // Trade patterns, etc.
        "fetched_at": "2025-11-13T12:30:00Z"
        }
    },
    "0x456def...": { ... }
  }
}
```

### Required Context (Pending from User)

⚠️ **MISSING INFORMATION - Request Clarification:**

1. **What are the new API sources?**
   - Which APIs provide portfolio/token data?
       + API sources seen in docs/OKX_API_DOCS.md
   - What's the data structure we need?
       + See in docs/OKX_API_DOCS.md
   - Rate limits and auth requirements?
       + No auth for GET requests, but POST needs structured curl
       + Rate limit is unknown - need testing
       + Endpoints are private APIs used by OKX explorer site (not public, but we can use)

2. **Portfolio data details:**
   - What tokens should we track?
       + All tokens traded within the past 7 days
   - Current holdings only, or historical?
       + Both
   - Transaction types to include?
       + Buys and Sells (transfer in/out can be detected from PnL context, e.g. if wallet sold + hold is more than bought it means it received tokens, if wallet bought more than sold + held it means it sent tokens out)
   - Assess all possible fields from API responses for portfolio/transactions/metrics and propose a data display structure (we will select what to keep what to ditch) 

3. **UI/UX specifics:**
   - Where should the Tracked icon button appear?
       + very first column before row selection checkbox
   - Should we show tracked count badge?
       + in the Tracked Wallets page header
   - Delete/remove from tracked action?
       + Use the tracker icon toggle (we track/untrack on toggle)
   - Sync interval for refreshing API data?
       + rolling sync every X sec - but not all at once, wallet by wallet with a 1 sec delay
       + "X sec" is based on the amount of wallets tracked, if 10 wallets are tracked we roll sync a wallet every 10 sec, if we have 60 wallets tracked we roll sync a wallet every 60 sec. Min sync is 10 sec per wallet.

4. **Limits:**
   - Max tracked wallets per user?
       + None (as many as cache can hold)
   - Max API calls per session?
       + TBD based on rate limits discovered during testing
   - Cache expiry for portfolio data?
       + Data keeps updating in the rolling sync every "X sec", if the user loads page with existing cached tracked wallet data it restarts the sync from there.

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

