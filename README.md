# GMGN Wallet Dashboard 🚀

Professional multi-chain wallet tracker with Supabase persistence, historical analytics, and advanced security. Monitor top wallets from GMGN.ai across Solana, Ethereum, BSC, and more.

[![Status](https://img.shields.io/badge/Status-Production%20Ready-green)](https://wdashboard.netlify.app)
[![Next.js](https://img.shields.io/badge/Next.js-16.0.1-black)](https://nextjs.org)
[![Node](https://img.shields.io/badge/Node-22.x-green)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue)](LICENSE)

---

## ✨ Key Features

- **Multi-chain support**: SOL, ETH, BSC, BASE, BLAST, ARB
- **Smart filtering**: By tags + advanced PnL/profit/risk filters
- **Supabase persistence**: Long-term storage + historical snapshots
- **Analytics dashboard**: 7-day trends and top gainers
- **Rate limiting**: Protected endpoints (100/min reads, 20/min writes)
- **Batch operations**: Fast Supabase syncs for 200 wallets
- **Real-time data**: Browserless.io residential proxies (15-30s per fetch)

---

## 🏗 Architecture

```
Frontend (Next.js 16) → Backend (Express.js) → Browserless.io → GMGN API
                            ↓
                       Supabase PostgreSQL
```

**Data Flow**: Fetch → Cache (300s) → Upsert → Snapshot → Analytics

---

## 🚀 Quick Start

### Prerequisites
- Node.js 22+
- Browserless.io token ([free: 1,000 units/month](https://www.browserless.io/pricing))
- Supabase project (free tier works)

### Setup

```bash
# Clone
git clone https://github.com/0xCryptoCat/dashboard.git
cd dashboard

# Install both
npm install --prefix backend && npm install --prefix frontend

# Configure
cp backend/.env.example backend/.env  # Add BROWSERLESS_API_TOKEN, SUPABASE credentials, API_KEY
cp frontend/.env.example frontend/.env.local  # Add API_URL, API_KEY

# Run
npm --prefix backend run dev     # Terminal 1: localhost:3001
npm --prefix frontend run dev    # Terminal 2: localhost:3000
```

---

## 📚 Documentation

| Folder | Purpose |
|--------|---------|
| **[frontend/README.md](./frontend/README.md)** | Components, hooks, API routes, build |
| **[backend/README.md](./backend/README.md)** | Express routes, scraper, Supabase, caching |
| **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** | Production setup (Render + Netlify) |
| **[docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | System design, data flow, security |

---

## 🔌 API Endpoints

### Frontend Routes (Protected by rate limiting + referer check)
```
GET  /api/wallets?chain=sol&timeframe=7d&tag=all&page=1&limit=200
GET  /api/wallets/stats?chain=sol&timeframe=7d&tag=all
GET  /api/chains
GET  /api/tags
POST /api/sync (save to Supabase)
```

### Backend Routes (Protected by X-API-Key)
All backend routes require `X-API-Key` header. Frontend routes include it automatically.

---

## 🗄 Database

### `wallets` table
- `wallet_address` (PK), `chain`, `data` (full JSON), `metadata` (PnL, profit, etc), `synced_at`

### `wallet_snapshots` table
- `id` (PK), `wallet_address`, `chain`, `snapshot_data`, `metrics`, `snapped_at`

---

## 🔒 Security

- ✅ Server-side API keys (`process.env`, not exposed to browser)
- ✅ Rate limiting: 100/min reads, 20/min writes per IP
- ✅ Origin/Referer check: Production only allows `wdashboard.netlify.app`
- ✅ CORS configured to backend domain only
- ✅ Supabase RLS: Anon key read-only, service role write-only
- ✅ Batch operations: Single insert for 200 wallets (fast + secure)

---

## 🚢 Deployment

**Frontend** (Netlify): Auto-deploys from `git push`  
**Backend** (Render): Auto-deploys with `render.yaml`

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed steps.

---

## 📊 Performance

| Metric | Time |
|--------|------|
| Fetch (new data) | 15-30s |
| Cache hit | <1s |
| Sync 200 wallets | ~5s |
| Page load | <2s |
| Analytics | <3s |

---

## 🛠 Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, React Query, TypeScript, Tailwind, shadcn/ui |
| Backend | Express.js, Puppeteer (via Browserless) |
| Database | PostgreSQL (Supabase) |
| Auth | API Key + RLS policies |
| Deploy | Netlify (frontend), Render (backend) |

---

## 📁 Project Structure

```
dashboard/
├── frontend/              # Next.js 16 (Netlify)
│   └── README.md         # Frontend docs
├── backend/               # Express.js (Render)
│   └── README.md         # Backend docs
├── shared/                # Shared types
├── docs/
│   ├── DEPLOYMENT.md
│   ├── ARCHITECTURE.md
│   └── API_SOURCES.md    # Multi-source roadmap
└── README.md             # This file
```

---

## 🔌 Adding New Data Sources

See [docs/API_SOURCES.md](./docs/API_SOURCES.md) for the plan to add Birdeye, DexScreener, and more.

---

## 📝 License

MIT

---

**Last Updated**: November 12, 2025 | **Version**: 1.0.0 (Production)
