# GMGN Dashboard - Quick Start & Feature Overview

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Browser with localStorage support

### Installation
```bash
# Install dependencies
cd frontend && npm install

# Run development server
npm run dev

# Open browser to http://localhost:3000
```

### First Steps
1. Navigate to dashboard - automatic wallet sync begins
2. Click bookmark icon on any wallet to track it
3. Go to "Tracked (X)" page to see tracked wallets
4. Monitor sync progress on Tracked page
5. Review trader analytics cards

---

## 📱 Feature Overview

### 1. Dashboard (Main Page)
**Route:** `/`

**Features:**
- Browse all wallets from OXK API
- Search/filter wallets (chain, timeframe, tags)
- Advanced filtering (PnL, tokens, hold time, win rate, rug pull)
- Bookmark individual wallets to track
- View detailed wallet statistics

**Key Elements:**
- Wallet table with sorting
- Stats cards (top traders, average metrics)
- Staleness indicator (how fresh data is)
- Refresh controls
- Navigation to Tracked page

---

### 2. Tracked Wallets Page
**Route:** `/tracked`

**Features:**
- View only bookmarked wallets
- Same filters as main dashboard
- Rolling sync engine status
- Analytics summary
- Top copy-worthy traders
- Copy trading signals

**Key Elements:**
- SyncProgressCard (real-time sync status)
- Analytics Summary Card (copy-worthy %, average score)
- TraderScoreCard (detailed trader analysis)
- Wallet table (filtered view)

---

### 3. Sync Engine
**Status:** Running in background on Tracked page

**How It Works:**
```
User adds bookmarks → Tracked page shows them
    ↓
Sync engine picks up tracked wallets
    ↓
Distributes 5-minute rolling schedule (1 wallet/min)
    ↓
Fetches: Endpoint 1 (Summary), 4a (Holdings), 4b (Trades)
    ↓
Stores in localStorage (gmgn_wallet_database)
    ↓
Updates every 60 seconds
    ↓
Auto-retries on error (30s backoff, 5m normal)
```

**Controls:**
- Pause/Resume buttons to control sync
- "Sync Now" to manually trigger
- Clear Errors to remove error log
- Real-time progress bar

**Performance:**
- 1.2 calls/minute (OXK limit: 200/min)
- 0.6% rate limit utilization
- Scales to 1,400+ tracked wallets

---

### 4. Analytics System
**Status:** Auto-calculates every 30 seconds

**What It Does:**
1. Analyzes each tracked wallet's performance
2. Calculates 5 metrics (Entry, Profit, Exit, Risk, Trend)
3. Produces quality score 0-100
4. Generates copy trading signals

**Metrics Explained:**

| Metric | Weight | Measures |
|--------|--------|----------|
| Entry Quality | 35% | Did trader enter before pump? |
| Profitability | 25% | Does trader make money? |
| Exit Quality | 20% | Can trader exit profitably? |
| Risk Management | 15% | Avoids rugs and scams? |
| Trend | 5% | Recent performance trajectory |

**Signals:**
- **Strong Buy** (score 85+): Copy entries AND exits
- **Buy** (score 70+): Copy entries only  
- **Hold** (score 55+): Monitor before copying
- **Weak** (score 40+): Avoid copying
- **Avoid** (score <40): Do not copy

**Copy-Worthy Definition:**
- Score ≥ 65 = Trader demonstrably better than random
- Win rate ≥ 40% = More wins than losses
- Rug avoidance high = Minimizes loss risk

---

## 🎯 Using Copy Trading Signals

### For a "Strong Buy" Trader
```
1. Review their TraderScoreCard on Tracked page
2. Check Win Rate and Entry Quality Score
3. Note the recommended exit target (e.g., 100% profit)
4. Monitor next 5 new trades to validate
5. If confident, enable auto-copy in future version
```

### For a "Buy" Trader
```
1. Review analytics (good entries, decent exits)
2. Copy their entries only
3. Manually set exit targets per trade
4. Track performance vs their exits
5. Adjust as needed based on results
```

### For "Hold" or Below
```
1. Monitor for pattern changes
2. Wait for score improvement
3. Do deeper analysis before copying
4. Or skip and focus on Strong Buy traders
```

---

## 💾 Data Storage

### localStorage Keys

| Key | Purpose | Size | Auto-Clear |
|-----|---------|------|-----------|
| `gmgn-wallet-database` | All wallet data | ~50-500KB | No (accumulates) |
| `gmgn_sync_status` | Sync engine state | ~5-20KB | No (persists) |
| `gmgn_analytics` | Trader metrics | ~10-50KB | No (auto-updates) |

### Data Persistence
- **On Reload:** All data loads from localStorage (instant!)
- **On API Fail:** Serves cached data (continues to work)
- **Manual Clear:** Use "Clear All" buttons in UI

### Storage Tips
- Monitor storage in DevTools (Application → Storage)
- Analytics auto-clears when recalculated
- Wallet database only grows (never shrinks)
- Total usage: ~100-200KB for 50-100 wallets

---

## 🔍 Understanding the Analytics

### Example 1: Exceptional Trader (Score 87)
```
Entry Quality: 85/100  - Consistently enters before pump
Profitability: 90/100  - 70% win rate + strong P&L
Exit Quality: 82/100   - Exits near peak when winning
Risk Management: 88/100 - Avoids rugs, diversified
Trend: 75/100          - Improving performance

✅ Copy-Worthy: YES
🎯 Recommended: Copy entries AND exits
🎲 Signal: STRONG BUY (97% confidence)
```

### Example 2: Good Trader (Score 72)
```
Entry Quality: 75/100  - Good entry timing
Profitability: 72/100  - 55% win rate, modest P&L
Exit Quality: 65/100   - Some exits too early
Risk Management: 70/100 - Decent rug avoidance
Trend: 60/100          - Stable performance

✅ Copy-Worthy: YES
🎯 Recommended: Copy entries only
📊 Signal: BUY (72% confidence)
```

### Example 3: Moderate Trader (Score 58)
```
Entry Quality: 60/100  - Mixed entry timing
Profitability: 55/100  - 45% win rate
Exit Quality: 50/100   - Inconsistent exits
Risk Management: 55/100 - Some rug pull exposure
Trend: 55/100          - Stable but weak

⚠️  Copy-Worthy: BORDERLINE
🎯 Recommended: Monitor before copying
📊 Signal: HOLD (58% confidence)
```

### Example 4: Poor Trader (Score 32)
```
Entry Quality: 35/100  - Enters after pump
Profitability: 30/100  - 25% win rate
Exit Quality: 30/100   - Holds losers too long
Risk Management: 25/100 - High rug exposure
Trend: 35/100          - Declining performance

❌ Copy-Worthy: NO
🎯 Recommended: Do not copy
🚫 Signal: AVOID (68% confidence)
```

---

## 🛠️ Troubleshooting

### "No data yet" on Dashboard
**Solution:** Wait 30 seconds for initial API call. Refresh if needed.

### Tracked wallets page empty
**Solution:** Go to main dashboard and click bookmarks on wallets. Add at least 1 tracked wallet.

### Sync engine stuck on "Syncing"
**Solution:** Click "Pause" then "Resume". Check console for API errors. Verify internet connection.

### Analytics showing 0 copy-worthy wallets
**Solution:** Tracked wallets need historical data. Wait for 2-3 sync cycles. Check wallet trade history is loaded.

### localStorage quota exceeded
**Solution:** Analytics auto-manages quota. If issue persists:
1. Open DevTools (F12)
2. Application → Storage
3. See storage usage
4. Clear non-essential data if needed

### Metrics seem wrong
**Solution:** 
1. Verify source wallet data loaded (check WalletTable)
2. Wait 30 seconds for analytics recalculation
3. Check if data is from correct time period (7d vs 1d)
4. Review analytics-engine.ts for calculation method

---

## 📊 Dashboard Metrics Explained

### Main Stats Cards
- **Top Traders:** Highest quality scorers this period
- **Win Rate:** % of trades ending in profit (all wallets avg)
- **P&L:** Total profit/loss this period (sum)
- **Total Wallets:** All wallets in database

### Filter Options
**Chain:** SOL, ETH, BASE, ARBITRUM  
**Timeframe:** 1d, 7d, 30d (lookback window)  
**Tags:** all, whale, bot, new, exchange  
**Advanced:** PnL %, profit $, tokens, hold time, rug %, win rate

### Table Columns
- Wallet address (truncated)
- Current balance / estimated value
- P&L % (this period)
- Win rate (%)
- Total trades
- Risk rating
- Bookmark status

---

## 🔐 Privacy & Data

### What Data Is Collected?
- Wallet addresses (public blockchain)
- Trading history (public blockchain)
- Your bookmarked addresses (localStorage only)
- Sync timestamps (for freshness tracking)

### Where Is Data Stored?
- **Browser localStorage:** Tracked wallets, sync status, analytics
- **OXK API:** Fetched wallet data (cached locally)
- **Supabase:** Optional historical data

### What Data Leaves Browser?
- API calls to OXK (public data only)
- No personal data sent
- No trading actions performed
- Read-only access

---

## ⚙️ Settings & Controls

### Sync Engine
- **Pause Button:** Stop syncing (keeps data fresh)
- **Resume Button:** Continue syncing
- **Sync Now:** Manual refresh (forces immediate update)
- **Clear Errors:** Remove error log entries

### Analytics
- **Refresh:** Recalculate metrics manually
- **Clear:** Reset all analytics data

### Wallet Management
- **Bookmark:** Click icon to track/untrack
- **Clear All:** Remove all bookmarks (confirmation required)
- **Refresh Data:** Fetch fresh data from API

---

## 📈 Performance Tips

### Optimize Sync Speed
1. Track fewer wallets (< 20 recommended for fast updates)
2. Use 7-day timeframe (faster than 30d)
3. Disable advanced filters if not needed
4. Clear browser cache periodically

### Optimize Analytics
1. Fewer tracked wallets = faster calculations
2. Auto-updates every 30s (wait if changes lag)
3. Compact view loads faster than full cards
4. Close DevTools (reduces memory usage)

### Optimize Storage
1. Monitor storage usage in DevTools
2. Archive old analytics if quota issues
3. Use incognito mode for temporary data
4. Clear site data periodically

---

## 🎓 Best Practices

### Copy Trading Safety
1. ✅ Start with "Strong Buy" traders only
2. ✅ Monitor first 5 trades before full automation
3. ✅ Set stop losses below entry price
4. ✅ Diversify across multiple traders
5. ✅ Review analytics monthly
6. ❌ Don't blindly follow all signals
7. ❌ Don't risk capital you can't afford to lose

### Bookmark Management
1. ✅ Bookmark high-conviction traders
2. ✅ Review scores monthly
3. ✅ Remove underperformers
4. ✅ Add new promising traders
5. ❌ Don't bookmark >50 wallets (dilutes focus)

### Analytics Interpretation
1. ✅ Look at full metrics, not just final score
2. ✅ Watch for trend direction (improving/declining)
3. ✅ Check win rate reliability (need 20+ trades)
4. ✅ Verify risk management score
5. ❌ Don't over-weight recent performance
6. ❌ Don't assume historical = future

---

## 🚀 Advanced Features (Future)

### Coming Soon
- [ ] Real-time entry alerts
- [ ] Auto-copy execution
- [ ] Performance tracking
- [ ] Customizable weights
- [ ] Backtesting engine
- [ ] Advanced charting

### Planned Improvements
- [ ] Historical metrics tracking
- [ ] Comparative trader analysis
- [ ] Risk-adjusted returns
- [ ] Pattern recognition
- [ ] ML-based scoring
- [ ] Mobile app

---

## 📞 Support Resources

### Documentation
- `docs/TASK_1_COMPLETION.md` - Bookmark feature
- `docs/TASK_2_COMPLETION.md` - Tracked page
- `docs/TASK_3_COMPLETION.md` - Sync engine
- `docs/TASK_4_COMPLETION.md` - Analytics system
- `docs/SESSION_4_COMPLETION.md` - Full session summary

### Code References
- `frontend/src/lib/analytics-engine.ts` - Metric formulas
- `frontend/src/hooks/useAnalytics.ts` - Hook implementation
- `frontend/src/app/tracked/page.tsx` - Integration example

### Debugging
- Open DevTools (F12)
- Check Application → Storage for localStorage
- Console for errors/logs
- Network tab for API calls

---

## ✅ Checklist: Getting Started

- [ ] Install dependencies (`npm install`)
- [ ] Start dev server (`npm run dev`)
- [ ] Navigate to dashboard
- [ ] Wait for wallet data to load
- [ ] Click bookmarks on 3-5 wallets
- [ ] Go to Tracked page
- [ ] Monitor sync progress
- [ ] Review analytics cards
- [ ] Check trader signals
- [ ] Plan copy trading strategy

---

## 🎉 You're Ready!

You now have a fully functional copy trading analytics dashboard with:
- ✅ Wallet tracking and bookmarks
- ✅ Background sync engine
- ✅ Advanced analytics
- ✅ Copy trading signals
- ✅ Beautiful UI
- ✅ Persistent data

**Happy trading!** 🚀
