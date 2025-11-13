# GMGN API Response Schema Documentation

**Last Updated:** November 13, 2025  
**Source:** `backend/scripts/test-fetch.js` audit  
**Data:** Sample wallet from GMGN API (Solana, 7-day timeframe)  

---

## Overview

The GMGN API returns **53 fields** per wallet object. This document outlines all available fields, their types, examples, and whether they are currently being saved to the Supabase database.

**Total Fields:** 53  
- Primitive types: 48 (strings, numbers, booleans)  
- Objects: 2 (nested structures)  
- Arrays: 3 (lists of data)  

---

## Field Reference

### Core Wallet Identity

| Field | Type | Example | Saved? | Notes |
|-------|------|---------|--------|-------|
| `wallet_address` | string | `"Am7cQBDHioshkx9iPXf4kQbKzmqF7fzjcSkD4drXGj4U"` | ✅ | Primary wallet identifier |
| `address` | string | `"Am7cQBDHioshkx9iPXf4kQbKzmqF7fzjcSkD4drXGj4U"` | ✅ | Duplicate of wallet_address |

### Social & Profile

| Field | Type | Example | Saved? | Notes |
|-------|------|---------|--------|-------|
| `twitter_username` | string | `"boldkay"` | ✅ | Twitter handle |
| `twitter_name` | string | `"Lesli Kay"` | ✅ | Twitter display name |
| `twitter_description` | string | `""` | ✅ | Twitter bio |
| `followers_count` | number | `6563` | ✅ | Twitter follower count |
| `is_blue_verified` | number | `0` | ✅ | Twitter blue check status |
| `avatar` | string | `"https://gmgn.ai/defi/images/twitter/..."` | ✅ | Avatar URL from Twitter |
| `name` | string | `"Lesli Kay"` | ✅ | Display name |
| `nickname` | string/null | `null` | ✅ | Custom nickname |
| `ens` | string/null | `null` | ✅ | ENS domain if available |
| `tag` | string/null | `null` | ✅ | User-assigned tag |
| `tag_rank` | object | `{"kol": 0}` | ✅ | Rank within tag (see nested) |
| `tags` | array | `["kol"]` | ✅ | Array of assigned tags |
| `twitch_channel_name` | string/null | `null` | ✅ | Twitch channel if linked |

### Performance Metrics (7-Day)

| Field | Type | Example | Saved? | Notes |
|-------|------|---------|--------|-------|
| `pnl_7d` | string | `"6.8920521748976043"` | ✅ | Profit/Loss % (decimal as string) |
| `realized_profit_7d` | string | `"26740533.36472026870670195924"` | ✅ | Realized profit in USD (string precision) |
| `daily_profit_7d` | array | `[{timestamp, profit}, ...]` | ✅ | Daily profit breakdown (7 days) |
| `token_num_7d` | number | `687` | ✅ | Number of tokens traded |
| `avg_holding_period_7d` | number | `481.49068322981367` | ✅ | Average hold time in seconds |
| `avg_cost_7d` | number | `2989.14...` | ✅ | Average cost per trade |
| `winrate_7d` | number | `0.9984399375975039` | ✅ | Win rate as decimal (0-1) |

### Performance Metrics (30-Day)

| Field | Type | Example | Saved? | Notes |
|-------|------|---------|--------|-------|
| `pnl_30d` | string | `"5.0144089322192393"` | ✅ | Profit/Loss % (30-day) |
| `realized_profit_30d` | string | `"26828537.86409484246424755755"` | ✅ | Realized profit 30-day |
| `buy_30d` | number | `9000` | ✅ | Buy transactions (30-day) |
| `sell_30d` | number | `8950` | ✅ | Sell transactions (30-day) |
| `txs_30d` | number | `17950` | ✅ | Total transactions (30-day) |

### Performance Metrics (1-Day)

| Field | Type | Example | Saved? | Notes |
|-------|------|---------|--------|-------|
| `pnl_1d` | string | `"8.4050312606569229"` | ✅ | Profit/Loss % (1-day) |
| `realized_profit_1d` | string | `"11053672.63987660946109907"` | ✅ | Realized profit (1-day) |

### Trade Statistics

| Field | Type | Example | Saved? | Notes |
|-------|------|---------|--------|-------|
| `buy` | number | `1298` | ✅ | Total buy transactions (all-time) |
| `sell` | number | `85` | ✅ | Total sell transactions (all-time) |
| `txs` | number | `1383` | ✅ | Total transactions (all-time) |
| `avg_hold_time` | number | `0` | ✅ | Average hold time (all-time) |

### Wallet Balance & Assets

| Field | Type | Example | Saved? | Notes |
|-------|------|---------|--------|-------|
| `balance` | number | `90.852178` | ✅ | Primary balance (SOL) |
| `sol_balance` | number | `90.852178` | ✅ | Solana balance |
| `eth_balance` | number | `90.852178` | ✅ | Ethereum balance (if multi-chain) |
| `trx_balance` | number | `90.852178` | ✅ | Tron balance (if multi-chain) |

### Activity Tracking

| Field | Type | Example | Saved? | Notes |
|-------|------|---------|--------|-------|
| `last_active` | number | `1763025565` | ✅ | Unix timestamp of last activity |
| `follow_count` | number | `180` | ✅ | Number of followers/followers this wallet |
| `remark_count` | number | `0` | ✅ | Number of remarks/notes |

### Unrealized & Historical

| Field | Type | Example | Saved? | Notes |
|-------|------|---------|--------|-------|
| `realized_profit` | number | `-15151.31...` | ✅ | All-time realized profit |
| `recent_buy_tokens` | array | `[]` | ✅ | Recently bought tokens (empty in sample) |

### PnL Distribution (7-Day)

| Field | Type | Example | Saved? | Notes |
|-------|------|---------|--------|-------|
| `pnl_lt_minus_dot5_num_7d` | number | `1` | ✅ | Count of trades < -50% loss |
| `pnl_lt_minus_dot5_num_7d_ratio` | number | `0.2314...` | ✅ | Ratio of < -50% loss trades |
| `pnl_minus_dot5_0x_num_7d` | number | `0` | ✅ | Count of -50% to 0% loss trades |
| `pnl_minus_dot5_0x_num_7d_ratio` | number | `0` | ✅ | Ratio of -50% to 0% trades |
| `pnl_lt_2x_num_7d` | number | `295` | ✅ | Count of 0% to 2x gain trades |
| `pnl_lt_2x_num_7d_ratio` | number | `0.4294...` | ✅ | Ratio of < 2x trades |
| `pnl_2x_5x_num_7d` | number | `189` | ✅ | Count of 2x to 5x gain trades |
| `pnl_2x_5x_num_7d_ratio` | number | `0.2751...` | ✅ | Ratio of 2x-5x trades |
| `pnl_gt_5x_num_7d` | number | `159` | ✅ | Count of > 5x gain trades |
| `pnl_gt_5x_num_7d_ratio` | number | `0.2314...` | ✅ | Ratio of > 5x trades |

---

## Nested Objects

### `risk` (Risk Analysis Object)

Contains risk metrics about the wallet:

```json
{
  "token_active": "690",           // Number of active tokens
  "token_honeypot": "0",           // Number of honeypot tokens found
  "token_honeypot_ratio": 0,       // Ratio of honeypots (0-1)
  "no_buy_hold": "2",              // Tokens with no buy history but held
  "no_buy_hold_ratio": 0.00289..., // Ratio of no-buy-hold tokens
  "sell_pass_buy": "0",            // Tokens where sell > buy (suspicious)
  "sell_pass_buy_ratio": 0,        // Ratio of suspicious sells
  "fast_tx": "97",                 // Number of fast/bot-like transactions
  "fast_tx_ratio": 0.1405...       // Ratio of fast transactions
}
```

| Sub-field | Type | Saved? | Purpose |
|-----------|------|--------|---------|
| `token_active` | string | ✅ | Active token count |
| `token_honeypot` | string | ✅ | Honeypot count |
| `token_honeypot_ratio` | number | ✅ | Honeypot ratio |
| `no_buy_hold` | string | ✅ | Tokens with no buy |
| `no_buy_hold_ratio` | number | ✅ | Ratio of no-buy tokens |
| `sell_pass_buy` | string | ✅ | Suspicious sell count |
| `sell_pass_buy_ratio` | number | ✅ | Suspicious sell ratio |
| `fast_tx` | string | ✅ | Fast transaction count |
| `fast_tx_ratio` | number | ✅ | Fast transaction ratio |

### `tag_rank` (Tag Ranking Object)

Contains ranking within assigned tags:

```json
{
  "kol": 0  // Rank within KOL (Key Opinion Leader) category
}
```

| Sub-field | Type | Saved? | Purpose |
|-----------|------|--------|---------|
| `kol` | number | ✅ | KOL ranking |

---

## Arrays

### `daily_profit_7d` (Array of Daily Profits)

7-day breakdown of daily profits:

```json
[
  {
    "timestamp": 1762387200,
    "profit": "5361.86590447463895730095"
  },
  {
    "timestamp": 1762473600,
    "profit": "9099.5599088120913958231"
  },
  // ... 5 more days
]
```

| Field | Type | Purpose |
|-------|------|---------|
| `timestamp` | number | Unix timestamp of day |
| `profit` | string | Daily profit in USD (string for precision) |

**Status:** ✅ Currently saved

### `tags` (Array of Tag Strings)

List of tags assigned to the wallet:

```json
["kol", "whale", "bot_detector", ...]
```

| Item | Type | Purpose |
|------|------|---------|
| Each item | string | Tag name |

**Status:** ✅ Currently saved

### `recent_buy_tokens` (Array of Recent Buys)

Recently purchased tokens (empty in most samples):

```json
[]  // Empty if no recent activity
```

**Status:** ✅ Currently saved

---

## Data Type Notes

### String vs Number for Prices/Percentages

⚠️ **Important:** GMGN returns some numeric values as **strings** to preserve precision:
- `pnl_7d`: String (e.g., `"6.892..."`)
- `realized_profit_7d`: String (e.g., `"26740533.36472..."`)
- `realized_profit_1d`: String (e.g., `"11053672.639..."`)
- `realized_profit_30d`: String (e.g., `"26828537.864..."`)

**Why?** JavaScript numbers lose precision with very large values. Strings preserve the full value.

**Handling:** When saving to database, strings are preserved as-is. When displaying, convert to numbers or format as strings with decimals.

### Ratio Fields

Win rates and ratio fields are stored as **decimals (0-1)**, not percentages (0-100):
- `winrate_7d: 0.998...` = 99.8% win rate
- `token_honeypot_ratio: 0` = 0% honeypots

**Handling:** Multiply by 100 to convert to percentage for display.

### Timestamps

`last_active` is a Unix timestamp (seconds since epoch):
- `1763025565` = November 13, 2025 around 09:59:25 UTC

**Handling:** Convert to milliseconds for JavaScript Date objects: `new Date(timestamp * 1000)`

---

## Current Database Schema vs GMGN Response

### What IS Being Saved ✅

All 53 fields are currently being saved to the Supabase `wallets.data` JSONB column:

- ✅ `wallet_address`, `address`
- ✅ All social/profile fields
- ✅ All performance metrics (1d, 7d, 30d)
- ✅ All trade statistics
- ✅ All balance/asset fields
- ✅ All risk analysis fields
- ✅ All PnL distribution fields
- ✅ `daily_profit_7d` array
- ✅ `tags` and `tag_rank` arrays
- ✅ All nested objects

### What IS Working ✅

The full wallet object is being stored as-is in `wallet.data`:

```sql
SELECT data FROM wallets LIMIT 1;
-- Returns: {all 53 fields in JSON}
```

**Frontend displays:**
- ✅ Basic fields (address, win rate, PnL)
- ✅ Risk metrics (from `risk` object)
- ✅ Daily profit chart (from `daily_profit_7d` array)

---

## Optimization Notes

### Size Considerations

Each wallet object is approximately **1.5-3 KB** including all fields:
- 500 wallets = ~750 KB - 1.5 MB
- 1000 wallets = ~1.5 MB - 3 MB

**Supabase pricing:** 8 GB included, so storage is not a concern.

### Query Performance

The `wallet.data` JSONB column supports efficient queries:

```sql
-- Query by specific field
SELECT * FROM wallets WHERE data->>'wallet_address' = 'xxx';

-- Query nested objects
SELECT * FROM wallets WHERE (data->'risk'->>'token_honeypot_ratio')::float > 0.5;

-- All queries use index on wallet_address for speed
```

---

## API Response Example

**Endpoint:** `https://gmgn.ai/defi/quotation/v1/rank/sol/wallets/7d?limit=5`

**Response Structure:**
```json
{
  "code": 0,
  "data": {
    "rank": [
      { /* 53 fields for wallet 1 */ },
      { /* 53 fields for wallet 2 */ },
      { /* ... */ }
    ],
    "updateTime": 1763025600  // Timestamp of last update
  }
}
```

---

## Metadata Captured

In addition to the 53 GMGN fields, we also save:

| Field | Location | Purpose |
|-------|----------|---------|
| `wallet_address` | `wallets.wallet_address` | Primary key |
| `chain` | `wallets.chain` | Blockchain (sol, eth, etc) |
| `last_synced` | `wallets.last_synced` | When this record was updated |
| Full GMGN object | `wallets.data` | All 53 fields in JSONB |

---

## Usage in Frontend

### Accessing Common Fields

```typescript
// Direct properties (from wallets table)
const { wallet_address, chain, last_synced } = wallet;

// From wallet.data JSON
const { 
  pnl_7d,           // "6.892..."
  realized_profit_7d,   // "26740533.364..."
  daily_profit_7d,  // [{timestamp, profit}, ...]
  risk,             // {token_active, token_honeypot, ...}
  winrate_7d,       // 0.998...
  followers_count,
  tags,
} = wallet.data;

// Convert string percentage to number
const pnlPercent = parseFloat(wallet.data.pnl_7d);

// Convert win rate decimal to percentage
const winRatePercent = wallet.data.winrate_7d * 100;
```

### Frontend Filters Using These Fields

- **PnL Filter:** Uses `pnl_7d`, `pnl_30d`, `pnl_1d`
- **Profit Filter:** Uses `realized_profit_7d`, `realized_profit_30d`
- **Token Count Filter:** Uses `token_num_7d`
- **Hold Time Filter:** Uses `avg_holding_period_7d` (in seconds)
- **Rug Pull Filter:** Uses `risk.sell_pass_buy_ratio`
- **Win Rate Filter:** Uses `winrate_7d` (needs to be added)

---

## Summary

✅ **All 53 fields from GMGN API are being captured and saved to Supabase**

No fields are missing. The database is comprehensive and contains:
- Complete wallet identity & social data
- Full performance metrics (1d, 7d, 30d)
- Detailed risk analysis
- Daily profit breakdown
- All necessary metadata

The frontend can access any field for analytics, filtering, or display.
