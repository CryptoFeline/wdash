import { fetchJSONWithBrowserless } from './solver-browserless.js';

/**
 * Fetch GMGN.ai wallet data using Browserless.io API
 * 
 * Replaces puppeteer-core + @sparticuz/chromium with Browserless /unblock REST API:
 * - 95%+ success rate (vs 50% with datacenter IPs)
 * - 3-5 second responses (vs 60-90s with local puppeteer)
 * - No Chromium binary (~50MB savings)
 * - No bundling issues
 * - Managed browser pool with residential proxies
 * 
 * @param {Object} options - Fetch options
 * @param {string} options.chain - Blockchain (eth, sol, bsc, etc.)
 * @param {string} options.timeframe - Time period (1d, 7d, 30d)
 * @param {string|null} options.tag - Tag filter (smart_degen, pump_smart, renowned, snipe_bot, null for unfiltered)
 * @param {number} options.limit - Max results (default 200)
 * @returns {Promise<Object>} API response with wallet data
 */
export async function fetchGMGNData({ chain = 'eth', timeframe = '7d', tag = null, limit = 200 }) {
  // Build API URL - tag=null means no tag filter (all wallets)
  const tagParam = tag ? `?tag=${tag}&limit=${limit}` : `?limit=${limit}`;
  const apiUrl = `https://gmgn.ai/defi/quotation/v1/rank/${chain}/wallets/${timeframe}${tagParam}`;

  console.log(`[Fetcher] Fetching via Browserless: ${apiUrl}`);

  // Fetch through Browserless /unblock API with residential proxy
  const data = await fetchJSONWithBrowserless(apiUrl, {
    useProxy: true,          // Use residential proxy (6 units/MB, 95%+ success)
    waitForTimeout: 8000,    // Wait 8s for Cloudflare to pass
    waitUntil: 'networkidle2', // Wait for network idle
    maxRetries: 3            // Retry up to 3 times
  });

  console.log(`[Fetcher] Successfully fetched ${data.data?.rank?.length || 0} wallets (tag: ${tag || 'unfiltered'})`);

  return data;
}

/**
 * Fetch all tags in parallel and deduplicate
 * 
 * With Browserless.io:
 * - No ETXTBSY errors (no local browser process)
 * - No sequential delays needed (managed browser pool)
 * - Faster execution (parallel fetching)
 * - Built-in rate limiting and retry logic
 * 
 * @param {string} chain - Blockchain
 * @param {string} timeframe - Time period
 * @param {number} limit - Max results per tag
 * @returns {Promise<Array>} Deduplicated array of wallets
 */
export async function fetchAllTags(chain = 'eth', timeframe = '7d', limit = 200) {
  const TAGS = ['smart_degen', 'pump_smart', 'renowned', 'snipe_bot'];

  console.log(`[Multi-Fetch] Fetching ${TAGS.length} tags in parallel via Browserless...`);

  // With Browserless, we can safely fetch in parallel (no ETXTBSY, managed pool)
  const promises = TAGS.map(tag =>
    fetchGMGNData({ chain, timeframe, tag, limit })
      .catch(err => {
        console.error(`[Multi-Fetch] Failed to fetch tag "${tag}":`, err.message);
        return { data: { rank: [] } }; // Return empty on error
      })
  );

  const results = await Promise.all(promises);

  // Combine all results
  const allWallets = results.flatMap(r => r.data?.rank || []);
  console.log(`[Multi-Fetch] Total records fetched: ${allWallets.length}`);

  // Deduplicate by wallet_address
  const uniqueMap = new Map();

  for (const wallet of allWallets) {
    const addr = wallet.wallet_address;

    if (!uniqueMap.has(addr)) {
      // First occurrence - keep as is
      uniqueMap.set(addr, wallet);
    } else {
      // Duplicate found - merge tags
      const existing = uniqueMap.get(addr);

      // Combine tags arrays (unique)
      const combinedTags = [...new Set([...existing.tags, ...wallet.tags])];
      existing.tags = combinedTags;

      // Merge tag_rank objects
      existing.tag_rank = {
        ...existing.tag_rank,
        ...wallet.tag_rank
      };
    }
  }

  const uniqueWallets = Array.from(uniqueMap.values());
  console.log(`[Multi-Fetch] After deduplication: ${uniqueWallets.length} unique wallets`);

  return uniqueWallets;
}

/**
 * Calculate composite score for wallet ranking
 * @param {Object} wallet - Wallet data
 * @returns {number} Score (0-1)
 */
export function calculateScore(wallet) {
  const weights = {
    pnl: 0.35,        // 35% weight to PnL %
    profit: 0.25,     // 25% weight to absolute profit
    winrate: 0.20,    // 20% weight to win rate
    moonshots: 0.15,  // 15% weight to 5x+ trades
    consistency: 0.05 // 5% weight to daily activity
  };

  // Normalize values (0-1 range)
  const normalized = {
    pnl: Math.min(wallet.pnl_7d / 10, 1),                       // Cap at 1000%
    profit: Math.min(wallet.realized_profit_7d / 50000, 1),     // Cap at $50k
    winrate: wallet.winrate_7d || 0,                            // Already 0-1
    moonshots: wallet.pnl_gt_5x_num_7d_ratio || 0,              // Already 0-1
    consistency: wallet.daily_profit_7d
      ? wallet.daily_profit_7d.filter(d => d.profit > 0).length / 7
      : 0
  };

  // Weighted sum
  const score =
    normalized.pnl * weights.pnl +
    normalized.profit * weights.profit +
    normalized.winrate * weights.winrate +
    normalized.moonshots * weights.moonshots +
    normalized.consistency * weights.consistency;

  return score;
}

/**
 * Apply quality filters to wallets
 * @param {Array} wallets - Array of wallets
 * @returns {Array} Filtered wallets
 */
export function filterQualityWallets(wallets) {
  console.log(`[Filter] Starting with ${wallets.length} wallets`);
  
  const filtered = wallets.filter(w => {
    const risk = w.risk || {};
    
    // Parse string values to numbers
    const pnl = typeof w.pnl_7d === 'string' ? parseFloat(w.pnl_7d) : w.pnl_7d;
    const profit = typeof w.realized_profit_7d === 'string' ? parseFloat(w.realized_profit_7d) : w.realized_profit_7d;
    const winrate = typeof w.winrate_7d === 'string' ? parseFloat(w.winrate_7d) : w.winrate_7d;
    
    // Very minimal filtering - just remove obviously bad wallets
    return (
      pnl !== null &&
      !isNaN(pnl) &&
      pnl > -0.5 &&                                  // Not losing more than 50%
      w.last_active > (Date.now() / 1000) - 86400 * 30 // Active in last 30 days (very relaxed)
    );
  });
  
  console.log(`[Filter] After quality filtering: ${filtered.length} wallets (${((filtered.length / wallets.length) * 100).toFixed(1)}% pass rate)`);
  return filtered;
}

/**
 * Rank wallets by composite score
 * @param {Array} wallets - Array of wallets
 * @returns {Array} Ranked wallets with scores
 */
export function rankWallets(wallets) {
  return wallets
    .map(w => ({
      ...w,
      score: calculateScore(w)
    }))
    .sort((a, b) => b.score - a.score);
}
