# 🚀 Quick Reference

Essential commands and information for the GMGN Wallet Dashboard.

## 📦 Installation

```bash
# Backend
cd backend
npm install
cp .env.example .env
# Edit .env with your Browserless token
npm start

# Frontend
cd frontend
npm install
npm run dev
```

## 🔑 Environment Variables

### Backend (`.env`)
```bash
BROWSERLESS_API_TOKEN=your_token_here
API_KEY=your_api_key_here
PORT=3001
CACHE_TTL=300
FRONTEND_URL=http://localhost:3000
```

### Frontend (`.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api
API_KEY=same_as_backend
```

## 🌐 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/wallets` | GET | Fetch wallet data |
| `/api/wallets/stats` | GET | Get statistics |

### Query Parameters

**`/api/wallets`:**
- `chain`: eth, sol, bsc, base, blast, etc.
- `timeframe`: 1d, 7d, 30d
- `tag`: smart_degen, pump_smart, renowned, snipe_bot, all
- `limit`: Max results (default 200)

## 💾 localStorage Keys

| Key | Purpose |
|-----|---------|
| `gmgn-wallet-database` | Persistent wallet storage |

**Database Schema:**
```typescript
{
  wallets: {
    [wallet_address]: {
      ...walletData,
      last_updated: timestamp
    }
  },
  version: 1
}
```

## 🎨 Filter System

### API Filters (Trigger Backend Fetch)
- **Chain**: SOL, ETH, BSC, etc.
- **Timeframe**: 1d, 7d, 30d
- **Tag**: smart_degen, pump_smart, etc.

### Display Filters (Client-Side Only)
- **PnL %**: Percentage gain/loss
- **Profit $**: Dollar amount
- **Tokens**: Number of tokens traded
- **Hold Time**: Average holding period (hours)
- **Rug Pull**: Failed sell ratio

## 🔧 Common Commands

### Development
```bash
# Start backend
cd backend && npm start

# Start frontend (dev)
cd frontend && npm run dev

# Build frontend
cd frontend && npm run build

# Start frontend (prod)
cd frontend && npm start
```

### Testing
```bash
# Backend health check
curl http://localhost:3001/api/health

# Fetch wallets
curl "http://localhost:3001/api/wallets?chain=sol&timeframe=7d&tag=all"

# Check localStorage
# Browser DevTools → Application → Local Storage → http://localhost:3000
```

### Deployment
```bash
# Initialize git
git init
git add .
git commit -m "Initial commit"
git branch -M main

# Push to GitHub
git remote add origin https://github.com/username/repo.git
git push -u origin main

# Deploy: See DEPLOYMENT_GUIDE.md
```

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Backend won't start | Check `BROWSERLESS_API_TOKEN` in `.env` |
| CORS error | Verify `FRONTEND_URL` matches frontend URL |
| No data loading | Check backend is running on port 3001 |
| Filters not working | Check browser console for debug logs |
| Table empty | Wait 30s (backend waking up on free tier) |

## 📊 Data Format

**PnL Storage:**
- Backend stores as decimal: `0.5` = 50%
- Frontend displays: `+50.00%`
- Filter uses percentage: `50` = 50%

**Timestamps:**
- Stored as Unix timestamp (ms)
- Displayed as relative time: "5 minutes ago"

## 🎯 Key Metrics

| Metric | Good | Warning | Bad |
|--------|------|---------|-----|
| Win Rate | >70% | 50-70% | <50% |
| PnL 7d | >50% | 0-50% | <0% |
| Honeypot | <10% | 10-30% | >30% |
| Rug Pull | <10% | 10-30% | >30% |
| Fast TX | <20% | 20-50% | >50% |

## 💰 Cost Breakdown

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| Render (Backend) | $0 (sleeps after 15min) | $7/mo (always-on) |
| Netlify (Frontend) | $0 (100GB bandwidth) | $19/mo (1TB) |
| Browserless.io | $0 (1,000 units) | $29/mo (10,000 units) |
| **Total** | **$0/mo** | **$36-55/mo** |

## 📱 Useful URLs

| Resource | URL |
|----------|-----|
| Browserless Signup | https://account.browserless.io/signup/email |
| Browserless Docs | https://docs.browserless.io/rest-apis/unblock |
| Render Dashboard | https://render.com/dashboard |
| Netlify Dashboard | https://app.netlify.com |
| GMGN.ai | https://gmgn.ai |

## 🔗 Quick Links

- **Full Documentation**: [README.md](./README.md)
- **Deployment Guide**: [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

**Keep this reference handy for quick lookups!**
