# GMGN Wallet Dashboard 🚀

Professional dashboard for tracking and analyzing top crypto wallets from GMGN.ai with advanced filtering, persistent storage, and real-time updates.

![Dashboard Preview](https://img.shields.io/badge/Status-Production%20Ready-green)
![License](https://img.shields.io/badge/License-MIT-blue)
![Node](https://img.shields.io/badge/Node-20.x-green)
![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black)

---

## ✨ Features

### 🎯 Core Functionality
- **Multi-chain support**: SOL, ETH, BSC, BASE, BLAST, and more
- **Smart filtering**: By tags (smart_degen, pump_smart, renowned, snipe_bot)
- **Advanced filters**: PnL%, Profit $, Tokens, Hold Time, Risk metrics
- **Real-time data**: Via Browserless.io residential proxies (95%+ success rate)
- **Export**: CSV/JSON with one click

### 💾 Persistent Storage
- **localStorage database**: All fetched wallets saved locally
- **Instant loading**: No API calls on page refresh
- **Per-wallet staleness**: Track data freshness individually
- **Manual refresh**: User-controlled updates (unit-efficient)

### 📊 Smart Display
- **Color-coded badges**: Honeypot, Rug Pull, Fast TX risk indicators
- **Staleness indicator**: Green/Yellow/Red with timestamps
- **Good candidate highlighting**: Auto-identifies promising wallets
- **Responsive table**: Sort, filter, and select rows
- **Wallet details modal**: Deep dive into individual wallets

### 🔒 Security & Performance
- **Server-side API calls**: Keys never exposed to browser
- **CORS protection**: Backend only accepts requests from your domain
- **5-minute cache**: Reduces redundant API calls
- **Token rotation**: Automatic load balancing across multiple Browserless accounts

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20.x or later
- Browserless.io account (free tier: 1,000 units/month)

### 1️⃣ Get Browserless API Token
1. Sign up at https://account.browserless.io/signup/email
2. Copy your API token from the dashboard

### 2️⃣ Clone & Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your token:
# BROWSERLESS_API_TOKEN=your_token_here
npm start
```
Backend runs on http://localhost:3001

### 3️⃣ Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on http://localhost:3000

### 4️⃣ Start Exploring!
- Visit http://localhost:3000
- Select chain (SOL, ETH, etc.)
- Choose timeframe (1d, 7d, 30d)
- Apply filters and export data

---

## 📦 Tech Stack

### Backend
- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **Data Fetching**: Browserless.io API (residential proxies)
- **Caching**: node-cache (5min TTL)
- **CORS**: Configured for security

### Frontend
- **Framework**: Next.js 16.0.1 (Turbopack)
- **UI**: React + TypeScript + Tailwind CSS
- **Components**: shadcn/ui
- **State**: React Query + localStorage
- **Tables**: TanStack Table
- **Icons**: Lucide React

---

## 🏗️ Architecture

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │ (localStorage cache)
       ↓
┌──────────────────┐
│  Next.js Frontend│ (Netlify)
│  Port 3000       │
└──────┬───────────┘
       │ (API calls with key)
       ↓
┌──────────────────┐
│  Express Backend │ (Render)
│  Port 3001       │
└──────┬───────────┘
       │ (Browserless.io API)
       ↓
┌──────────────────┐
│  Browserless.io  │
│  Residential     │
│  Proxies         │
└──────┬───────────┘
       │ (Cloudflare bypass)
       ↓
┌──────────────────┐
│    GMGN.ai       │
│    API Data      │
└──────────────────┘
```

### Data Flow
1. **User action** → Frontend checks localStorage
2. **If stale/missing** → Frontend calls backend API
3. **Backend** → Calls Browserless.io with residential proxy
4. **Browserless** → Bypasses Cloudflare, fetches GMGN.ai data
5. **Backend** → Caches response (5min), returns to frontend
6. **Frontend** → Merges new data into localStorage, displays table

---

## 📋 Project Structure

```
dashboard/
├── backend/
│   ├── server.js                    # Express server
│   ├── middleware/
│   │   └── auth.js                  # API key validation
│   ├── routes/
│   │   ├── health.js                # Health check
│   │   └── wallets.js               # Wallet endpoints
│   ├── scraper/
│   │   ├── solver-browserless.js   # Browserless.io integration
│   │   ├── fetcher.js              # GMGN.ai data fetcher
│   │   └── cache.js                # In-memory cache
│   ├── .env.example                # Environment template
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            # Main dashboard
│   │   │   ├── layout.tsx          # Root layout
│   │   │   ├── globals.css         # Global styles
│   │   │   └── api/                # API route handlers
│   │   ├── components/
│   │   │   ├── WalletTable.tsx     # Main data table
│   │   │   ├── FilterBar.tsx       # Chain/time/tag filters
│   │   │   ├── AdvancedFilters.tsx # PnL/Profit/etc filters
│   │   │   ├── StatsCards.tsx      # Summary statistics
│   │   │   ├── StalenessIndicator.tsx # Data freshness
│   │   │   └── ui/                 # shadcn/ui components
│   │   ├── hooks/
│   │   │   └── useWalletStorage.ts # localStorage manager
│   │   ├── lib/
│   │   │   ├── api.ts              # API client
│   │   │   ├── export.ts           # CSV/JSON export
│   │   │   └── utils.ts            # Utilities
│   │   └── types/
│   │       └── wallet.ts           # TypeScript types
│   ├── components.json             # shadcn/ui config
│   ├── next.config.ts              # Next.js config
│   ├── tailwind.config.ts          # Tailwind config
│   └── package.json
│
├── shared/
│   └── types.ts                    # Shared TypeScript types
│
├── netlify.toml                    # Netlify config
├── DEPLOYMENT_GUIDE.md             # Deployment instructions
└── README.md                       # This file
```

---

## 🌐 Deployment

See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for detailed instructions.

### Quick Deploy

**Backend (Render):**
- Root: `backend`
- Build: `npm install`
- Start: `npm start`
- Env: `BROWSERLESS_API_TOKEN`, `API_KEY`, `FRONTEND_URL`

**Frontend (Netlify):**
- Root: `frontend`
- Build: `npm run build`
- Publish: `frontend/.next`
- Env: `NEXT_PUBLIC_API_URL`, `API_KEY`

### Costs
- **Render**: Free (sleeps after 15min) or $7/mo (always-on)
- **Netlify**: Free (100GB bandwidth)
- **Browserless**: Free (1,000 units) or $29/mo (10,000 units)
- **Total**: $0-$36/mo depending on usage

---

## 🔧 Configuration

### Backend Environment Variables
```bash
# Required
BROWSERLESS_API_TOKEN=your-primary-token
API_KEY=your-generated-api-key

# Optional - Backup Tokens (auto-rotates)
BROWSERLESS_API_TOKEN_2=backup-token-1
BROWSERLESS_API_TOKEN_3=backup-token-2

# Configuration
NODE_ENV=production
PORT=3001
CACHE_TTL=300
FRONTEND_URL=https://your-frontend.netlify.app
```

### Frontend Environment Variables
```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
API_KEY=same-as-backend
```

---

## 📊 API Endpoints

### `GET /api/health`
Health check

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-11T12:00:00.000Z",
  "cacheStatus": "200 wallets cached (SOL 7d)"
}
```

### `GET /api/wallets`
Fetch wallet data

**Query Params:**
- `chain`: Blockchain (eth, sol, bsc, base, blast, etc.)
- `timeframe`: Period (1d, 7d, 30d)
- `tag`: Filter (smart_degen, pump_smart, renowned, snipe_bot, all)
- `limit`: Max results (default 200)

**Response:**
```json
{
  "data": [
    {
      "wallet_address": "0x...",
      "pnl_7d": 0.1805,
      "realized_profit_7d": 29214.79,
      "winrate_7d": 0.72,
      "token_num_7d": 152,
      ...
    }
  ],
  "metadata": {
    "total": 200,
    "cached": true,
    "timestamp": "2025-11-11T12:00:00.000Z"
  }
}
```

---
- **Frontend**: Next.js 16, TypeScript, Tailwind, shadcn/ui, TanStack Query/Table
- **Scraping**: Browserless.io (managed browsers + residential proxies)
- **Cache**: node-cache (5min TTL) + localStorage (30min TTL)
- **Deployment**: Render (backend), Netlify (frontend)

## Environment Variables

**Backend** (`backend/.env`):
```bash
PORT=3001
API_KEY=your-api-key-here
CACHE_TTL=300
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
BROWSERLESS_API_TOKEN=your-browserless-token-here  # Get from browserless.io
```

**Frontend** (`frontend/.env.local`):
```bash
API_URL=http://localhost:3001/api  # Or production Render URL
API_KEY=your-api-key-here
```

## Notes

- **Backend cache**: 5 minutes (node-cache)
- **Frontend cache**: 30 minutes (localStorage)
- **Staleness thresholds**: Green <5min, Yellow 5-10min, Red >10min
- **Quality filtering**: PnL >-50%, active within 30 days
- **Composite scoring**: 35% PnL, 25% profit, 20% win rate, 15% moonshots, 5% consistency
- **Browserless.io free tier**: 1,000 units/month (~500-1,000 requests)
- **Success rate**: 95%+ with residential proxies (100% with retries)
- **Response time**: 10-26s normal, 40-75s with 429 retry
- **Unit efficiency**: ~90% reduction in API calls (900 vs 8,100 units/month)
- **Filter behavior**: Checks localStorage first, fetches only if missing or stale
- **Manual refresh**: Bypasses all caches (backend + frontend)

## Documentation

- **Backend**: `docs/BROWSERLESS_ARCHITECTURE.md` - Full Browserless integration details
- **Rate Limits**: `docs/BROWSERLESS_RATE_LIMITS.md` - 429 error handling guide
- **Frontend**: `docs/FRONTEND_OPTIMIZATION.md` - Complete unit efficiency guide
- **Quick Ref**: `docs/FRONTEND_OPTIMIZATION_SUMMARY.md` - Testing checklist

## 🐛 Troubleshooting

### Backend Issues

**"BROWSERLESS_API_TOKEN not set"**
- Check `.env` file exists in `backend/` folder
- Verify token is set: `BROWSERLESS_API_TOKEN=your_token_here`
- No quotes needed around the value

**"429 Too Many Requests"**
- Browserless free tier: 1 concurrent browser
- Backend automatically retries with 2s delay
- Consider adding backup tokens (see Configuration)

**"Request failed with status 400"**
- Invalid URL or request format
- Check GMGN.ai API endpoint is correct
- Verify chain/timeframe parameters

**Backend won't start**
- Check port 3001 is available: `lsof -i :3001`
- Kill existing process: `kill -9 $(lsof -t -i:3001)`
- Check Node version: `node -v` (should be 20.x)

### Frontend Issues

**"Failed to fetch"**
- Backend not running? Start with `npm start` in `backend/`
- CORS error? Check `FRONTEND_URL` in backend `.env`
- Wrong API URL? Check `API_URL` in frontend `.env.local`

**Table shows "No results"**
- Open browser DevTools → Console for error messages
- Check Network tab - API call successful?
- Check localStorage - data saved? (Application → Storage → Local Storage)
- Try manual refresh button

**Filters not working**
- Advanced filters apply client-side to localStorage data
- Check console for debug logs showing filter validation
- Verify PnL% values are percentage (not decimal)
- Clear localStorage and refresh

**Data never refreshes**
- Staleness indicator shows "X minutes ago"
- Click manual refresh button
- Check backend cache (5min TTL)
- Restart backend to clear cache

### Performance Issues

**Slow initial load (30s+)**
- Free tier backend waking up from sleep (Render)
- Upgrade to paid tier ($7/mo) for always-on
- Use cron job to keep-alive (ping every 10min)

**Browserless API slow (>30s)**
- Normal: 10-26s per request
- With 429 retry: 40-75s
- Check usage: https://account.browserless.io/
- Consider paid tier for better performance

**Too many API calls**
- Should only call on: page load, manual refresh, or filter change (if data missing)
- Check Network tab for unexpected calls
- Verify localStorage working (Application → Storage)
- Check cache TTL settings

### Data Issues

**Missing wallet data**
- Some wallets may have null values for certain fields
- Table displays "N/A" for missing data
- Export will include empty values
- This is normal - GMGN.ai data varies by wallet

**Incorrect PnL percentages**
- Backend stores as decimal (0.5 = 50%)
- Frontend multiplies by 100 for display
- Filters use percentage values (50 = 50%)
- Check debug logs for raw vs formatted values

---

## 📝 Development Tips

### Adding New Chains
Edit `frontend/src/components/FilterBar.tsx`:
```tsx
const CHAINS = [
  { value: 'sol', label: 'Solana' },
  { value: 'eth', label: 'Ethereum' },
  { value: 'your_new_chain', label: 'Your Chain' },
];
```

### Adding New Columns
See `frontend/src/components/WalletTable.tsx` line 90 for detailed instructions.

### Adjusting Cache TTL
- **Backend**: Change `CACHE_TTL` in `.env` (seconds)
- **Frontend**: Not configurable (uses manual refresh)

### Custom Filters
Add to `AdvancedFilters.tsx` and filter logic in `page.tsx`.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

---

## 📄 License

MIT License - see LICENSE file for details

---

## 🙏 Acknowledgments

- **GMGN.ai** - Wallet data source
- **Browserless.io** - Cloudflare bypass solution
- **shadcn/ui** - Beautiful UI components
- **Vercel** - Next.js framework

---

## 📞 Support

- **Issues**: Open an issue on GitHub
- **Deployment**: See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Architecture**: Check `docs/` folder for detailed documentation

---

**Built with ❤️ for crypto traders and wallet analysts**
