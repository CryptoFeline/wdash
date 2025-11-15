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
    
    // Fetch from OKX API (correct endpoint with all required params)
    const chainId = chain === 'eth' ? '1' : chain === 'sol' ? '501' : '1';
    const okxUrl = `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/summary`;
    const response = await axios.get(okxUrl, {
      params: {
        periodType: 3, // 7 days
        chainId,
        walletAddress,
        t: Date.now()
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    if (response.data?.code !== '0' && response.data?.code !== 0) {
      console.error('[Analysis API] OKX API error:', response.data);
      return res.status(404).json({ error: 'Wallet not found or OKX API error' });
    }
    
    if (!response.data?.data) {
      console.error('[Analysis API] No data in OKX response');
      return res.status(404).json({ error: 'No wallet data available' });
    }
    
    const walletData = response.data.data;
    
    // Build summary object from OKX API response
    // Map OKX field names to our expected format
    const summary = {
      wallet_address: walletAddress,
      chain,
      total_tokens: (walletData.topTokens?.length || 0) + (walletData.totalTxsBuy || 0), // Rough estimate
      total_pnl: parseFloat(walletData.totalPnl || 0),
      total_invested: parseFloat(walletData.totalVolumeBuy || 0), // Use buy volume as investment
      total_roi_percent: parseFloat(walletData.totalPnlRoi || 0), // Correct field name
      win_rate: parseFloat(walletData.totalWinRate || 0), // Correct field name
      realized_pnl: parseFloat(walletData.totalProfitPnl || 0), // Total profit PnL
      unrealized_pnl: parseFloat(walletData.unrealizedPnl || 0), // Correct field name
      best_token: walletData.topTokens?.[0] || null, // First token in topTokens
      worst_token: null, // OKX doesn't provide worst token
      avg_holding_time_hours: 0, // Not available in summary endpoint
      total_volume_buy: parseFloat(walletData.totalVolumeBuy || 0),
      total_volume_sell: parseFloat(walletData.totalVolumeSell || 0),
      total_txs_buy: parseInt(walletData.totalTxsBuy || 0),
      total_txs_sell: parseInt(walletData.totalTxsSell || 0),
      avg_cost_buy: parseFloat(walletData.avgCostBuy || 0),
      top_tokens: walletData.topTokens || []
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
    
    // Fetch from OKX API (correct endpoint with all required params)
    const chainId = chain === 'eth' ? '1' : chain === 'sol' ? '501' : '1';
    const okxUrl = `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list`;
    const response = await axios.get(okxUrl, {
      params: {
        walletAddress,
        chainId,
        isAsc: false,
        sortType: 1, // Sort by PnL
        filterEmptyBalance: false, // All tokens including sold
        offset: 0,
        limit: 100,
        t: Date.now()
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    if (response.data?.code !== '0' && response.data?.code !== 0) {
      console.error('[Analysis API] OKX API error:', response.data);
      return res.status(404).json({ error: 'Wallet not found or OKX API error' });
    }
    
    if (!response.data?.data?.tokenList) {
      console.error('[Analysis API] No token list in OKX response');
      return res.status(404).json({ error: 'No trade data available' });
    }
    
    const walletData = response.data.data;
    
    // OKX token-list returns aggregated trade data, not individual transactions
    // Convert to our expected trade format
    const trades = (walletData.tokenList || []).map((token, index) => ({
      trade_id: `${token.tokenContractAddress || token.tokenAddress}_agg`,
      token_address: token.tokenContractAddress || token.tokenAddress,
      token_symbol: token.tokenSymbol,
      token_name: token.tokenSymbol, // OKX doesn't provide name in token-list
      logo_url: token.tokenLogoUrl,
      
      // Buy side
      buy_price_avg: parseFloat(token.buyAvgPrice || 0),
      buy_volume: parseFloat(token.buyVolume || 0),
      buy_quantity: parseFloat(token.buyVolume || 0),
      total_buy_txs: parseInt(token.totalTxBuy || 0),
      
      // Sell side  
      sell_price_avg: parseFloat(token.sellAvgPrice || 0),
      sell_volume: parseFloat(token.sellVolume || 0),
      sell_quantity: parseFloat(token.sellVolume || 0),
      total_sell_txs: parseInt(token.totalTxSell || 0),
      
      // PnL metrics
      realized_pnl: parseFloat(token.realizedPnl || 0),
      realized_pnl_percent: parseFloat(token.realizedPnlPercentage || 0),
      unrealized_pnl: parseFloat(token.unrealizedPnl || 0),
      unrealized_pnl_percent: parseFloat(token.unrealizedPnlPercentage || 0),
      total_pnl: parseFloat(token.totalPnl || 0),
      total_pnl_percent: parseFloat(token.totalPnlPercentage || 0),
      
      // Current position
      current_balance: parseFloat(token.balance || 0),
      current_balance_usd: parseFloat(token.balanceUsd || 0),
      hold_avg_price: parseFloat(token.holdAvgPrice || 0),
      holding_time: parseInt(token.holdingTime || 0),
      
      // Risk
      risk_level: parseInt(token.riskLevel || token.riskControlLevel || 1),
      
      // Status
      status: parseFloat(token.balance || 0) > 0 ? 'open' : 'closed',
      
      // Timestamps
      latest_time: parseInt(token.latestTime || Date.now()),
      entry_time: parseInt(token.latestTime || Date.now()), // Approximation
      exit_time: parseFloat(token.balance || 0) > 0 ? null : parseInt(token.latestTime || Date.now())
    }));
    
    console.log(`[Analysis API] Returning ${trades.length} aggregated trades for ${walletAddress}`);
    
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
    
    // Fetch from OKX API (correct endpoint with all required params)
    const chainId = chain === 'eth' ? '1' : chain === 'sol' ? '501' : '1';
    const okxUrl = `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list`;
    const response = await axios.get(okxUrl, {
      params: {
        walletAddress,
        chainId,
        isAsc: false,
        sortType: 1, // Sort by PnL
        filterEmptyBalance: false, // All tokens including sold
        offset: 0,
        limit: 100,
        t: Date.now()
      },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    if (response.data?.code !== '0' && response.data?.code !== 0) {
      console.error('[Analysis API] OKX API error:', response.data);
      return res.status(404).json({ error: 'Wallet not found or OKX API error' });
    }
    
    if (!response.data?.data?.tokenList) {
      console.error('[Analysis API] No token list in OKX response');
      return res.status(404).json({ error: 'No trade data available' });
    }
    
    const walletData = response.data.data;
    
    // Convert OKX token list to trade format for metrics computation
    // OKX returns aggregated data per token, we treat each token as a "trade"
    const trades = (walletData.tokenList || []).map((token, index) => {
      const buyVolume = parseFloat(token.buyVolume || 0);
      const sellVolume = parseFloat(token.sellVolume || 0);
      const balance = parseFloat(token.balance || 0);
      const realizedPnl = parseFloat(token.realizedPnl || 0);
      const realizedPnlPct = parseFloat(token.realizedPnlPercentage || 0);
      const holdingTime = parseInt(token.holdingTime || 0);
      
      return {
        // Identity
        trade_id: `${token.tokenContractAddress || token.tokenAddress}_${index}`,
        token_address: token.tokenContractAddress || token.tokenAddress,
        token_symbol: token.tokenSymbol,
        token_name: token.tokenSymbol,
        
        // Prices (OKX gives averages)
        entry_price: parseFloat(token.buyAvgPrice || 0),
        exit_price: parseFloat(token.sellAvgPrice || 0),
        quantity: sellVolume, // Use sell volume as quantity for closed trades
        
        // Values
        entry_value: buyVolume,
        exit_value: sellVolume,
        
        // PnL
        realized_pnl: realizedPnl,
        realized_roi: realizedPnlPct,
        
        // Holding
        holding_seconds: holdingTime,
        holding_hours: holdingTime / 3600,
        holding_days: holdingTime / 86400,
        
        // Win/loss
        win: realizedPnl > 0,
        
        // Status
        status: balance > 0 ? 'open' : 'closed',
        
        // Market cap bracket (from OKX mcapTxsBuyList - will be enriched later)
        mcap_bracket: 1, // Default to $100k-$1M
        
        // Risk
        riskLevel: parseInt(token.riskLevel || token.riskControlLevel || 1),
        
        // Placeholder fields for skills assessment (will be enriched with OHLC data)
        max_price_during_hold: 0,
        max_potential_roi: 0,
        time_to_peak_seconds: 0,
        time_to_peak_hours: 0,
        early_exit: false
      };
    });
    
    // Filter to closed trades only for metrics (skip open positions)
    const closedTrades = trades.filter(t => t.status === 'closed');
    
    if (closedTrades.length === 0) {
      // Return empty metrics structure with all required fields
      return res.json({
        wallet_address: walletAddress,
        chain,
        total_trades: 0,
        win_count: 0,
        loss_count: 0,
        win_rate: 0,
        total_realized_pnl: 0,
        avg_realized_roi: 0,
        median_realized_roi: 0,
        total_realized_pnl_wins: 0,
        total_realized_pnl_losses: 0,
        avg_holding_hours: 0,
        median_holding_hours: 0,
        avg_holding_hours_winners: 0,
        avg_holding_hours_losers: 0,
        median_max_potential_roi: 0,
        entry_skill_score: 0,
        exit_skill_score: 0,
        overall_skill_score: 0,
        copy_trade_rating: 'N/A',
        market_cap_strategy: {
          favorite_bracket: 0,
          success_by_bracket: []
        },
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
