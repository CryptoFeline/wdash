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

const router = express.Router();

// ============================================================
// ROUTE-LEVEL CACHE (5 MINUTES)
// ============================================================

const routeCache = new Map();
const rugCheckCache = new Map(); // Separate cache for rug-checked data

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
    
    // Check full cache (with rug checks)
    const fullCached = getRugCheckedCache(cacheKey);
    if (fullCached) {
      return res.json({ 
        success: true, 
        data: fullCached,
        cached: true,
        rugCheckComplete: true
      });
    }
    
    // Check basic cache (without rug checks) - for fast initial load
    if (skipRugCheck) {
      const basicCached = getCached(cacheKey);
      if (basicCached) {
        return res.json({ 
          success: true, 
          data: basicCached,
          cached: true,
          rugCheckComplete: false
        });
      }
    }
    
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
    // STEP 5: TRACK CAPITAL CHRONOLOGICALLY
    // ========================================
    
    const capitalTracking = trackCapitalChronologically(
      rugCheckedClosedTrades,
      enrichedOpenPositions
    );
    
    // ========================================
    // STEP 6: AGGREGATE TO TOKEN LEVEL
    // ========================================
    
    const tokens = aggregateToTokenLevel(
      rugCheckedClosedTrades,
      enrichedOpenPositions
    );
    
    // ========================================
    // STEP 7: AGGREGATE TO OVERVIEW LEVEL
    // ========================================
    
    const overview = aggregateToOverview(
      rugCheckedClosedTrades,
      enrichedOpenPositions,
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
        closed: rugCheckedClosedTrades,
        open: enrichedOpenPositions
      },
      meta: {
        wallet,
        chain,
        timestamp: Date.now(),
        period: '7_days',
        rugCheckComplete: !skipRugCheck
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
    
    res.json({
      success: true,
      data: response,
      cached: false,
      rugCheckComplete: !skipRugCheck
    });
    
  } catch (error) {
    console.error('Advanced Analytics Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
