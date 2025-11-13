# TASKS - Implementation Roadmap

**Last Updated:** November 13, 2025  
**Current Sprint:** Issues 1-3 + Feature 4 Planning  

---

## TASK 1: Fix Cold Load 500 Error
**Issue:** Issue 1  
**Priority:** 🔴 HIGH  
**Status:** 🔵 NOT STARTED  
**Est. Time:** 2-4 hours  

### Description
Frontend fails to load wallets on first visit (500 error from `/api/wallets/db`). Backend is cold-starting on Render. User must manually refresh to see data.

### Root Cause Analysis
```
1. Render free tier spins down after 15 min inactivity
2. First request wakes backend (takes 5-10s to fully start)
3. During startup, `/api/wallets/db` endpoint returns 500
4. Frontend doesn't retry, shows empty dashboard
5. Second refresh succeeds (backend now warm)
```

### Solution Options

**Option A: Frontend Retry Logic (RECOMMENDED)**
```javascript
// frontend/src/app/page.tsx
async function loadFromSupabase() {
  const maxRetries = 3;
  const initialDelay = 1000; // 1s
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/wallets/db?chain=sol&limit=500');
      if (response.ok) return response.json();
      
      if (attempt < maxRetries) {
        const delay = initialDelay * Math.pow(2, attempt - 1); // exponential backoff
        await new Promise(r => setTimeout(r, delay));
      }
    } catch (error) {
      if (attempt === maxRetries) throw error;
      // retry
    }
  }
}
```

**Option B: Direct Supabase Client (FUTURE)**
- Frontend uses `@supabase/supabase-js` directly
- Eliminates backend dependency for initial load
- Requires public Supabase client key (lower security)

**Option C: Hybrid (RECOMMENDED LONG-TERM)**
- Try backend first (faster, more secure)
- Fallback to direct Supabase if backend fails
- Best of both worlds

### Acceptance Criteria
- [ ] First page load shows wallets (no 500 error)
- [ ] No manual refresh needed
- [ ] Console shows "[Page] Loaded X wallets from Supabase"
- [ ] Load time <3 seconds (even cold start)
- [ ] No breaking changes to existing code

### Implementation Steps
1. Add retry logic to `frontend/src/app/page.tsx` loadFromSupabase()
2. Test on fresh browser (incognito/private window)
3. Test after Render cold start (simulate with deploy)
4. Verify console logs show retries

### Files to Modify
- `frontend/src/app/page.tsx` - Add retry logic to loadFromSupabase()
- `frontend/src/hooks/useBackendKeepAlive.ts` - Ensure keep-alive working

### Related Issues
- Keep-alive ping (every 10 min) should help, but not eliminate cold start

---

## TASK 2: Create GMGN API Response Schema
**Issue:** Issue 2  
**Priority:** 🔴 HIGH  
**Status:** 🔵 NOT STARTED  
**Est. Time:** 1 hour  

### Description
Create a test script to fetch GMGN data and document the full response schema. Identify what fields are missing from database.

### Implementation Steps

1. **Create test script:**
```javascript
// backend/scripts/test-fetch.js
import { fetchGMGNData } from '../scraper/fetcher.js';

const result = await fetchGMGNData({ chain: 'sol', timeframe: '7d', tag: null, limit: 5 });
const wallet = result.data.rank[0];

console.log('=== FULL WALLET OBJECT ===');
console.log(JSON.stringify(wallet, null, 2));

console.log('\n=== WALLET KEYS ===');
console.log(Object.keys(wallet).sort());

console.log('\n=== DATA TYPES ===');
Object.entries(wallet).forEach(([key, value]) => {
  console.log(`${key}: ${typeof value} (${Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value})`);
});
```

2. **Run and capture output:**
```bash
cd backend
node scripts/test-fetch.js > /tmp/gmgn-schema.json
```

3. **Create schema documentation:**
```markdown
# GMGN API Response Schema

## Sample Wallet Object

Field | Type | Example | Currently Saved?
------|------|---------|------------------
address | string | "0x123..." | ✅
wallet_address | string | "0x123..." | ✅
pnl_7d | number | 0.25 | ✅
pnl_30d | number | 0.45 | ✅
realized_profit_7d | number | 5000 | ✅
daily_profit_7d | array | [{timestamp, profit}] | ❌ MISSING!
risk.token_honeypot | string | "2" | ❌ MISSING!
risk.token_honeypot_ratio | number | 0.1 | ❌ MISSING!
... (more fields)
```

### Acceptance Criteria
- [ ] test-fetch.js script created
- [ ] Full GMGN response captured
- [ ] Schema document created at `docs/GMGN_SCHEMA.md`
- [ ] All fields listed with types and "saved?" status
- [ ] Missing fields identified (e.g., daily_profit_7d, risk metrics)

### Files to Create
- `backend/scripts/test-fetch.js` - Test script
- `docs/GMGN_SCHEMA.md` - Full schema documentation

---

## TASK 3: Fix Incomplete Wallet Data
**Issue:** Issue 2  
**Priority:** 🔴 HIGH  
**Status:** 🔵 NOT STARTED  
**Est. Time:** 2 hours  

### Description
Many wallets show incomplete data in the table (missing Daily Profit, Risk Analysis). Fix the data flow to capture all GMGN API fields in Supabase.

### Root Cause
The `wallet.data` JSON column in Supabase only contains fields explicitly saved in sync.js. If GMGN API returns new fields, they're not captured.

### Solution

**Current Flow (sync.js):**
```javascript
const fullData = wallet; // This is correct - should have everything

// Prepare wallet for batch upsert
walletsToBatch.push({
  wallet_address,
  chain,
  data: fullData,        // ← Should have ALL fields
  metadata,
});
```

**Fix:** Verify that `fullData` contains all GMGN fields, not a subset.

### Investigation Steps

1. **Check what sync.js saves:**
```bash
# Query one wallet from Supabase
SELECT data FROM wallets LIMIT 1;
# Examine: does it have daily_profit_7d, risk, etc.?
```

2. **Compare with GMGN API response:**
```bash
# Run test-fetch.js
# Compare fields between GMGN response and database record
```

3. **If missing fields:**
   - Update extractMetadata() to include all fields
   - Re-sync wallets to Supabase
   - Verify frontend displays properly

### Acceptance Criteria
- [ ] All GMGN API fields saved in Supabase `wallet.data`
- [ ] Daily Profit 7d displays for all wallets
- [ ] Risk Analysis displays for all wallets
- [ ] No "N/A" or missing data in table
- [ ] Schema verified against GMGN API response

### Files to Modify
- `backend/routes/sync.js` - Ensure all fields captured
- `backend/scraper/fetcher.js` - Log full response

### Related Tasks
- TASK 2 (schema discovery) - Run first

---

## TASK 4: Add Win Rate Filter
**Issue:** Issue 3  
**Priority:** 🟡 MEDIUM  
**Status:** 🔵 NOT STARTED  
**Est. Time:** 1.5 hours  

### Description
Add a min-max slider filter for win rate (0-100%) to the Advanced Filters panel.

### Implementation Steps

1. **Update filter types** (`frontend/src/app/page.tsx`):
```typescript
interface AdvancedFilterValues {
  pnlMin: number;
  pnlMax: number;
  // ... existing ...
  winRateMin: number;  // ADD
  winRateMax: number;  // ADD
}

const DEFAULT_ADVANCED_FILTERS = {
  // ... existing ...
  winRateMin: 0,
  winRateMax: 100,
};
```

2. **Add filter UI** (`frontend/src/components/AdvancedFilters.tsx`):
```tsx
{/* Win Rate Filter */}
<div>
  <Label>Win Rate (%)</Label>
  <div className="flex gap-2">
    <Input
      type="number"
      min="0"
      max="100"
      value={values.winRateMin}
      onChange={(e) => onChange({...values, winRateMin: parseFloat(e.target.value)})}
      placeholder="Min"
    />
    <Input
      type="number"
      min="0"
      max="100"
      value={values.winRateMax}
      onChange={(e) => onChange({...values, winRateMax: parseFloat(e.target.value)})}
      placeholder="Max"
    />
  </div>
</div>
```

3. **Apply filter** (`frontend/src/app/page.tsx`):
```typescript
filtered = filtered.filter((w, index) => {
  // ... existing filters ...
  
  // Win Rate filter
  const winRatePercent = (w.winrate_7d || 0) * 100;
  if (winRatePercent < advancedFilters.winRateMin || 
      winRatePercent > advancedFilters.winRateMax) {
    return false;
  }
  
  return true;
});
```

### Acceptance Criteria
- [ ] Win rate slider visible in Advanced Filters
- [ ] Min/Max inputs work (0-100 range)
- [ ] Table updates when filter changes
- [ ] Filter persists in state
- [ ] Default values correct (0-100%)

### Files to Modify
- `frontend/src/app/page.tsx` - Add filter state and logic
- `frontend/src/components/AdvancedFilters.tsx` - Add UI

### Testing
- Set min=50, max=100 → Table shows only 50%+ win rate
- Set min=0, max=75 → Table shows only <75% win rate
- Reset to 0-100 → Shows all wallets

---

## TASK 5: Plan Tracked Wallets System
**Issue:** Feature 4 (Tracked Wallets)  
**Priority:** 🟡 MEDIUM  
**Status:** 🔵 NOT STARTED  
**Est. Time:** 2 hours (planning only - implementation pending API context)  

### Description
Design a "tracked/favourited wallets" system allowing users to bookmark wallets for monitoring.

### Current Status: BLOCKED
⚠️ **Cannot implement until user provides:**
- [ ] New API sources (portfolio data APIs)
- [ ] API response examples (what data structure?)
- [ ] Portfolio data requirements (what fields?)
- [ ] UX specifications (where's the button? how does it look?)
- [ ] Limits/constraints (max tracked wallets?)

### High-Level Design (Subject to Change)

**Pages:**
- Main Dashboard (existing) + "Add to Tracked" button
- New "/tracked" page showing tracked wallets only

**Storage:**
- localStorage: wallet addresses to track
- localStorage: cached portfolio data (refreshable)

**Data Flow:**
```
Dashboard table row → Select checkbox → "Add to Tracked" button
                              ↓
                  Save address to localStorage
                              ↓
Navigate to /tracked page
                              ↓
Load tracked addresses from localStorage
                              ↓
Fetch portfolio data from new APIs
                              ↓
Display in table + enhanced modal
```

**UI Components Needed:**
- [ ] Checkbox selection in WalletTable
- [ ] "Add to Tracked" button/action
- [ ] New TrackedWallets page (`/tracked`)
- [ ] Enhanced modal showing portfolio data
- [ ] Remove from tracked action

**Data Structure:**
```json
{
  "tracked_wallets": {
    "0x123abc...": {
      "added_at": "ISO timestamp",
      "notes": "optional notes",
      "last_synced": "ISO timestamp"
    }
  },
  "tracked_wallets_cache": {
    "0x123abc...": {
      "portfolio": {...},
      "transactions": [...],
      "fetched_at": "ISO timestamp"
    }
  }
}
```

### BLOCKED UNTIL USER PROVIDES

1. **API Sources & Examples**
   - Which APIs for portfolio data?
   - Rate limits?
   - Authentication?
   - Response structure example?

2. **Portfolio Data Spec**
   - What tokens to track?
   - Include historical data?
   - Transaction types?
   - Performance metrics?

3. **UX Specifications**
   - Button placement/style?
   - Max tracked wallets?
   - Refresh/sync frequency?
   - Delete confirmation?

4. **Modal Enhancements**
   - What new sections to show?
   - Portfolio holdings table?
   - Transaction history?
   - Charts/graphs?

### Waiting For Input
Please provide:
```
[USER INPUT NEEDED]
1. API sources and examples
2. Expected data structure
3. UI/UX preferences
4. Constraints and limits
```

---

## TASK 6: Implement Tracked Wallets UI
**Issue:** Feature 4 (Tracked Wallets)  
**Priority:** 🟡 MEDIUM  
**Status:** 🔵 BLOCKED (waiting for Task 5 clarification)  
**Est. Time:** 4-6 hours  

### Description
Build the UI components for the tracked wallets system (after API context is provided).

### Will Include
- [ ] Checkbox selection in WalletTable
- [ ] "Add to Tracked" button
- [ ] TrackedWallets page (`/tracked`)
- [ ] Enhanced modal
- [ ] localStorage management hook

### Depends On
- [ ] TASK 5 (planning - blocked until API context)
- [ ] User providing API sources and UX specs

---

## TASK 7: Integrate Portfolio APIs
**Issue:** Feature 4 (Tracked Wallets)  
**Priority:** 🟡 MEDIUM  
**Status:** 🔵 BLOCKED (waiting for API context)  
**Est. Time:** 4-8 hours  

### Description
Integrate new API sources to fetch portfolio data for tracked wallets.

### Will Depend On
- [ ] API authentication/credentials
- [ ] API response structure
- [ ] Rate limiting strategy
- [ ] Caching strategy

---

## Priority & Sequencing

```
IMMEDIATE (This Session):
1. TASK 1 - Fix cold load (HIGH)
2. TASK 2 - Create schema (HIGH) 
3. TASK 3 - Fix wallet data (HIGH)
4. TASK 4 - Add win rate filter (MEDIUM)

NEXT SESSION:
5. TASK 5 - Plan tracked wallets (MEDIUM - blocked)
   ↳ Get API context from user
6. TASK 6 - Build UI (MEDIUM - depends on 5)
7. TASK 7 - Integrate APIs (MEDIUM - depends on 5)
```

---

## Completion Tracking

| Task | Status | Blockers | Notes |
|------|--------|----------|-------|
| 1 | 🔵 NOT STARTED | None | Ready to implement |
| 2 | 🔵 NOT STARTED | None | Ready to implement |
| 3 | 🔵 NOT STARTED | Task 2 | Depends on schema |
| 4 | 🔵 NOT STARTED | None | Ready to implement |
| 5 | 🔵 BLOCKED | User input | Needs API context |
| 6 | 🔵 BLOCKED | Task 5 | Depends on planning |
| 7 | 🔵 BLOCKED | Task 5 | Depends on planning |

---

## Questions for User

Before implementing TASK 5-7, please clarify:

1. **API Sources** (Required)
   - What APIs provide wallet portfolio data?
   - Examples: CoinGecko, Solscan, Jupiter, DeFi Llama?
   - API keys needed?

2. **Data Requirements** (Required)
   - What wallet metrics to track?
   - Historical or current holdings only?
   - Transaction types (buy/sell/swap)?
   - Performance vs. portfolio breakdown?

3. **UX Design** (Required)
   - Where does "Add to Tracked" button appear?
   - How many wallets max?
   - Auto-refresh interval?
   - What's shown in the tracked modal?

4. **Constraints** (Required)
   - API call limits per user?
   - Cache expiry for portfolio data?
   - Storage limits (localStorage)?
   - Any UI mockups/designs?

