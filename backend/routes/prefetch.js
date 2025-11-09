import express from 'express';
import { fetchGMGNData, filterQualityWallets, rankWallets } from '../scraper/fetcher.js';
import { getCacheKey, setCache, acquireLock, releaseLock } from '../scraper/cache.js';

const router = express.Router();

/**
 * Prefetch configurations - what to warm up
 */
const PREFETCH_CONFIGS = [
  { chain: 'sol', timeframe: '7d', tag: null },  // Solana All Wallets
  { chain: 'eth', timeframe: '7d', tag: null },  // Ethereum All Wallets
  { chain: 'sol', timeframe: '7d', tag: 'smart_degen' },
  { chain: 'eth', timeframe: '7d', tag: 'smart_degen' },
];

/**
 * GET /api/prefetch
 * Pre-warm cache by fetching common queries in background
 * This runs ASYNC - returns immediately, fetches in background
 */
router.get('/', async (req, res) => {
  // Return immediately
  res.json({ 
    status: 'started',
    message: 'Cache warming started in background',
    configs: PREFETCH_CONFIGS.length 
  });

  // Run prefetch in background (don't await)
  prefetchAll().catch(err => {
    console.error('[Prefetch] Background error:', err.message);
  });
});

/**
 * GET /api/prefetch/status
 * Check cache status
 */
router.get('/status', async (req, res) => {
  const { getCacheStats, getCache } = await import('../scraper/cache.js');
  const stats = getCacheStats();
  
  // Check which configs are cached
  const cached = PREFETCH_CONFIGS.map(config => ({
    ...config,
    cacheKey: getCacheKey(
      config.chain, 
      config.timeframe, 
      config.tag === null ? 'all' : config.tag
    ),
    isCached: !!getCache(getCacheKey(
      config.chain, 
      config.timeframe, 
      config.tag === null ? 'all' : config.tag
    ))
  }));

  res.json({
    cacheStats: stats,
    prefetchConfigs: cached
  });
});

/**
 * Prefetch all configurations sequentially
 */
async function prefetchAll() {
  console.log('[Prefetch] Starting background cache warming...');
  
  for (const config of PREFETCH_CONFIGS) {
    try {
      await prefetchOne(config);
    } catch (err) {
      console.error(`[Prefetch] Failed to prefetch ${config.chain}:${config.timeframe}:${config.tag}:`, err.message);
    }
  }
  
  console.log('[Prefetch] Cache warming complete');
}

/**
 * Prefetch a single configuration
 */
async function prefetchOne({ chain, timeframe, tag }) {
  const cacheKey = getCacheKey(chain, timeframe, tag === null ? 'all' : tag);
  
  // Check if already cached
  const { getCache } = await import('../scraper/cache.js');
  if (getCache(cacheKey)) {
    console.log(`[Prefetch] SKIP: ${cacheKey} (already cached)`);
    return;
  }

  // Acquire lock
  const waitPromise = await acquireLock(cacheKey);
  if (waitPromise) {
    console.log(`[Prefetch] SKIP: ${cacheKey} (fetch in progress)`);
    await waitPromise;
    return;
  }

  try {
    console.log(`[Prefetch] FETCHING: ${cacheKey}`);
    const response = await fetchGMGNData({ chain, timeframe, tag, limit: 200 });
    const wallets = response.data?.rank || [];
    
    const qualityWallets = filterQualityWallets(wallets);
    const rankedWallets = rankWallets(qualityWallets);
    
    setCache(cacheKey, rankedWallets);
    console.log(`[Prefetch] SUCCESS: ${cacheKey} (${rankedWallets.length} wallets)`);
  } finally {
    releaseLock(cacheKey);
  }
}

export default router;
