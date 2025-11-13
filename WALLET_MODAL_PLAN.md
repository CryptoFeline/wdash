# Wallet Detail Modal - Implementation Plan

## Current State
- ✅ Main dashboard loads wallets from GMGN API
- ✅ Wallets cached in localStorage
- ✅ User can bookmark wallets
- ✅ Tracked page shows bookmarked wallets
- ❌ Sync engine trying to fetch from Supabase (WRONG - data already cached)
- ❌ No modal for wallet details
- ❌ No OKX API integration for detailed data

## What We Need

### Step 1: Disable Broken Sync Engine
- [x] Disable useSyncEngine in tracked page  
- [ ] Remove sync engine UI components
- [ ] Backend: No changes needed (sync endpoint can stay for future use)

### Step 2: Create Wallet Detail Modal
**Trigger:** Click on wallet row in tracked wallets table

**Modal Components:**
1. Header: Wallet address, copy button, external link
2. Summary Cards: PnL, Win Rate, ROI, Volume
3. Top Tokens Tab: Best performing tokens with PnL/ROI
4. Holdings Tab: Current token holdings with values
5. Trading History Tab: Recent buy/sell transactions
6. Analytics Tab: Charts, win rate distribution, market cap preferences

### Step 3: Implement OKX API Fetching
**Backend Route:** `GET /api/okx/wallet/:address`

**OKX Endpoints to Call:**
1. **Endpoint 1** - Wallet Profile Summary
   - URL: `/priapi/v1/dx/market/v2/pnl/wallet-profile/summary`
   - Params: periodType, chainId, walletAddress
   - Returns: PnL, win rate, top tokens, volume stats

2. **Endpoint 4a** - Token Holdings  
   - URL: `/priapi/v1/dx/market/v2/pnl/token/list/holding`
   - Returns: Current token holdings with balances

3. **Endpoint 4b** - Sold Tokens
   - URL: `/priapi/v1/dx/market/v2/pnl/token/list/sold`
   - Returns: Previously sold tokens with PnL

4. **Endpoint 6** - Transaction History
   - URL: `/priapi/v1/dx/market/v2/pnl/token/transaction-list`
   - Returns: Buy/sell transaction history

### Step 4: Frontend Implementation

**File Structure:**
```
frontend/src/
  components/
    WalletDetailModal.tsx          (NEW - main modal)
    WalletSummaryCards.tsx         (NEW - PnL, win rate, etc)
    TokenHoldingsTable.tsx         (NEW - current holdings)
    TradingHistoryTable.tsx        (NEW - transaction history)
    WalletAnalyticsCharts.tsx      (NEW - charts & graphs)
  
  lib/
    okx-api.ts                     (NEW - OKX API client)
  
  app/
    api/
      okx/
        wallet/
          [address]/
            route.ts               (NEW - proxy to backend)
```

**State Management:**
- Use React Query for OKX data fetching
- Cache wallet details for 5 minutes
- Loading states for each tab
- Error handling for failed API calls

### Step 5: Analytics Integration
**What to Display:**
- Trader Quality Score (custom algorithm)
- Copy Trading Signals (Strong Buy, Buy, Hold, Sell)
- Win Rate Distribution (buckets: >500%, 0-500%, -50%-0%, <-50%)
- Market Cap Preference (which cap ranges they trade)
- Risk Metrics (rug pull ratio, hold time, etc)

## Implementation Order

### Phase 1: Basic Modal (30 min)
1. Create WalletDetailModal component
2. Add onClick handler to WalletTable rows
3. Show basic wallet info in modal
4. Test modal open/close

### Phase 2: Backend OKX Integration (45 min)
1. Create /api/okx/wallet/[address]/route.ts
2. Call OKX Endpoint 1 (wallet profile)
3. Return formatted data to frontend
4. Test with real wallet address

### Phase 3: Modal Tabs & Data Display (60 min)
1. Implement tab navigation in modal
2. Create TokenHoldingsTable component
3. Create TradingHistoryTable component
4. Fetch and display data from OKX endpoints 4a, 4b, 6
5. Add loading states and error handling

### Phase 4: Analytics & Charts (60 min)
1. Implement trader quality score algorithm
2. Create WalletAnalyticsCharts component
3. Add win rate distribution chart
4. Add PnL timeline chart
5. Display copy trading signals

### Phase 5: Polish & Optimization (30 min)
1. Add animations to modal
2. Implement keyboard shortcuts (ESC to close)
3. Add copy-to-clipboard for addresses
4. Cache OKX data with React Query
5. Test with multiple wallets

## Success Criteria
- ✅ Click wallet row → modal opens
- ✅ Modal shows OKX data (not Supabase)
- ✅ All 4 OKX endpoints integrated
- ✅ Analytics calculations working
- ✅ No React #185 errors
- ✅ Fast loading (<2s for data)
- ✅ Responsive design (mobile-friendly)

## Files to Create
1. `/frontend/src/components/WalletDetailModal.tsx`
2. `/frontend/src/lib/okx-api.ts`
3. `/frontend/src/app/api/okx/wallet/[address]/route.ts`
4. `/backend/routes/okx.js`

## Files to Modify
1. `/frontend/src/app/tracked/page.tsx` - Add modal state & onClick
2. `/frontend/src/components/WalletTable.tsx` - Add row click handler
3. `/backend/server.js` - Add OKX routes

## Environment Variables Needed
```env
# Backend
OKX_API_URL=https://web3.okx.com
OKX_CHAIN_ID=501  # Solana

# Frontend  
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

## Notes
- OKX API doesn't require authentication (public endpoints)
- Rate limit: 200 requests/minute (plenty for our use case)
- Data is real-time (no caching on OKX side)
- ChainID 501 = Solana, 1 = Ethereum
