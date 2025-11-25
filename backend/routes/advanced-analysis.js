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
import { getWallet, upsertWallet, updateWalletFlag } from '../db/supabase.js';

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
      // FIX: If no job is running, return 404 so frontend knows to retry with full request
      return res.status(404).json({
        success: false,
        processing: false,
        message: 'No analysis job found. Please start a new analysis.'
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
      
      const [trades, tokenList, profileSummary, dbWallet] = await Promise.all([
        fetchTradeHistory(wallet, chain),
        fetchTokenList(wallet, chain),
        fetchWalletProfileSummary(wallet, chain),
        getWallet(wallet, chain).catch(() => null)
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
      
      // Calculate rug detection percentage for auto-flagging
      const totalTokens = tokens.length;
      const ruggedTokens = tokens.filter(t => t.is_rugged || t.traded_rug_token).length;
      const rugDetectionPercent = totalTokens > 0 ? (ruggedTokens / totalTokens) * 100 : 0;
      
      // Auto-flag if rug detection > 10%
      const shouldAutoFlag = rugDetectionPercent >= 10;
      const existingFlag = dbWallet?.data?.is_flagged || false;
      
      // Only auto-flag if not already flagged (don't remove flags)
      if (shouldAutoFlag && !existingFlag) {
        console.log(`[Advanced Analytics] 🚩 Auto-flagging wallet ${wallet} (Rug Detection: ${rugDetectionPercent.toFixed(1)}%)`);
        try {
          await updateWalletFlag(wallet, chain, true);
        } catch (flagError) {
          console.error('[Advanced Analytics] Failed to auto-flag wallet:', flagError.message);
        }
      }
      
      const response = {
        overview: {
          ...overview,
          // Add rug detection summary at overview level for easy access
          rug_detection: {
            total_tokens: totalTokens,
            rugged_tokens: ruggedTokens,
            percent: rugDetectionPercent,
            auto_flagged: shouldAutoFlag && !existingFlag
          }
        },
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
          copyTradeComplete: !skipCopyTrade,
          is_flagged: shouldAutoFlag || existingFlag, // Return updated flag status
          is_saved: dbWallet?.data?.is_saved || false,
          nativeBalance: {
            amount: profileSummary?.nativeTokenBalanceAmount || '0',
            usd: profileSummary?.nativeTokenBalanceUsd || '0',
            symbol: chain === '501' ? 'SOL' : chain === '1' ? 'ETH' : chain === '56' ? 'BNB' : chain === '8453' ? 'ETH' : 'NATIVE'
          }
        }
      };
      
      // ========================================
      // SAVE ANALYSIS DATA TO DATABASE
      // ========================================
      // Update wallet in DB with latest analysis metrics
      try {
        const analysisMetadata = {
          // Performance metrics
          pnl_7d: overview.capital_metrics?.wallet_growth_roi || 0,
          realized_profit_7d: overview.total_realized_pnl || 0,
          winrate_7d: (overview.win_rate || 0) / 100, // Convert to decimal
          token_num_7d: totalTokens,
          
          // Risk metrics (for filtering)
          rug_detection_percent: rugDetectionPercent,
          rugged_tokens: ruggedTokens,
          total_trades: overview.total_trades || 0,
          closed_trades: overview.closed_trades || 0,
          open_positions: overview.open_positions || 0,
          
          // Capital tracking
          starting_capital: overview.capital_metrics?.starting_capital || 0,
          peak_deployed: overview.capital_metrics?.peak_deployed || 0,
          net_pnl: overview.capital_metrics?.net_pnl || 0,
          
          // Timestamps
          last_analysis: Date.now(),
          analysis_version: '2.0'
        };
        
        // Update existing wallet or create new entry
        await upsertWallet({
          wallet_address: wallet,
          chain: chain,
          data: {
            ...(dbWallet?.data || {}),
            wallet_address: wallet,
            address: wallet,
            // Merge in new analysis data
            pnl_7d: analysisMetadata.pnl_7d,
            realized_profit_7d: analysisMetadata.realized_profit_7d,
            winrate_7d: analysisMetadata.winrate_7d,
            token_num_7d: analysisMetadata.token_num_7d,
            is_flagged: shouldAutoFlag || existingFlag,
            // Add risk metrics for table display
            risk: {
              ...(dbWallet?.data?.risk || {}),
              rug_detection_percent: rugDetectionPercent,
              rugged_tokens: ruggedTokens,
              total_tokens: totalTokens
            },
            _analysis_updated: Date.now()
          },
          metadata: analysisMetadata
        });
        
        console.log(`[Advanced Analytics] 💾 Saved analysis data for ${wallet}`);
      } catch (saveError) {
        console.error('[Advanced Analytics] Failed to save analysis data:', saveError.message);
        // Don't fail the request if save fails
      }
      
      // Cache response
      if (!skipRugCheck && !skipCopyTrade) {
        // Phase 3: Full cache (Rug Checks + Copy Trade)
        setRugCheckedCache(level3Key, response);
        console.log('[Advanced Analytics] ✅ Phase 3 complete (Full: Rugs + CopyTrade)');
      } else if (!skipRugCheck) {
        // Phase 2: Rug Checked cache (Rugs only)
        setRugCheckedCache(level2Key, response);
        console.log('[Advanced Analytics] ✅ Phase 2 complete (Rugs only)');
      } else {
        // Phase 1: Basic cache (fast load)
        setCache(cacheKey, response);
        console.log('[Advanced Analytics] ✅ Phase 1 complete (Basic)');
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
