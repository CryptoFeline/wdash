# Wallet Dashboard

Dashboard for tracking and analyzing top crypto wallets from GMGN.ai.

## What It Does

Scrapes wallet data from GMGN.ai, filters for quality wallets, and displays them in an interactive Next.js dashboard. Supports multiple chains and wallet categories.

## Key Features

- Multi-tag scraping (smart_degen, pump_smart, renowned, snipe_bot)
- Deduplication and composite scoring
- Interactive table with sorting and row selection
- Export to CSV/JSON
- Real-time filtering by chain/timeframe/tag
- Pagination and stats cards

## Quick Start

**Backend:**
```bash
cd backend
npm install
npm start  # Port 3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev  # Port 3000
```

Visit http://localhost:3000

## Project Structure

```
├── backend/
│   ├── server.js
│   ├── scraper/ (fetcher + cache)
│   └── routes/ (API endpoints)
├── frontend/
│   ├── src/app/ (Next.js pages)
│   ├── components/ (Table, filters, stats)
│   └── lib/ (API client, utils)
└── shared/types.ts
```

## Tech Stack

- Backend: Node.js, Express
- Frontend: Next.js 14, TypeScript, Tailwind, shadcn/ui, TanStack Query/Table

## Notes

- Caches data for 5 minutes
- Filters wallets by PnL >50%, profit >$100, win rate >40%
- Composite scoring: 35% PnL, 25% profit, 20% win rate, 15% moonshots, 5% consistency
