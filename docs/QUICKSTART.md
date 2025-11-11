# GMGN Dashboard - Quick Start Guide

## 🎉 Dashboard is Ready!

Both servers are currently running:
- **Backend API**: http://localhost:3001
- **Frontend Dashboard**: http://localhost:3000

## 📋 What You Have

### ✅ Completed Features

1. **Backend API** (`gmgn-dashboard/backend/`)
   - Express server with REST API
   - Multi-tag Puppeteer fetcher (fetches 4 tags × 200 wallets = 800 records)
   - Automatic deduplication by wallet address
   - Quality filtering (PnL, profit, win rate, risk)
   - Composite scoring algorithm
   - In-memory caching (5-minute TTL)

2. **Frontend Dashboard** (`gmgn-dashboard/frontend/`)
   - Next.js 14 with TypeScript
   - shadcn/ui components
   - TanStack Table with sorting
   - **Row selection checkboxes** ✨
   - **Export selected rows to CSV/JSON** ✨
   - Filter controls (chain, timeframe, tag)
   - Stats summary cards
   - Pagination (Load More button)

3. **Key Features**
   - ✅ Select individual wallets with checkboxes
   - ✅ Select all wallets on page
   - ✅ Export selected wallets to CSV
   - ✅ Export selected wallets to JSON
   - ✅ Sortable columns (PnL, Profit, Win Rate, Score)
   - ✅ Copy wallet addresses to clipboard
   - ✅ Open wallet on GMGN.ai
   - ✅ Color-coded PnL and risk badges
   - ✅ Real-time filtering

## 🚀 How to Use

### 1. Access the Dashboard
Open your browser to: **http://localhost:3000**

### 2. Filter Wallets
- **Chain**: Select Ethereum, Solana, BNB Chain, Arbitrum, or Base
- **Timeframe**: Choose 1d, 7d, or 30d
- **Tag**: Filter by Smart Money, Early Pumpers, Renowned, Sniper Bots, etc.
- Click **Refresh** icon to reload data

### 3. Select Wallets for Export
1. Click checkboxes next to wallets you want to export
2. Or click the header checkbox to select all on the page
3. A toolbar will appear showing "X wallets selected"
4. Click **"Export CSV"** or **"Export JSON"**
5. File downloads automatically

### 4. Load More Data
- Scroll to bottom of table
- Click **"Load More"** button
- New wallets append to the table

### 5. Sort Data
- Click column headers to sort:
  - **PnL 7d** (highest returns)
  - **Profit 7d** (most profitable)
  - **Win Rate** (most consistent)
  - **Score** (composite ranking)

## 📊 Understanding the Data

### Table Columns

| Column | Description |
|--------|-------------|
| ☑️ | Select row for export |
| # | Rank (1-indexed) |
| Wallet | Address with copy & GMGN link |
| Tags | Wallet categories (Smart Money, Sniper, etc.) |
| PnL 7d | Percentage return (color-coded) |
| Profit 7d | Realized profit in USD |
| Win Rate | % of profitable trades |
| Tokens | Unique tokens traded |
| Moonshots | Trades with >5x returns |
| Risk | Low/Medium/High risk badge |
| Score | Composite ranking (0-1) |

### Color Coding

**PnL (Profit/Loss):**
- 🟢 **Dark Green**: >500% (moonshot)
- 🟢 **Green**: >200%
- 🟢 **Light Green**: >100%
- 🟡 **Yellow**: >50%
- ⚪ **Gray**: Positive
- 🔴 **Red**: Negative

**Risk Score:**
- 🟢 **Low**: < 10% (safe)
- 🟡 **Medium**: 10-25% (caution)
- 🔴 **High**: > 25% (risky)

### Stats Cards

- **Total Wallets**: Count of filtered wallets + risk distribution
- **Avg PnL 7d**: Average percentage return
- **Avg Profit 7d**: Average dollar profit + total sum
- **Top Performer**: Best wallet by PnL with address

## 🔄 Restarting Servers

If you closed the terminals:

```bash
cd /gmgn-scraper/gmgn-dashboard

# Option 1: Use the startup script
./start.sh

# Option 2: Manual start

# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend  
cd frontend && npm run dev
```

## 🐛 Troubleshooting

### Frontend shows "Loading..." forever
- Check backend is running: `curl http://localhost:3001/api/health`
- If not, restart backend: `cd backend && npm start`

### No wallets appear
- Backend is fetching data (takes 15-30 seconds first time)
- Check backend terminal for logs
- Try refreshing with the refresh button

### Export not working
- Ensure wallets are selected (checkbox checked)
- Check browser console for errors
- Try selecting fewer wallets if browser hangs

## 📝 Next Steps

### Recommended Enhancements
1. **Infinite Scroll**: Auto-load on scroll instead of button
2. **Virtual Scrolling**: Better performance for 1000+ rows
3. **Wallet Details Modal**: Expandable rows with full metrics
4. **Daily Profit Charts**: Sparklines for 7-day profit trends
5. **Saved Filters**: Remember user preferences
6. **Dark Mode**: Theme toggle
7. **Mobile Responsive**: Better mobile layout

### Production Deployment
1. Use environment variables for API URL
2. Add rate limiting to backend
3. Use Redis for caching instead of memory
4. Add authentication if needed
5. Deploy backend to cloud (Heroku, Railway, etc.)
6. Deploy frontend to Vercel/Netlify

## 📚 Files Created

```
gmgn-scraper/gmgn-dashboard/
├── backend/
│   ├── server.js             ✅ Express API server
│   ├── scraper/
│   │   ├── fetcher.js        ✅ Multi-tag fetcher with deduplication
│   │   └── cache.js          ✅ Caching layer
│   ├── routes/
│   │   ├── wallets.js        ✅ Wallet endpoints
│   │   └── health.js         ✅ Metadata endpoints
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx      ✅ Main dashboard
│   │   │   ├── layout.tsx    ✅ Root layout
│   │   │   └── providers.tsx ✅ React Query setup
│   │   ├── components/
│   │   │   ├── WalletTable.tsx   ✅ Table with row selection
│   │   │   ├── FilterBar.tsx     ✅ Filters
│   │   │   └── StatsCards.tsx    ✅ Stats
│   │   ├── lib/
│   │   │   ├── api.ts        ✅ API client
│   │   │   └── export.ts     ✅ Export functions
│   │   └── types/
│   │       └── wallet.ts     ✅ TypeScript types
│   └── package.json
│
├── shared/
│   └── types.ts              ✅ Shared types
│
├── README.md                 ✅ Full documentation
├── start.sh                  ✅ Startup script
└── QUICKSTART.md             ✅ This file
```

## 🎯 Current Status

### ✅ Fully Functional
- Backend API fetching from GMGN.ai
- Frontend dashboard rendering data
- Row selection working
- CSV/JSON export working
- Filtering and sorting working
- Pagination working
- Stats cards displaying correctly

### 🎉 Ready to Use!
The dashboard is fully operational. You can now:
1. Browse top-performing wallets
2. Filter by chain/timeframe/tag
3. Select specific wallets
4. Export to CSV/JSON for further analysis
5. Sort by different metrics

---

**Enjoy analyzing crypto wallets! 🚀**
