# Backend API Documentation

## Overview

Express.js server providing wallet data from GMGN.ai via Browserless.io with Supabase persistence.

---

## 🏗 Architecture

```
server.js                     # Express setup, CORS, middleware
├── middleware/
│   └── auth.js             # X-API-Key validation
├── routes/
│   ├── health.js           # Health check
│   ├── wallets.js          # GET /api/wallets, /api/wallets/stats
│   ├── chains.js           # GET /api/chains
│   ├── tags.js             # GET /api/tags
│   ├── prefetch.js         # GET /api/prefetch (cache warm-up)
│   └── sync.js             # POST /api/sync (save to Supabase)
├── scraper/
│   ├── solver-browserless.js # Browserless.io integration
│   ├── fetcher.js          # GMGN API data fetching
│   └── cache.js            # In-memory caching
└── db/
    └── supabase.js         # Supabase client & operations
```

---

## 📡 API Routes

### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-11-12T10:00:00Z",
  "cacheStatus": "200 wallets cached (SOL 7d)"
}
```

### Fetch Wallets
```
GET /api/wallets?chain=sol&timeframe=7d&tag=all&page=1&limit=200
```

**Headers (required):**
```
X-API-Key: your_api_key
```

**Query params:**
- `chain`: eth, sol, bsc, base, blast, arb
- `timeframe`: 1d, 7d, 30d
- `tag`: all, smart_degen, pump_smart, renowned, snipe_bot
- `page`: pagination (1-indexed)
- `limit`: max results per page (default 50, max 200)

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
      "buy_30d": 450,
      "sell_30d": 45,
      "tags": ["smart_degen"],
      "risk": {...}
    }
  ],
  "metadata": {
    "total": 200,
    "cached": true,
    "cacheAge": 120
  }
}
```

### Get Stats
```
GET /api/wallets/stats?chain=sol&timeframe=7d&tag=all
```

Aggregates wallets: count, avg PnL, total profit, etc.

### Sync to Supabase
```
POST /api/sync
```

**Body:**
```json
{
  "chain": "sol",
  "timeframe": "7d",
  "tag": "all",
  "limit": 200
}
```

**Response:**
```json
{
  "success": true,
  "synced": 200,
  "failed": 0,
  "message": "Synced 200 wallets to Supabase"
}
```

**What happens:**
1. Fetches 200 wallets from GMGN API via Browserless
2. Upserts each wallet to `wallets` table
3. Batch-creates snapshots in `wallet_snapshots` table
4. Returns success count

---

## 🌐 GMGN API

**Endpoint:** `https://gmgn.ai/defi/quotation/v1/rank/{chain}/wallets/{timeframe}`

**Examples:**
```
https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/7d?limit=200
https://gmgn.ai/defi/quotation/v1/rank/eth/wallets/1d?limit=200
```

**Parameters:**
- `chain`: solana, ethereum, binancesmartchain, base, blast, arbitrum
- `timeframe`: 1d, 7d, 30d
- `tag`: [optional] tag to filter by (if not "all")
- `limit`: max 200

**Response data (per wallet):**
```json
{
  "address": "0x...",
  "pnl_7d": 0.1805,
  "pnl_30d": 0.2541,
  "realized_profit_7d": 29214.79,
  "realized_profit_30d": 45892.34,
  "winrate_7d": 0.72,
  "token_num_7d": 152,
  "buy_30d": 450,
  "sell_30d": 45,
  "tags": ["smart_degen"],
  "risk": {
    "honeypot_rate": 0.05,
    "rug_pull_rate": 0.02
  }
}
```

---

## 🔍 Browserless.io Integration

**File:** `scraper/solver-browserless.js`

### Functions

#### `getApiToken(attempt = 1)`
Returns API token with automatic failover.

**Logic:**
1. Try primary `BROWSERLESS_API_TOKEN`
2. Fall back to `BROWSERLESS_API_TOKEN_2`, `BROWSERLESS_API_TOKEN_3`
3. Supports up to 3 tokens for load balancing

#### `fetchWithBrowserless(url, options = {})`
Fetches URL via Browserless with retry logic.

**Options:**
```javascript
{
  method: 'POST',        // default: POST (for Browserless API)
  timeout: 30000,        // default: 30s
  retries: 3,            // max retries on 429
  waitSelector: null,    // wait for element
  proxy: 'residential'   // use residential proxy
}
```

**Retry logic:**
- On 429 (rate limit): exponential backoff (2s, 4s, 8s)
- On network error: instant retry
- Max 3 attempts

#### `fetchJSONWithBrowserless(url)`
Fetches JSON data, unwraps HTML errors.

**Special handling:**
- Parses Cloudflare error HTML
- Extracts JSON from `<pre>` tags
- Retries if pattern found

---

## 💾 Caching

**File:** `scraper/cache.js`

### In-Memory Cache
```javascript
cache.get(key)              // Returns value or null
cache.set(key, value, ttl)  // Store with TTL (seconds)
cache.del(key)              // Delete entry
cache.clear()               // Clear all
cache.has(key)              // Check existence
```

### Cache Keys
Format: `{chain}:{timeframe}:{tag}`

Examples:
- `sol:7d:all` - All SOL wallets 7d
- `eth:1d:smart_degen` - ETH smart_degen 1d
- `bsc:30d:all` - BSC all wallets 30d

### Cache Lock
Prevents thundering herd (multiple requests for same stale data).

```javascript
const lock = cache.acquireLock(key);  // Blocks until available
// ... fetch data ...
cache.releaseLock(key);
```

**Behavior:**
1. First request acquires lock, fetches data
2. Other requests wait for lock release
3. Returns cached data after release

---

## 🗄 Supabase Integration

**File:** `db/supabase.js`

### Wallet Operations

#### `upsertWallet(wallet)`
Inserts or updates wallet in `wallets` table.

```javascript
await upsertWallet({
  wallet_address: '0x...',
  chain: 'sol',
  data: {/* full GMGN response */},
  metadata: {/* key metrics */}
});
```

#### `getWallets(chain, limit)`
Retrieves wallets from Supabase.

```javascript
const wallets = await getWallets('sol', 200);
```

### Snapshot Operations

#### `createSnapshot(wallet_address, chain, data, metrics)`
Creates a single snapshot (slow, use batch).

#### `createSnapshotsBatch(snapshots)`
Batch-creates snapshots (fast).

```javascript
await createSnapshotsBatch([
  {
    wallet_address: '0x...',
    chain: 'sol',
    snapshot_data: {/* full wallet JSON */},
    metrics: {/* key metrics */},
    snapped_at: new Date().toISOString()
  },
  // ... more wallets
]);
```

### Database Tables

#### `wallets`
```sql
wallet_address TEXT PRIMARY KEY
chain TEXT
data JSONB          -- Full GMGN response
metadata JSONB      -- Key metrics (PnL, profit, tokens, etc)
synced_at TIMESTAMP
```

#### `wallet_snapshots`
```sql
id BIGSERIAL PRIMARY KEY
wallet_address TEXT
chain TEXT
snapshot_data JSONB -- Full wallet state at snapshot
metrics JSONB       -- Key metrics at time of snapshot
snapped_at TIMESTAMP
```

---

## 🔐 Security

### Authentication
All routes require `X-API-Key` header (middleware: `auth.js`).

**Logic:**
```javascript
const apiKey = req.headers['x-api-key'];
if (apiKey !== process.env.API_KEY) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

### CORS
Configured to accept requests only from frontend domain.

```javascript
app.use(cors({
  origin: function(origin, callback) {
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      callback(null, true);
    } else {
      callback(new Error('CORS not allowed'));
    }
  }
}));
```

### Rate Limiting
Frontend implements rate limiting (not backend). Backend trusts frontend.

---

## 🚀 Environment Variables

```bash
# Required
BROWSERLESS_API_TOKEN=your_primary_token
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
API_KEY=your_secret_api_key

# Optional - Backup tokens
BROWSERLESS_API_TOKEN_2=backup_token_1
BROWSERLESS_API_TOKEN_3=backup_token_2

# Configuration
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend.netlify.app
CACHE_TTL=300           # Seconds
```

---

## 📊 Performance

| Operation | Time |
|-----------|------|
| Fetch (Browserless) | 15-30s |
| Cache hit | <1ms |
| Upsert 200 wallets | ~2s |
| Batch snapshots | ~3s |
| Total sync | ~5-7s |

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| 401 Unauthorized | Check X-API-Key header |
| 429 Too Many Requests | Browserless rate limit, retrying... |
| CORS error | Verify FRONTEND_URL env var |
| Timeouts | Increase timeout in Browserless options |
| Memory issues | Increase Node.js heap size |

---

## 🔌 Adding New Data Sources

See `docs/API_SOURCES.md` for plans to add:
- Birdeye API
- DexScreener API
- Jupiter Protocol
- Raydium

---

**Last Updated**: November 12, 2025
