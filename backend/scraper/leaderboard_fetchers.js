import axios from 'axios';

const OKX_CHAIN_ID = 501; // Solana
const CMC_PLATFORM_ID = 16; // Solana

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

/**
 * Fetch top traders from OKX Leaderboard
 * Fetches 200 wallets (10 pages of 20)
 */
export async function fetchOKXLeaderboard() {
  const wallets = [];
  const limit = 20;
  const totalWallets = 200;
  const iterations = totalWallets / limit;

  console.log(`[OKX] Fetching top ${totalWallets} traders...`);

  for (let i = 0; i < iterations; i++) {
    const rankStart = i * limit;
    const rankEnd = rankStart + limit;
    
    // periodType=3 (7D), rankBy=1 (Profit)
    const url = `https://web3.okx.com/priapi/v1/dx/market/v2/smartmoney/ranking/content?chainId=${OKX_CHAIN_ID}&rankStart=${rankStart}&periodType=3&rankBy=1&label=all&desc=true&rankEnd=${rankEnd}`;
    
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Referer': 'https://www.okx.com/',
          'Origin': 'https://www.okx.com'
        }
      });

      if (response.data && response.data.code === 0 && response.data.data && response.data.data.rankingInfos) {
        const batch = response.data.data.rankingInfos.map((trader, index) => ({
          rank: rankStart + index + 1, // Add rank (1-based)
          address: trader.walletAddress,
          pnl_7d: parseFloat(trader.pnl || 0),
          realized_profit_7d: parseFloat(trader.pnl || 0), // OKX gives total PnL
          winrate_7d: parseFloat(trader.winRate || 0) / 100, // OKX is 0-100
          tags: trader.labels || [],
          source: 'okx',
          roi_7d: parseFloat(trader.roi || 0) / 100, // OKX is percentage (e.g. 383.76)
          txs_7d: trader.tx,
          volume_7d: parseFloat(trader.volume || 0),
          // Add extra fields to match GMGN structure where possible
          updated_at: Math.floor(Date.now() / 1000),
          // Fill missing fields with null/0 to match Wallet interface
          pnl_30d: null,
          realized_profit_30d: null,
          buy_30d: 0,
          sell_30d: 0,
          token_num_7d: 0,
          risk: null
        }));
        wallets.push(...batch);
        console.log(`[OKX] Fetched batch ${i+1}/${iterations} (${batch.length} wallets)`);
      } else {
        console.warn(`[OKX] Failed to fetch batch ${i+1}: Invalid response format`);
      }
      
      // Rate limit pause (500ms)
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`[OKX] Error fetching batch ${i+1}:`, error.message);
    }
  }
  
  return wallets;
}

/**
 * Fetch top traders from CoinMarketCap Leaderboard
 * Fetches ~100 wallets
 */
export async function fetchCMCLeaderboard() {
  console.log(`[CMC] Fetching top traders...`);
  // period=7d, platformId=16 (Solana)
  const url = `https://dapi.coinmarketcap.com/dex/v1/profit/top-trader?period=7d&platformId=${CMC_PLATFORM_ID}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Referer': 'https://coinmarketcap.com/',
        'Origin': 'https://coinmarketcap.com'
      }
    });

    if (response.data && response.data.data && response.data.data.topTraderList) {
      const wallets = response.data.data.topTraderList.map((trader, index) => ({
        rank: index + 1, // Add rank (1-based)
        address: trader.wa,
        pnl_7d: trader.tp, // Total Profit
        realized_profit_7d: trader.rp,
        winrate_7d: trader.wr, // CMC is 0-1
        tags: [], // CMC doesn't give tags
        source: 'cmc',
        roi_7d: trader.roi, // CMC is ratio (e.g. 0.777)
        txs_7d: trader.ttc,
        volume_7d: trader.tvUsd,
        updated_at: Math.floor(Date.now() / 1000),
        // Fill missing fields
        pnl_30d: null,
        realized_profit_30d: null,
        buy_30d: 0,
        sell_30d: 0,
        token_num_7d: 0,
        risk: null
      }));
      console.log(`[CMC] Fetched ${wallets.length} wallets`);
      return wallets;
    } else {
      console.warn(`[CMC] Invalid response format`);
      return [];
    }
  } catch (error) {
    console.error(`[CMC] Error fetching:`, error.message);
    return [];
  }
}
