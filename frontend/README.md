# Frontend Documentation

## Overview

Next.js 16 dashboard for viewing and managing wallet data. Built with React Query, TypeScript, Tailwind CSS, and shadcn/ui components.

---

## 🏗 Architecture

```
app/                         # Pages + API routes (Next.js)
├── page.tsx                 # Main dashboard
├── analytics/
│   ├── page.tsx             # Analytics dashboard
│   └── layout.tsx           # Analytics layout
├── api/
│   ├── wallets/
│   │   ├── route.ts         # GET /api/wallets (proxy)
│   │   └── stats/
│   │       └── route.ts     # GET /api/wallets/stats (proxy)
│   ├── chains/route.ts      # GET /api/chains
│   ├── tags/route.ts        # GET /api/tags
│   └── sync/route.ts        # POST /api/sync
├── layout.tsx               # Root layout
├── globals.css              # Global styles
└── providers.tsx            # Query client setup

components/                   # React components
├── WalletTable.tsx          # Main data table (TanStack Table)
├── FilterBar.tsx            # Chain/timeframe/tag selector
├── AdvancedFilters.tsx      # PnL/profit/risk filters
├── StatsCards.tsx           # Summary cards
├── TrendChart.tsx           # 7-day PnL trend chart
├── TopGainersCard.tsx       # Top 10 wallets by profit
├── StalenessIndicator.tsx   # Data freshness indicator
└── ui/                      # shadcn/ui components

hooks/
└── useWalletStorage.ts      # localStorage management

lib/
├── api.ts                   # API client (React Query)
├── supabase-client.ts       # Supabase + sync trigger
├── rate-limit.ts            # Rate limiting utility
├── export.ts                # CSV/JSON export
└── utils.ts                 # Helpers

types/
└── wallet.ts                # TypeScript interfaces
```

---

## 🔌 API Routes

### `GET /api/wallets`
Proxy to backend. Rate limited + origin check.

### `GET /api/wallets/stats`
Proxy to backend stats. Same security.

### `POST /api/sync`
Trigger backend sync to Supabase.

```json
{
  "chain": "sol",
  "timeframe": "7d",
  "tag": "all",
  "limit": 200
}
```

---

## 🎯 Components

### `WalletTable.tsx`
Main table using TanStack Table.
- Sortable columns
- Row selection
- Color-coded badges
- Pagination (50/page)

### `FilterBar.tsx`
Top filters: chain, timeframe, tag.

### `AdvancedFilters.tsx`
Client-side: PnL%, Profit, Tokens, Hold time, Risk.

**Note:** These apply ONLY to loaded data. Backend returns 200 unfiltered wallets.

### `TrendChart.tsx`
7-day PnL trend from `wallet_snapshots` table.

### `StalenessIndicator.tsx`
Data freshness indicator + manual refresh button.

---

## 🪝 Custom Hooks

### `useWalletStorage()`
```typescript
storage.getAllWallets(chain?: string): Wallet[]
storage.saveWallet(wallet: Wallet): void
storage.getStats(): Stats
storage.isDataStale(minutes?: number): boolean
storage.clear(): void
```

**Behavior:**
- Accumulates wallets from API calls
- Deduplicates by address
- Merges with Supabase data
- Tracks sync time per chain

---

## Security

- ✅ Rate limiting: 100/min reads, 20/min writes per IP
- ✅ Origin/Referer check: Production only allows `wdashboard.netlify.app`
- ✅ API key: Hidden in `process.env`, included in all requests
- ✅ Batch operations: One insert for 200 wallets

---

## 📦 Dependencies

- `@tanstack/react-query` - Data fetching
- `@tanstack/react-table` - Tables
- `recharts` - Charts
- `@supabase/supabase-js` - Database client
- `tailwindcss` - Styling
- `shadcn/ui` - UI components

---

## 🚀 Build & Deployment

```bash
npm run dev     # Development (localhost:3000)
npm run build   # Production build
npm run start   # Start server
```

### Netlify
Auto-deploys on `git push`. Set env vars:
- `API_URL=https://dashboard-backend-xxx.onrender.com/api`
- `API_KEY=your_secret_key`

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Failed to fetch" | Check backend running, verify `API_URL` |
| "Filters not working" | Data must be loaded first (check table) |
| "Data never refreshes" | Click Refresh button, check backend cache |
| "Analytics empty" | Sync data first (Refresh button), create snapshots |

---

**Last Updated**: November 12, 2025
