# Multi-API Data Source Plan

## Overview

Currently, the dashboard fetches wallet data exclusively from **GMGN.ai**. This document outlines the architecture and plan for integrating additional wallet data sources.

---

## 🎯 Goal

Enable the dashboard to aggregate wallet data from multiple sources:
- **GMGN.ai** (current, real-time rankings)
- **Birdeye** (token analytics, wallet holdings)
- **DexScreener** (DEX trading data, trends)
- **Jupiter Protocol** (swap volume, arbitrage)
- **Raydium** (liquidity, trading pairs)

---

## 🏗 Architecture

### Current (Single Source)
```
Backend API
  └── Browserless.io
       └── GMGN.ai only
```

### Future (Multi-Source)
```
Backend API
  ├── GMGN Source
  │    └── Browserless.io → GMGN.ai
  ├── Birdeye Source
  │    └── Direct API → Birdeye
  ├── DexScreener Source
  │    └── Direct API → DexScreener
  ├── Jupiter Source
  │    └── Direct API → Jupiter
  └── Raydium Source
       └── Direct API → Raydium

Aggregation Layer
  ├── Merge wallet data
  ├── Normalize schemas
  ├── Score/rank by source
  └── Cache per-source results

Database
  ├── wallets (merged data)
  ├── wallets_gmgn (source-specific)
  ├── wallets_birdeye (source-specific)
  └── wallet_snapshots (merged snapshots)
```

---

## 📋 Implementation Plan

### Phase 1: Infrastructure Setup (Backend)

**Goal:** Create pluggable architecture for multiple sources.

#### 1.1 Create Source Interface
```typescript
// backend/sources/source.interface.ts
interface WalletSource {
  name: string;
  fetchWallets(chain: string, timeframe: string, tag?: string, limit?: number): Promise<Wallet[]>;
  fetchStats(chain: string, timeframe: string, tag?: string): Promise<Stats>;
  supported_chains: string[];
  supported_tags: string[];
  cache_ttl: number;
}
```

#### 1.2 Implement GMGN Source (Refactor)
```
backend/sources/
├── source.interface.ts      # Base interface
├── gmgn-source.ts           # Existing Browserless logic
├── birdeye-source.ts        # [New]
├── dexscreener-source.ts    # [New]
├── jupiter-source.ts        # [New]
└── raydium-source.ts        # [New]
```

#### 1.3 Create Aggregation Service
```
backend/services/
└── aggregation-service.ts
    ├── mergeSources()        # Combine results
    ├── normalizeSchema()     # Standard format
    ├── scoreBySource()       # Weight by reliability
    └── cachePerSource()      # Cache each source independently
```

---

### Phase 2: Add Birdeye

**Why:** Token holdings, portfolio analysis, risk metrics

**Endpoint:** `https://public-api.birdeye.so/v1/wallet`

**Example Request:**
```bash
curl "https://public-api.birdeye.so/v1/wallet/holdings?wallet=0x..." \
  -H "X-API-KEY: your_birdeye_key"
```

**Example Response:**
```json
{
  "data": {
    "items": [
      {
        "address": "0x...",
        "symbol": "USDC",
        "decimals": 6,
        "amount": 1000000,
        "uiAmount": 1000,
        "valueUsd": 1000
      }
    ],
    "totalUsd": 50000
  }
}
```

**Integration Points:**
- Fetch wallet holdings
- Calculate portfolio diversity
- Track token risk exposure
- Identify honeypots (unknown tokens)

---

### Phase 3: Add DexScreener

**Why:** DEX trading activity, transaction volume, trends

**Endpoint:** `https://api.dexscreener.com`

**Example Request:**
```bash
curl "https://api.dexscreener.com/latest/dex/tokens/sol?tokens=So11111111111111111111111111111111111111112"
```

**Example Response:**
```json
{
  "pairs": [
    {
      "baseToken": {
        "address": "So111...",
        "name": "Wrapped SOL",
        "symbol": "SOL"
      },
      "priceUsd": "250.50",
      "liquidity": {
        "usd": 50000000,
        "base": 100000,
        "quote": 25000000
      },
      "volume": {
        "h24": 500000
      }
    }
  ]
}
```

**Integration Points:**
- Track trading volume
- Analyze liquidity
- Identify low-liquidity tokens (rug pull risk)
- Monitor price volatility

---

### Phase 4: Add Jupiter & Raydium

**Why:** Swap volume, arbitrage opportunities, LP farming

**Endpoints:**
- Jupiter: `https://price.jup.ag/v4/price`
- Raydium: `https://api.raydium.io/v2`

---

## 🗄 Database Schema Updates

### Add Source Tracking
```sql
-- Extend wallets table
ALTER TABLE wallets ADD COLUMN sources TEXT[] DEFAULT ARRAY['gmgn'];
ALTER TABLE wallets ADD COLUMN source_scores JSONB DEFAULT '{"gmgn": 0.5}';

-- Track per-source data
CREATE TABLE wallets_gmgn (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT,
  chain TEXT,
  gmgn_data JSONB,
  synced_at TIMESTAMP
);

CREATE TABLE wallets_birdeye (
  id SERIAL PRIMARY KEY,
  wallet_address TEXT,
  chain TEXT,
  birdeye_data JSONB,
  holdings_count INT,
  total_usd DECIMAL,
  synced_at TIMESTAMP
);

-- Merged snapshots with source attribution
ALTER TABLE wallet_snapshots ADD COLUMN source TEXT DEFAULT 'gmgn';
ALTER TABLE wallet_snapshots ADD COLUMN confidence DECIMAL DEFAULT 0.5;
```

---

## 🔌 Frontend Changes

### Update Filter UI
```typescript
// Add source filter
const SOURCES = [
  { value: 'all', label: 'All Sources' },
  { value: 'gmgn', label: 'GMGN Only' },
  { value: 'birdeye', label: 'Birdeye Only' },
  { value: 'merged', label: 'Merged Data' }
];

// Show data origin badges
<Badge>{wallet.source}</Badge>
<Tooltip>Last synced: {wallet.gmgn_synced_at}</Tooltip>
```

### Update Analytics
```typescript
// Show per-source trends
<TrendChart sources={['gmgn', 'birdeye']} />

// Compare source data
<SourceComparison wallet={wallet} />
```

---

## 🔀 Data Merging Strategy

### Normalization
```typescript
interface NormalizedWallet {
  wallet_address: string;
  chain: string;
  pnl_7d?: number;              // GMGN
  holdings_usd?: number;        // Birdeye
  trading_volume_24h?: number;  // DexScreener
  portfolio_diversity?: number;
  
  // Source metadata
  sources: {
    gmgn: { score: 0.5, last_sync: Date };
    birdeye: { score: 0.3, last_sync: Date };
  };
}
```

### Scoring Algorithm
```typescript
function scoreWallet(data: NormalizedWallet): number {
  let score = 0;
  
  // Weight each source
  if (data.sources.gmgn) {
    score += data.pnl_7d * 0.5 * data.sources.gmgn.score;
  }
  if (data.sources.birdeye) {
    score += (data.holdings_usd / 100000) * 0.3 * data.sources.birdeye.score;
  }
  if (data.sources.dexscreener) {
    score += Math.log(data.trading_volume_24h) * 0.2;
  }
  
  return score;
}
```

---

## 📋 Checklist

### Phase 1: Infrastructure
- [ ] Design `source.interface.ts`
- [ ] Refactor GMGN into `gmgn-source.ts`
- [ ] Create `aggregation-service.ts`
- [ ] Update cache manager for per-source
- [ ] Add source to API response

### Phase 2: Birdeye
- [ ] Create `birdeye-source.ts`
- [ ] Add Birdeye API key to `.env`
- [ ] Implement holdings fetching
- [ ] Create `wallets_birdeye` table
- [ ] Merge with GMGN data
- [ ] Add confidence scoring

### Phase 3: DexScreener
- [ ] Create `dexscreener-source.ts`
- [ ] Fetch trading volume data
- [ ] Create `wallets_dexscreener` table
- [ ] Calculate liquidity risks
- [ ] Merge with existing data

### Phase 4: Jupiter + Raydium
- [ ] Create `jupiter-source.ts`
- [ ] Create `raydium-source.ts`
- [ ] Add swap volume tracking
- [ ] Create corresponding tables
- [ ] Implement arbitrage detection

### Phase 5: Frontend
- [ ] Add source filter UI
- [ ] Show source badges
- [ ] Add per-source trends
- [ ] Display confidence scores
- [ ] Source comparison page

---

## 🚀 Implementation Order

1. **Phase 1** (Week 1): Infrastructure setup
2. **Phase 2** (Week 2): Birdeye integration
3. **Phase 3** (Week 3): DexScreener integration
4. **Phase 4** (Week 4): Jupiter + Raydium
5. **Phase 5** (Week 5): Frontend updates

---

## ⚠️ Considerations

### Performance
- Each source adds ~10-30s fetch time
- Implement parallel fetching (Promise.all)
- Aggressive caching (30+ minutes per source)
- Lazy load less critical sources

### Cost
- Birdeye: Free tier (100 req/min)
- DexScreener: Free, no auth needed
- Jupiter: Free API
- Raydium: Free API
- **Total**: $0-50/month

### Complexity
- Merging logic can be complex
- Conflict resolution (different PnL values)
- Schema migrations needed
- Test coverage critical

---

## 📚 Resources

- [Birdeye API Docs](https://docs.birdeye.so/)
- [DexScreener API Docs](https://docs.dexscreener.com/)
- [Jupiter Docs](https://docs.jup.ag/)
- [Raydium Docs](https://docs.raydium.io/)

---

## 🎯 Success Metrics

- ✅ Wallet data from 3+ sources
- ✅ <5s aggregation time
- ✅ >95% data coverage across sources
- ✅ Confidence scoring visible in UI
- ✅ Users can filter by source
- ✅ Analytics work with merged data

---

**Last Updated**: November 12, 2025  
**Status**: Planning Phase
