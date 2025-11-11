# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-11-11

### 🎉 Initial Release

Professional GMGN Wallet Dashboard with persistent storage, advanced filtering, and production-ready deployment.

### ✨ Features

#### Core Functionality
- Multi-chain support (SOL, ETH, BSC, BASE, BLAST, etc.)
- Real-time wallet data from GMGN.ai
- Advanced filtering by PnL%, Profit $, Tokens, Hold Time, Risk metrics
- Export to CSV/JSON with formatted data
- Wallet details modal with deep analytics

#### Data Management
- **Persistent localStorage database**: All fetched wallets saved locally
- **Per-wallet staleness tracking**: Individual timestamps for data freshness
- **Manual refresh control**: User-initiated updates (unit-efficient)
- **Automatic deduplication**: Wallets merged by address
- **5-minute backend cache**: Reduces redundant API calls

#### User Experience
- **Staleness indicator**: Green/Yellow/Red badges with timestamps
- **Good candidate highlighting**: Auto-identifies promising wallets (70%+ winrate, 30%+ 2-5x ratio)
- **Color-coded risk badges**: Honeypot, Rug Pull, Fast TX with visual severity levels
- **Responsive table**: Sort, filter, select, and export
- **Dark mode support**: System preference detection

#### Backend Architecture
- **Browserless.io integration**: 95%+ success rate with residential proxies
- **Cloudflare bypass**: Reliable data fetching (vs 50% success with datacenter IPs)
- **Token rotation**: Automatic load balancing across multiple API keys
- **Sequential prefetch**: Respects Browserless concurrency limits
- **10-26 second responses**: Fast data retrieval (vs 60-90s with local Puppeteer)

#### Security
- Server-side API calls (keys never exposed to browser)
- CORS protection (backend only accepts requests from configured domain)
- Environment variable management
- API key authentication

### 🛠️ Technical Stack

#### Backend
- Node.js 20.x
- Express.js
- Browserless.io API (residential proxies)
- node-cache (in-memory caching)

#### Frontend
- Next.js 16.0.1 (Turbopack)
- React + TypeScript
- Tailwind CSS
- shadcn/ui components
- TanStack Table
- React Query

### 📊 Performance Improvements

- **~90% reduction in API calls**: 900 vs 8,100 units/month
- **Instant page loads**: localStorage cache eliminates redundant fetches
- **Client-side filtering**: No API calls for display filter changes
- **Optimized prefetch**: Only fetches most common query on startup
- **No Chromium binary**: 50MB reduction vs local Puppeteer

### 🔧 Configuration

#### Backend Environment Variables
- `BROWSERLESS_API_TOKEN`: Primary API token
- `BROWSERLESS_API_TOKEN_2`, `_3`, etc.: Backup tokens (optional)
- `API_KEY`: Authentication key
- `FRONTEND_URL`: CORS allowed origin
- `CACHE_TTL`: Cache duration in seconds (default: 300)
- `PORT`: Server port (default: 3001)

#### Frontend Environment Variables
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `API_KEY`: Same as backend

### 📚 Documentation

- **README.md**: Comprehensive project overview
- **DEPLOYMENT_GUIDE.md**: Step-by-step deployment instructions
- **docs/**: Detailed architecture and migration guides (if included)

### 🐛 Known Issues

None at this time.

### 🚀 Deployment

Tested and ready for:
- **Frontend**: Netlify (free tier)
- **Backend**: Render (free tier with sleep, or $7/mo always-on)
- **Total cost**: $0-$36/mo depending on usage

### 📋 Breaking Changes

This is the initial release - no breaking changes.

### 🔮 Future Enhancements

Potential improvements for future versions:
- Database export/import functionality
- Custom alert thresholds
- Historical PnL tracking
- Wallet comparison tool
- Mobile-optimized view
- Real-time WebSocket updates
- Multi-wallet portfolio aggregation

---

## Contributing

See [README.md](./README.md) for contribution guidelines.

## License

MIT License - see LICENSE file for details.
