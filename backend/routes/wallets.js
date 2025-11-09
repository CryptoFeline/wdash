import express from 'express';
import { filterQualityWallets, rankWallets } from '../scraper/fetcher.js';
import { getCacheKey, getCache, setCache, acquireLock, releaseLock } from '../scraper/cache.js';

const router = express.Router();

/**
 * GET /api/wallets
 * Fetch and paginate wallet data
 * Query params: chain, timeframe, tag, page, limit
 */
router.get('/', async (req, res) => {
  try {
    const chain = req.query.chain || 'eth';
    const timeframe = req.query.timeframe || '7d';
    const tag = req.query.tag || 'all';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const cacheOnly = req.query.cacheOnly === 'true'; // Don't fetch if not cached

    console.log(`[API] GET /api/wallets - chain: ${chain}, timeframe: ${timeframe}, tag: ${tag}, page: ${page}${cacheOnly ? ' (cache-only)' : ''}`);

    // Check cache
    const cacheKey = getCacheKey(chain, timeframe, tag);
    let allWallets = getCache(cacheKey);

    if (!allWallets && cacheOnly) {
      // Cache-only mode: return empty if not cached
      return res.json({
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        message: 'Data not cached yet. Trigger /api/prefetch to warm cache.'
      });
    }

    if (!allWallets) {
      // Acquire lock to prevent concurrent fetches (ETXTBSY)
      const waitPromise = await acquireLock(cacheKey);
      
      if (waitPromise) {
        // Another request is fetching, wait for it
        await waitPromise;
        // Check cache again after waiting
        allWallets = getCache(cacheKey);
        if (allWallets) {
          console.log(`[API] Got data from concurrent fetch`);
        }
      }
      
      // If still no data, fetch it (we have the lock)
      if (!allWallets) {
        try {
          console.log(`[API] Fetching fresh data for tag: ${tag}...`);
          
          // Import fetchGMGNData for single tag fetches
          const { fetchGMGNData } = await import('../scraper/fetcher.js');
          
          if (tag === 'all') {
            // Fetch unfiltered data (no tag parameter)
            const response = await fetchGMGNData({ chain, timeframe, tag: null, limit: 200 });
            allWallets = response.data?.rank || [];
          } else {
            // Fetch only the requested tag
            const response = await fetchGMGNData({ chain, timeframe, tag, limit: 200 });
            allWallets = response.data?.rank || [];
          }

          // Apply quality filters and ranking
          const qualityWallets = filterQualityWallets(allWallets);
          const rankedWallets = rankWallets(qualityWallets);

          // Cache the results
          setCache(cacheKey, rankedWallets);
          allWallets = rankedWallets;
        } finally {
          // Always release lock
          releaseLock(cacheKey);
        }
      }
    }

    // Paginate
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedData = allWallets.slice(start, end);

    res.json({
      data: paginatedData,
      page,
      limit,
      total: allWallets.length,
      totalPages: Math.ceil(allWallets.length / limit),
      hasMore: end < allWallets.length
    });
  } catch (error) {
    console.error('[API] Error fetching wallets:', error);
    res.status(500).json({
      error: 'Failed to fetch wallet data',
      message: error.message
    });
  }
});

/**
 * GET /api/wallets/stats
 * Get summary statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const chain = req.query.chain || 'eth';
    const timeframe = req.query.timeframe || '7d';
    const tag = req.query.tag || 'all';

    console.log(`[API] GET /api/wallets/stats - chain: ${chain}, timeframe: ${timeframe}, tag: ${tag}`);

    // Get cached data or fetch
    const cacheKey = getCacheKey(chain, timeframe, tag);
    let wallets = getCache(cacheKey);

    if (!wallets) {
      // Acquire lock to prevent concurrent fetches
      const waitPromise = await acquireLock(cacheKey);
      
      if (waitPromise) {
        // Wait for concurrent fetch
        await waitPromise;
        wallets = getCache(cacheKey);
        if (wallets) {
          console.log(`[API] Got data from concurrent fetch`);
        }
      }
      
      if (!wallets) {
        try {
          const { fetchGMGNData } = await import('../scraper/fetcher.js');
          
          if (tag === 'all') {
            // Fetch unfiltered data
            const response = await fetchGMGNData({ chain, timeframe, tag: null, limit: 200 });
            wallets = response.data?.rank || [];
          } else {
            // Fetch only requested tag
            const response = await fetchGMGNData({ chain, timeframe, tag, limit: 200 });
            wallets = response.data?.rank || [];
          }
          
          const qualityWallets = filterQualityWallets(wallets);
          wallets = rankWallets(qualityWallets);
          setCache(cacheKey, wallets);
        } finally {
          releaseLock(cacheKey);
        }
      }
    }

    // Calculate stats
    const totalWallets = wallets.length;
    
    // Parse string values to numbers for calculation
    const averagePnL = wallets.reduce((sum, w) => {
      const pnl = typeof w.pnl_7d === 'string' ? parseFloat(w.pnl_7d) : w.pnl_7d;
      return sum + (pnl || 0);
    }, 0) / totalWallets;
    
    const averageProfit = wallets.reduce((sum, w) => {
      const profit = typeof w.realized_profit_7d === 'string' ? parseFloat(w.realized_profit_7d) : w.realized_profit_7d;
      return sum + (profit || 0);
    }, 0) / totalWallets;
    
    const totalProfit = wallets.reduce((sum, w) => {
      const profit = typeof w.realized_profit_7d === 'string' ? parseFloat(w.realized_profit_7d) : w.realized_profit_7d;
      return sum + (profit || 0);
    }, 0);
    const topPerformer = wallets[0] || null;

    // Risk distribution
    const riskDistribution = {
      low: 0,
      medium: 0,
      high: 0
    };

    wallets.forEach(w => {
      const riskScore =
        (w.risk?.token_honeypot_ratio || 0) * 0.4 +
        (w.risk?.sell_pass_buy_ratio || 0) * 0.4 +
        (w.risk?.fast_tx_ratio || 0) * 0.2;

      if (riskScore < 0.10) riskDistribution.low++;
      else if (riskScore < 0.25) riskDistribution.medium++;
      else riskDistribution.high++;
    });

    res.json({
      totalWallets,
      averagePnL,
      averageProfit,
      totalProfit,
      topPerformer,
      riskDistribution
    });
  } catch (error) {
    console.error('[API] Error calculating stats:', error);
    res.status(500).json({
      error: 'Failed to calculate stats',
      message: error.message
    });
  }
});

export default router;
