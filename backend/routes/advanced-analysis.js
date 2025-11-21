// ============================================================
// ADVANCED ANALYTICS ROUTE
// ============================================================
// Full FIFO-based analytics with chronological capital tracking
// Separated from old analysis.js route
// ============================================================

import express from 'express';
import {
  fetchTradeHistory,
  fetchTokenList,
  fetchWalletProfileSummary
} from '../services/okx/fetchers.js';
import { reconstructTradesWithFIFO } from '../services/analysis/fifo.js';
import {
  enrichOpenPositions,
  checkClosedTradesForRugs
} from '../services/analysis/rug-detection.js';
import { trackCapitalChronologically } from '../services/analysis/capital-tracking.js';
import {
  aggregateToTokenLevel,
  aggregateToOverview
} from '../services/analysis/aggregations.js';
import { enrichTradesWithCopyTradeAnalysis } from '../services/analysis/copy-trade.js';

const router = express.Router();

// ============================================================
// ROUTE-LEVEL CACHE (5 MINUTES)
// ============================================================

const routeCache = new Map();
const rugCheckCache = new Map(); // Separate cache for rug-checked data
const processingJobs = new Map(); // Track in-flight requests to prevent duplicates

function getCached(key) {
  const cached = routeCache.get(key);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  routeCache.set(key, { data, timestamp: Date.now() });
}

function getRugCheckedCache(key) {
  const cached = rugCheckCache.get(key);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.data;
  }
  return null;
}

function setRugCheckedCache(key, data) {
  rugCheckCache.set(key, { data, timestamp: Date.now() });
}

// ============================================================
// GET /api/advanced-analysis/:wallet/:chain
// ============================================================

router.get('/:wallet/:chain', async (req, res) => {
  try {
    const { wallet, chain } = req.params;
    const cacheKey = `advanced_${wallet}_${chain}`;
    const skipRugCheck = req.query.skipRugCheck === 'true'; // Phase 1: fast load
    const skipCopyTrade = req.query.skipCopyTrade !== 'false'; // Default to TRUE (skip) unless explicitly requested
    const cacheOnly = req.query.cacheOnly === 'true'; // Polling mode: only check cache
    
    // Check full cache (with rug checks AND copy trade if requested)
    // Note: We might need separate cache keys if we have different levels of enrichment.
    // For now, let's assume "full cache" means Rug Check + Copy Trade.
    // But if user wants Rug Check WITHOUT Copy Trade, we need to handle that.
    // Let's keep it simple: 
    // Level 1: Basic (skipRugCheck=true)
    // Level 2: Rug Checked (skipRugCheck=false, skipCopyTrade=true)
    // Level 3: Full (skipRugCheck=false, skipCopyTrade=false)
    
    const level2Key = `${cacheKey}_rugs`;
    const level3Key = `${cacheKey}_full`;

    if (!skipRugCheck && !skipCopyTrade) {
       const cached = getRugCheckedCache(level3Key);
       if (cached) return res.json({ success: true, data: cached, cached: true, rugCheckComplete: true, copyTradeComplete: true });
    } else if (!skipRugCheck) {
       const cached = getRugCheckedCache(level2Key);
       if (cached) return res.json({ success: true, data: cached, cached: true, rugCheckComplete: true, copyTradeComplete: false });
    } else {
       const cached = getCached(cacheKey);
       if (cached) return res.json({ success: true, data: cached, cached: true, rugCheckComplete: false, copyTradeComplete: false });
    }
    
    // If cacheOnly mode and no cache found, tell frontend to keep polling
    if (cacheOnly) {
      // Check if a job is already running
      if (processingJobs.has(cacheKey)) {
        return res.status(202).json({
          success: false,
          processing: true,
          message: 'Data is still being processed. Please retry.'
        });
      }
      
      // If no job running and no cache, we might need to start one?
      // But cacheOnly usually implies "don't start new work".
      // However, if the first request failed but the frontend thinks it started, we might be stuck.
      // For now, let's assume the frontend will retry without cacheOnly if it gets 404 or similar.
      // But here we return 202 to keep it polling if it expects it.
      return res.status(202).json({
        success: false,
        processing: true,
        message: 'Data is still being processed. Please retry.'
      });
    }

    // ========================================
    // DEDUPLICATION: JOIN EXISTING JOB
    // ========================================
    
    let jobPromise = processingJobs.get(cacheKey);
    
    if (jobPromise) {
      console.log(`[Advanced Analytics] 🔄 Attaching to existing job for ${wallet}`);
      try {
        const data = await jobPromise;
        return res.json({
          success: true,
          data,
          cached: false,
          rugCheckComplete: !skipRugCheck
        });
      } catch (error) {
        const errorMessage = error ? error.message : 'Unknown Error (undefined)';
        return res.status(500).json({ success: false, error: errorMessage });
      }
    }
    
    // ========================================
    // START NEW JOB
    // ========================================
    
    jobPromise = (async () => {
      console.log(`[Advanced Analytics] 🚀 Starting new analysis for ${wallet}`);
      
      // ========================================
      // STEP 1: FETCH DATA
      // ========================================
      
      const [trades, tokenList, profileSummary] = await Promise.all([
        fetchTradeHistory(wallet, chain),
        fetchTokenList(wallet, chain),
        fetchWalletProfileSummary(wallet, chain)
      ]);
      
      // ========================================
      // STEP 2: FIFO RECONSTRUCTION
      // ========================================
      
      const { pairedTrades, openPositions } = reconstructTradesWithFIFO(trades);
      
      // ========================================
      // STEP 3: ENRICH OPEN POSITIONS (FAST)
      // ========================================
      // Always enrich with prices first (fast, no API calls)
      
      const enrichedOpenPositions = await enrichOpenPositions(
        openPositions,
        tokenList,
        chain,
        !skipRugCheck // Only do rug detection if not skipping
      );
      
      // ========================================
      // STEP 4: CHECK CLOSED TRADES FOR RUGS (SLOW)
      // ========================================
      // Skip on initial load, run in phase 2
      
      let rugCheckedClosedTrades = pairedTrades;
      if (!skipRugCheck) {
        console.log('[Advanced Analytics] Running rug checks on closed trades...');
        rugCheckedClosedTrades = await checkClosedTradesForRugs(
          pairedTrades,
          chain
        );
      } else {
        console.log('[Advanced Analytics] SKIPPING rug checks for fast initial load');
      }

      // ========================================
      // STEP 4.5: COPY TRADE ANALYSIS (OHLC + SWAPS)
      // ========================================
      // Enrich with "Copytrade Entry Price" and potential ROI
      
      let fullyEnrichedClosedTrades = rugCheckedClosedTrades;
      let fullyEnrichedOpenPositions = enrichedOpenPositions;

      if (!skipCopyTrade) { 
        console.log('[Advanced Analytics] Running Copy Trade Analysis...');
        
        // Enrich closed trades
        fullyEnrichedClosedTrades = await enrichTradesWithCopyTradeAnalysis(
          rugCheckedClosedTrades,
          chain,
          wallet
        );

        // Enrich open positions
        fullyEnrichedOpenPositions = await enrichTradesWithCopyTradeAnalysis(
          enrichedOpenPositions,
          chain,
          wallet
        );
      } else {
        console.log('[Advanced Analytics] Skipping Copy Trade Analysis (requested)');
      }

      // ========================================
      // STEP 5: TRACK CAPITAL CHRONOLOGICALLY
      // ========================================
      
      const capitalTracking = trackCapitalChronologically(
        fullyEnrichedClosedTrades,
        fullyEnrichedOpenPositions
      );
      
      // ========================================
      // STEP 6: AGGREGATE TO TOKEN LEVEL
      // ========================================
      
      const tokens = aggregateToTokenLevel(
        fullyEnrichedClosedTrades,
        fullyEnrichedOpenPositions
      );
      
      // ========================================
      // STEP 7: AGGREGATE TO OVERVIEW LEVEL
      // ========================================
      
      const overview = aggregateToOverview(
        fullyEnrichedClosedTrades,
        fullyEnrichedOpenPositions,
        tokens,
        capitalTracking
      );
      
      // ========================================
      // RESPONSE STRUCTURE
      // ========================================
      
      const response = {
        overview,
        tokens,
        trades: {
          closed: fullyEnrichedClosedTrades,
          open: fullyEnrichedOpenPositions
        },
        meta: {
          wallet,
          chain,
          timestamp: Date.now(),
          period: '7_days',
          rugCheckComplete: !skipRugCheck,
          nativeBalance: {
            amount: profileSummary?.nativeTokenBalanceAmount || '0',
            usd: profileSummary?.nativeTokenBalanceUsd || '0',
            symbol: chain === '501' ? 'SOL' : chain === '1' ? 'ETH' : chain === '56' ? 'BNB' : chain === '8453' ? 'ETH' : 'NATIVE'
          }
        }
      };
      
      // Cache response
      if (skipRugCheck) {
        // Phase 1: Basic cache (fast load)
        setCache(cacheKey, response);
        console.log('[Advanced Analytics] ✅ Phase 1 complete (no rug checks)');
      } else {
        // Phase 2: Full cache (with rug checks)
        setRugCheckedCache(cacheKey, response);
        console.log('[Advanced Analytics] ✅ Phase 2 complete (with rug checks)');
      }
      
      return response;
    })();
    
    // Store promise in map
    processingJobs.set(cacheKey, jobPromise);
    
    // Ensure cleanup when done (success or fail)
    jobPromise.finally(() => {
      processingJobs.delete(cacheKey);
    });
    
    // Wait for result
    const data = await jobPromise;
    
    res.json({
      success: true,
      data: data,
      cached: false,
      rugCheckComplete: !skipRugCheck
    });
    
  } catch (error) {
    console.error('Advanced Analytics Error:', error);
    const errorMessage = error ? error.message : 'Unknown Error (undefined)';
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
});

/**
 * POST /api/advanced-analysis/enrich-copy-trade
 * On-demand Copy Trade Analysis for specific trades
 */
router.post('/enrich-copy-trade', async (req, res) => {
  try {
    const { wallet, chain, trades } = req.body;
    
    if (!trades || !Array.isArray(trades)) {
      return res.status(400).json({ error: 'Invalid trades array' });
    }
    
    console.log(`[Advanced Analytics] On-demand Copy Trade Analysis for ${trades.length} trades...`);
    
    const enrichedTrades = await enrichTradesWithCopyTradeAnalysis(trades, chain, wallet);
    
    res.json({
      success: true,
      data: enrichedTrades
    });
  } catch (error) {
    console.error('Copy Trade Enrichment Error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
