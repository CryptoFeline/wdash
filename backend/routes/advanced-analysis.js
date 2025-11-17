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

// ============================================================
// GET /api/advanced-analysis/:wallet/:chain
// ============================================================

router.get('/:wallet/:chain', async (req, res) => {
  try {
    const { wallet, chain } = req.params;
    const cacheKey = `advanced_${wallet}_${chain}`;
    
    // Check cache
    const cached = getCached(cacheKey);
    if (cached) {
      return res.json({ 
        success: true, 
        data: cached,
        cached: true 
      });
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
    // STEP 3: ENRICH OPEN POSITIONS
    // ========================================
    
    const enrichedOpenPositions = await enrichOpenPositions(
      openPositions,
      tokenList,
      chain
    );
    
    // ========================================
    // STEP 4: CHECK CLOSED TRADES FOR RUGS
    // ========================================
    
    const rugCheckedClosedTrades = await checkClosedTradesForRugs(
      pairedTrades,
      chain
    );
    
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
        period: '7_days'
      }
    };
    
    // Cache response
    setCache(cacheKey, response);
    
    res.json({
      success: true,
      data: response,
      cached: false
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
