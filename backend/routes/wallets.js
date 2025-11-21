import express from 'express';
import axios from 'axios';
import { filterQualityWallets, rankWallets } from '../scraper/fetcher.js';
import { getCacheKey, getCache, setCache, acquireLock, releaseLock } from '../scraper/cache.js';
import { 
  upsertWalletsBatch,
  createSnapshotsBatch,
  getWallet,
  updateWalletFlag
} from '../db/supabase.js';

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
          console.log(`[API] Cache miss. Fetching from Database (Supabase) for tag: ${tag}...`);
          
          // Import Supabase client
          const { createClient } = await import('@supabase/supabase-js');
          
          const supabaseUrl = process.env.SUPABASE_URL;
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

          if (supabaseUrl && supabaseServiceKey) {
            const supabase = createClient(supabaseUrl, supabaseServiceKey);
            
            // Fetch from DB
            let query = supabase.from('wallets').select('*');
            
            if (chain && chain !== 'all') {
              query = query.eq('chain', chain);
            }
            
            // Fetch up to 1000 most recently synced wallets
            const { data: dbWallets, error } = await query
              .order('last_synced', { ascending: false })
              .limit(1000);

            if (!error && dbWallets && dbWallets.length > 0) {
              console.log(`[API] Found ${dbWallets.length} wallets in DB.`);
              // Map DB format to what the frontend expects (dbWallet.data holds the GMGN structure)
              allWallets = dbWallets.map(w => ({ 
                ...w.data, 
                _stored_at: w.last_synced 
              }));
            } else {
              console.log(`[API] No wallets in DB or error: ${error?.message}`);
              allWallets = [];
            }
          } else {
            console.log(`[API] Supabase not configured.`);
            allWallets = [];
          }

          /* 
          // OLD AUTO-SCRAPE LOGIC - DISABLED
          // Only fetch from GMGN when explicitly requested via /api/sync
          
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
          */

          // Apply quality filters and ranking
          if (allWallets.length > 0) {
            const qualityWallets = filterQualityWallets(allWallets);
            const rankedWallets = rankWallets(qualityWallets);

            // Cache the results
            setCache(cacheKey, rankedWallets);
            allWallets = rankedWallets;
          }
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
    const cacheOnly = req.query.cacheOnly === 'true';

    console.log(`[API] GET /api/wallets/stats - chain: ${chain}, timeframe: ${timeframe}, tag: ${tag}${cacheOnly ? ' (cache-only)' : ''}`);

    // Get cached data or fetch
    const cacheKey = getCacheKey(chain, timeframe, tag);
    let wallets = getCache(cacheKey);

    if (!wallets && cacheOnly) {
      // Cache-only mode: return empty stats if not cached
      return res.json({
        stats: {
          totalWallets: 0,
          avgPnL: 0,
          avgWinRate: 0,
          avgROI: 0,
          topPerformer: null
        },
        cached: false,
        message: 'Data not in cache. Try again later or disable cache-only mode.'
      });
    }

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

/**
 * GET /api/wallets/sync
 * Fetch individual wallet data for sync engine
 * Query params: address, chain (optional)
 */
router.get('/sync', async (req, res) => {
  try {
    const { address, chain = 'sol' } = req.query;
    
    if (!address) {
      return res.status(400).json({
        error: 'Missing required parameter: address'
      });
    }

    console.log(`[API] GET /api/wallets/sync - address: ${address.substring(0, 8)}..., chain: ${chain}`);

    // Import getWallet here to avoid circular dependencies
    const { getWallet } = await import('../db/supabase.js');
    
    // Fetch wallet from database
    const wallet = await getWallet(address, chain);
    
    if (!wallet) {
      console.log(`[API] Wallet not found in database: ${address}`);
      return res.status(404).json({
        error: 'Wallet not found',
        address,
        chain
      });
    }

    // Transform wallet data to match frontend interface
    const response = {
      summary: {
        pnl_7d: wallet.metadata?.pnl_7d || wallet.pnl_7d || 0,
        realized_profit_7d: wallet.metadata?.realized_profit_7d || wallet.realized_profit_7d || 0,
        winrate_7d: wallet.metadata?.winrate_7d || wallet.winrate_7d || 0,
        token_num_7d: wallet.metadata?.token_num_7d || wallet.token_num_7d || 0,
      },
      tokens: wallet.data?.tokens || [],
      history: wallet.data?.history || [],
    };

    console.log(`[API] Returning wallet data for ${address.substring(0, 8)}...`);
    res.json(response);
  } catch (error) {
    console.error('[API] Error fetching wallet sync data:', error);
    res.status(500).json({
      error: 'Failed to fetch wallet data',
      message: error.message
    });
  }
});

/**
 * POST /api/wallets/:address/flag
 * Update wallet flag status
 */
router.post('/:address/flag', async (req, res) => {
  try {
    const { address } = req.params;
    const { chain = 'eth', is_flagged } = req.body;
    
    if (typeof is_flagged !== 'boolean') {
      return res.status(400).json({ error: 'is_flagged must be a boolean' });
    }

    await updateWalletFlag(address, chain, is_flagged);
    
    res.json({ success: true, address, is_flagged });
  } catch (error) {
    console.error('[API] Flag update error:', error);
    res.status(500).json({ error: 'Failed to update flag status' });
  }
});

/**
 * POST /api/wallets/:address/update
 * Update any field in wallet data
 */
router.post('/:address/update', async (req, res) => {
  try {
    const { address } = req.params;
    const { chain = 'eth', field, value } = req.body;
    
    if (!field) {
      return res.status(400).json({ error: 'Field name is required' });
    }

    // Import dynamically to avoid circular deps if any, or just use the one imported at top
    // But wait, updateWalletField is not imported at top yet.
    // I need to update the import statement first.
    // Actually, I can just use the imported module if I update the import.
    // Let's assume I'll update the import in a separate step or use dynamic import.
    // For now, let's use dynamic import for safety as I didn't check the top imports fully.
    const { updateWalletField } = await import('../db/supabase.js');

    await updateWalletField(address, chain, field, value);
    
    res.json({ success: true, address, field, value });
  } catch (error) {
    console.error('[API] Update field error:', error);
    res.status(500).json({ error: 'Failed to update wallet data' });
  }
});

/**
 * GET /api/wallets/:address/chains
 * Detect chains for a wallet using OKX API
 */
router.get('/:address/chains', async (req, res) => {
  try {
    const { address } = req.params;
    const url = `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/all-chains?walletAddress=${address}`;
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.okx.com/',
        'Origin': 'https://www.okx.com'
      }
    });

    if (response.data && response.data.code === 0) {
      res.json(response.data);
    } else {
      res.status(500).json({ error: 'Failed to fetch chain data from OKX' });
    }
  } catch (error) {
    console.error('[API] Chain detection error:', error.message);
    res.status(500).json({ error: 'Chain detection failed' });
  }
});

export default router;
