import express from 'express';
import { reconstructWalletTrades } from '../services/tradeReconstruction.js';
import { computeMetrics } from '../services/metricsComputation.js';
import { enrichTradesWithPrices } from '../services/priceEnrichment.js';
import { enrichTradesWithRiskCheck, filterRiskyTrades } from '../services/riskCheck.js';
import axios from 'axios';

const router = express.Router();

/**
 * GET /api/analysis/summary/:walletAddress
 * 
 * Returns aggregated summary data from OKX API
 */
router.get('/summary/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const chain = req.query.chain || 'eth';
    
    console.log(`[Analysis API] Fetching summary for ${walletAddress} on ${chain}`);
    
    // Fetch from OKX API
    const okxUrl = `https://www.okx.com/priapi/v1/invest/activity/smart-money/wallet-transactions`;
    const response = await axios.get(okxUrl, {
      params: {
        chainId: chain === 'eth' ? '1' : chain === 'sol' ? '501' : '1',
        address: walletAddress,
        limit: 100
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.code !== '0' || !response.data?.data) {
      return res.status(404).json({ error: 'Wallet not found or OKX API error' });
    }
    
    const walletData = response.data.data;
    
    // Build summary object
    const summary = {
      wallet_address: walletAddress,
      chain,
      total_tokens: walletData.tokenList?.length || 0,
      total_pnl: parseFloat(walletData.totalPnl || 0),
      total_invested: parseFloat(walletData.totalInvest || 0),
      total_roi_percent: parseFloat(walletData.roi || 0),
      win_rate: parseFloat(walletData.winRate || 0),
      realized_pnl: parseFloat(walletData.totalRealizedProfit || 0),
      unrealized_pnl: parseFloat(walletData.totalUnrealizedProfit || 0),
      best_token: walletData.bestToken || null,
      worst_token: walletData.worstToken || null,
      avg_holding_time_hours: parseFloat(walletData.avgHoldingTime || 0) / 3600
    };
    
    res.json(summary);
  } catch (error) {
    console.error('[Analysis API] Error fetching summary:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch wallet summary',
      details: error.message 
    });
  }
});

/**
 * GET /api/analysis/trades/:walletAddress
 * 
 * Returns reconstructed trades using FIFO algorithm
 */
router.get('/trades/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const chain = req.query.chain || 'eth';
    
    console.log(`[Analysis API] Reconstructing trades for ${walletAddress} on ${chain}`);
    
    // Fetch from OKX API
    const okxUrl = `https://www.okx.com/priapi/v1/invest/activity/smart-money/wallet-transactions`;
    const response = await axios.get(okxUrl, {
      params: {
        chainId: chain === 'eth' ? '1' : chain === 'sol' ? '501' : '1',
        address: walletAddress,
        limit: 100 // Can increase if needed
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.code !== '0' || !response.data?.data) {
      return res.status(404).json({ error: 'Wallet not found or OKX API error' });
    }
    
    const walletData = response.data.data;
    
    // Reconstruct trades using FIFO
    let trades = reconstructWalletTrades(walletData);
    
    console.log(`[Analysis API] Reconstructed ${trades.length} trades for ${walletAddress}`);
    
    // Enrich closed trades with price data (skip open positions)
    const enablePriceEnrichment = req.query.enrichPrices !== 'false'; // Default: true
    const enableRiskCheck = req.query.checkRisks !== 'false'; // Default: true
    
    if (enablePriceEnrichment) {
      const closedTrades = trades.filter(t => t.status === 'closed');
      if (closedTrades.length > 0) {
        console.log(`[Analysis API] Enriching ${closedTrades.length} closed trades with OHLC data...`);
        const enrichedClosed = await enrichTradesWithPrices(closedTrades, chain);
        
        // Merge enriched trades back
        const enrichedMap = new Map(enrichedClosed.map(t => [t.trade_id, t]));
        trades = trades.map(t => enrichedMap.get(t.trade_id) || t);
        
        console.log(`[Analysis API] Price enrichment complete`);
      }
    }
    
    // Risk check for all trades
    if (enableRiskCheck) {
      console.log(`[Analysis API] Running risk checks for ${trades.length} trades...`);
      trades = await enrichTradesWithRiskCheck(trades, chain);
      console.log(`[Analysis API] Risk checks complete`);
    }
    
    const riskyTradesCount = trades.filter(t => t.is_risky).length;
    
    res.json({
      wallet_address: walletAddress,
      chain,
      trades,
      total_count: trades.length,
      open_positions: trades.filter(t => t.status === 'open').length,
      closed_trades: trades.filter(t => t.status === 'closed').length,
      risky_trades: riskyTradesCount,
      enriched: enablePriceEnrichment,
      risk_checked: enableRiskCheck
    });
  } catch (error) {
    console.error('[Analysis API] Error reconstructing trades:', error.message);
    res.status(500).json({ 
      error: 'Failed to reconstruct trades',
      details: error.message 
    });
  }
});

/**
 * GET /api/analysis/metrics/:walletAddress
 * 
 * Returns computed metrics from reconstructed trades
 */
router.get('/metrics/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const chain = req.query.chain || 'eth';
    
    console.log(`[Analysis API] Computing metrics for ${walletAddress} on ${chain}`);
    
    // Fetch from OKX API
    const okxUrl = `https://www.okx.com/priapi/v1/invest/activity/smart-money/wallet-transactions`;
    const response = await axios.get(okxUrl, {
      params: {
        chainId: chain === 'eth' ? '1' : chain === 'sol' ? '501' : '1',
        address: walletAddress,
        limit: 100
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    if (response.data?.code !== '0' || !response.data?.data) {
      return res.status(404).json({ error: 'Wallet not found or OKX API error' });
    }
    
    const walletData = response.data.data;
    
    // Reconstruct trades
    let trades = reconstructWalletTrades(walletData);
    
    // Filter to closed trades only for metrics (skip open positions)
    let closedTrades = trades.filter(t => t.status === 'closed');
    
    if (closedTrades.length === 0) {
      return res.json({
        wallet_address: walletAddress,
        chain,
        message: 'No closed trades found for metrics computation',
        metrics: null
      });
    }
    
    // Enrich with price data for accurate skill scoring
    const enablePriceEnrichment = req.query.enrichPrices !== 'false'; // Default: true
    const enableRiskCheck = req.query.checkRisks !== 'false'; // Default: true
    const filterRisky = req.query.filterRisky !== 'false'; // Default: true (exclude risky from metrics)
    
    if (enablePriceEnrichment) {
      console.log(`[Analysis API] Enriching ${closedTrades.length} trades with OHLC data for metrics...`);
      closedTrades = await enrichTradesWithPrices(closedTrades, chain);
      console.log(`[Analysis API] Price enrichment complete for metrics`);
    }
    
    // Risk check trades
    if (enableRiskCheck) {
      console.log(`[Analysis API] Running risk checks for ${closedTrades.length} trades...`);
      closedTrades = await enrichTradesWithRiskCheck(closedTrades, chain);
      console.log(`[Analysis API] Risk checks complete for metrics`);
    }
    
    // Filter out risky trades for clean metrics
    const allTradesCount = closedTrades.length;
    let riskyTradesCount = 0;
    
    if (filterRisky && enableRiskCheck) {
      const beforeFilter = closedTrades.length;
      closedTrades = filterRiskyTrades(closedTrades);
      riskyTradesCount = beforeFilter - closedTrades.length;
      
      if (closedTrades.length === 0) {
        return res.json({
          wallet_address: walletAddress,
          chain,
          message: 'All trades were flagged as risky',
          metrics: null,
          all_trades_count: allTradesCount,
          risky_trades_filtered: riskyTradesCount
        });
      }
    }
    
    // Compute metrics
    const metrics = computeMetrics(closedTrades);
    
    console.log(`[Analysis API] Computed metrics for ${walletAddress}: ${metrics.total_trades} trades, ${metrics.win_rate.toFixed(1)}% win rate`);
    
    res.json({
      wallet_address: walletAddress,
      chain,
      metrics,
      all_trades_count: allTradesCount,
      risky_trades_filtered: riskyTradesCount,
      enriched: enablePriceEnrichment,
      risk_checked: enableRiskCheck,
      filtered_risky: filterRisky
    });
  } catch (error) {
    console.error('[Analysis API] Error computing metrics:', error.message);
    res.status(500).json({ 
      error: 'Failed to compute metrics',
      details: error.message 
    });
  }
});

export default router;
