import express from 'express';
import { reconstructWalletTrades } from '../services/tradeReconstruction.js';
import { computeMetrics } from '../services/metricsComputation.js';
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
    const trades = reconstructWalletTrades(walletData);
    
    console.log(`[Analysis API] Reconstructed ${trades.length} trades for ${walletAddress}`);
    
    res.json({
      wallet_address: walletAddress,
      chain,
      trades,
      total_count: trades.length,
      open_positions: trades.filter(t => t.status === 'open').length,
      closed_trades: trades.filter(t => t.status === 'closed').length
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
    const trades = reconstructWalletTrades(walletData);
    
    // Filter to closed trades only for metrics (skip open positions)
    const closedTrades = trades.filter(t => t.status === 'closed');
    
    if (closedTrades.length === 0) {
      return res.json({
        wallet_address: walletAddress,
        chain,
        message: 'No closed trades found for metrics computation',
        metrics: null
      });
    }
    
    // Compute metrics
    const metrics = computeMetrics(closedTrades);
    
    console.log(`[Analysis API] Computed metrics for ${walletAddress}: ${metrics.total_trades} trades, ${metrics.win_rate.toFixed(1)}% win rate`);
    
    res.json({
      wallet_address: walletAddress,
      chain,
      metrics
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
