# Multi-Source API Integration Plan 🚀

## Status: Ready for Input

All documentation is complete. The codebase is ready to support multiple wallet data sources.

---

## 📋 Next Steps: We Need Your Input

To proceed with adding new wallet data sources, **please provide for each source:**

### For Each API You Want to Add:

**1. Example URL(s)**
```
What is the API endpoint?
Example: https://api.birdeye.so/v1/wallet/holdings?wallet=0x...
```

**2. API Authentication**
```
How do we authenticate?
- API Key in header? (name?)
- No auth needed?
- OAuth?
- Query parameter?
```

**3. Example JSON Response**
```json
{
  // Paste a real or sample response here
  // Include all fields relevant to wallet analysis
}
```

**4. Context & Purpose**
```
Why do we need this source?
- Portfolio holdings analysis
- Trading volume tracking
- Liquidity analysis
- PnL verification
- Other?
```

**5. Rate Limits**
```
What are the limits?
- Requests per minute?
- Free tier available?
- Cost?
```

---

## 🎯 Recommended Sources

Based on the plan in `docs/API_SOURCES.md`, we recommend these in order:

### 1. **Birdeye** (Priority: HIGH)
- **Why**: Portfolio holdings, token diversity, asset value
- **Use case**: See what each wallet owns, total portfolio value
- **Status**: Need example response

### 2. **DexScreener** (Priority: MEDIUM)
- **Why**: DEX trading volume, liquidity, token trends
- **Use case**: Identify low-liquidity tokens (rug pull risk)
- **Status**: Need example response

### 3. **Jupiter Protocol** (Priority: MEDIUM)
- **Why**: Swap volume, arbitrage detection
- **Use case**: Track trading activity, spot arbitrage wallets
- **Status**: Need example response

### 4. **Raydium** (Priority: LOW)
- **Why**: Liquidity pools, yield farming
- **Use case**: Track LP positions, farm profits
- **Status**: Need example response

### 5. **Other Sources?**
- Phantom Analytics?
- Magic Eden?
- Orca?
- SolScan?
- Let us know!

---

## 📊 Example Format

For reference, here's what GMGN provides:

**Endpoint:**
```
https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/7d?limit=200
```

**Sample Response (per wallet):**
```json
{
  "address": "BnVPwTFjCdsB7iVaQLuXAKj589T4k1jFRu8827X3Aw12",
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

**Context:**
- Rates wallets by profit/PnL over time
- Shows win rate and token activity
- Risk scoring built-in
- Works across all chains (SOL, ETH, BSC, etc)

---

## 🏗 Architecture Ready

The backend is designed to support multiple sources:

```
backend/sources/
├── source.interface.ts        # Pluggable interface
├── gmgn-source.ts            # ✅ Implemented
├── birdeye-source.ts         # 🔄 Ready to implement
├── dexscreener-source.ts     # 🔄 Ready to implement
├── jupiter-source.ts         # 🔄 Ready to implement
└── raydium-source.ts         # 🔄 Ready to implement
```

Each source implements:
- `fetchWallets(chain, timeframe, tag, limit)`
- `fetchStats(chain, timeframe, tag)`
- `supported_chains[]`
- `supported_tags[]`
- `cache_ttl`

---

## 🎁 What You Get

Once you provide the API details, we'll:

1. ✅ Create source adapter for each API
2. ✅ Implement authentication & error handling
3. ✅ Add to aggregation service
4. ✅ Create database tables for per-source data
5. ✅ Add confidence scoring
6. ✅ Update frontend with source filter + comparison
7. ✅ Implement parallel fetching (fast!)
8. ✅ Add per-source caching
9. ✅ Update analytics to show merged data
10. ✅ Comprehensive tests

---

## 📞 Please Provide

For each source you want to add, reply with:

```
Source Name: [Name]
Endpoint: [URL]
Auth Method: [How to authenticate]
Example URL: [A specific example]
Example Response:
[Paste JSON here]
Use Cases: [What does this add to the dashboard?]
Rate Limits: [Requests/min, pricing]
```

---

## 🔗 Useful Resources

**Already documented in** `docs/API_SOURCES.md`:
- Birdeye API Docs: https://docs.birdeye.so/
- DexScreener API Docs: https://docs.dexscreener.com/
- Jupiter Docs: https://docs.jup.ag/
- Raydium Docs: https://docs.raydium.io/

---

## ⏱ Timeline

Once you provide the data:
- **Phase 1**: 1-2 hours per source (implementation)
- **Phase 2**: 30 mins per source (testing)
- **Phase 3**: 1 hour (frontend integration)
- **Total**: 2-3 hours per source

---

**Next Step**: Reply with example URLs and JSON responses for the sources you want to add!

**Documentation**: See `docs/API_SOURCES.md` for detailed architecture and implementation plan.
