import express from 'express';
import { reconstructWalletTrades } from '../services/tradeReconstruction.js';
import { computeMetrics } from '../services/metricsComputation.js';
import { enrichTradesWithPrices } from '../services/priceEnrichment.js';
import { enrichTradesWithRiskCheck, filterRiskyTrades } from '../services/riskCheck.js';
import { enrichTradesWithMarketCap, calculateMcapDistribution } from '../services/marketCapService.js';
import { calculateDiversityMetrics, calculateTemporalDiversity } from '../services/diversityMetrics.js';
import { fetchAllTransactionsWithRetry, getTransactionSummary } from '../services/transactionFetcher.js';
import { reconstructFIFOTrades, validateFIFOReconstruction } from '../services/fifoReconstruction.js';
import { formatForAdvancedAnalysis } from '../services/tokenAggregation.js';
import { enrichTradesWithTokenOverview } from '../services/tokenOverviewService.js';
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
 * Returns FIFO-reconstructed trades from individual transactions
 * 
 * Uses OKX Endpoint #7 (wallet-profile/trade-history) to fetch individual
 * buy/sell transactions, then reconstructs matched trades using FIFO algorithm
 * per DEEP_ANALYSIS_PLAN.md
 */
router.get('/trades/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const chain = req.query.chain || 'sol';
    
    console.log(`[Analysis API] Fetching individual transactions for ${walletAddress} on ${chain}`);
    
    // Step 1: Fetch individual transactions using OKX Endpoint #7
    // Limit to 7 days to match GMGN dashboard timeframe
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const allTransactions = await fetchAllTransactionsWithRetry(walletAddress, chain, {
      pageSize: 100,
      maxPages: 50, // Safety limit (5000 txs max)
      filterRisk: true,
      tradeTypes: [1, 2] // BUY and SELL
    });
    
    // Filter to last 7 days only (match GMGN dashboard)
    const transactions = allTransactions.filter(tx => tx.blockTime >= sevenDaysAgo);
    
    console.log(`[Analysis API] Filtered ${allTransactions.length} transactions to ${transactions.length} (last 7 days)`);
    
    if (transactions.length === 0) {
      return res.json({
        wallet_address: walletAddress,
        chain,
        trades: [],
        open_positions: [],
        total_count: 0,
        closed_count: 0,
        open_count: 0,
        message: 'No transactions found for this wallet'
      });
    }
    
    console.log(`[Analysis API] Fetched ${transactions.length} individual transactions`);
    
    // Log transaction summary
    const txSummary = getTransactionSummary(transactions);
    console.log(`[Analysis API] Transaction summary:`, txSummary);
    
    // Step 2: Reconstruct FIFO trades from individual transactions
    console.log(`[Analysis API] Reconstructing FIFO trades...`);
    const fifoResult = reconstructFIFOTrades(transactions);
    
    // Validate reconstruction
    validateFIFOReconstruction(transactions, fifoResult);
    
    const { closedTrades, openPositions } = fifoResult;
    
    console.log(`[Analysis API] FIFO reconstruction complete: ${closedTrades.length} closed, ${openPositions.length} open`);
    
    // Step 3: Enrich with token overview (rug detection, liquidity checks)
    // DISABLED BY DEFAULT - causes timeouts on wallets with many trades (GMGN API is slow)
    // Enable with ?enableTokenOverview=true if needed
    const enableTokenOverview = req.query.enableTokenOverview === 'true';
    let enrichedClosedTrades = closedTrades;
    let enrichedOpenPositions = openPositions;
    
    if (enableTokenOverview) {
      console.log(`[Analysis API] Enriching ${closedTrades.length} closed trades with token overview (rug detection)...`);
      enrichedClosedTrades = await enrichTradesWithTokenOverview(closedTrades, chain);
      console.log(`[Analysis API] Enriching ${openPositions.length} open positions with token overview...`);
      enrichedOpenPositions = await enrichTradesWithTokenOverview(openPositions, chain);
      console.log(`[Analysis API] Token overview enrichment complete`);
    } else {
      console.log(`[Analysis API] Token overview enrichment DISABLED (use ?enableTokenOverview=true to enable)`);
    }
    
    // Step 4: Enrich closed trades with price data (skip open positions)
    // DISABLED BY DEFAULT - GMGN OHLC API causes rate limiting (429 errors)
    // Enable with ?enrichPrices=true if needed
    const enablePriceEnrichment = req.query.enrichPrices === 'true';
    const enableRiskCheck = req.query.checkRisks !== 'false';
    
    if (enablePriceEnrichment && closedTrades.length > 0) {
      console.log(`[Analysis API] Enriching ${closedTrades.length} closed trades with OHLC data...`);
      enrichedClosedTrades = await enrichTradesWithPrices(enrichedClosedTrades, chain);
      console.log(`[Analysis API] Price enrichment complete`);
    } else if (closedTrades.length > 0) {
      console.log(`[Analysis API] Price enrichment DISABLED (use ?enrichPrices=true to enable)`);
    }
    
    // Step 5: Risk check (already have risk levels from OKX, but can enhance)
    if (enableRiskCheck) {
      console.log(`[Analysis API] Running enhanced risk checks...`);
      enrichedClosedTrades = await enrichTradesWithRiskCheck(enrichedClosedTrades, chain);
      console.log(`[Analysis API] Risk checks complete`);
    }
    
    // Combine all trades (closed + open)
    const allTrades = [...enrichedClosedTrades, ...enrichedOpenPositions];
    const riskyTradesCount = allTrades.filter(t => t.is_risky || t.risk_level >= 4 || t.is_rug).length;
    
    res.json({
      wallet_address: walletAddress,
      chain,
      trades: allTrades,
      closed_trades: enrichedClosedTrades,
      open_positions: enrichedOpenPositions,
      total_count: allTrades.length,
      closed_count: enrichedClosedTrades.length,
      open_count: openPositions.length,
      risky_trades: riskyTradesCount,
      enriched: enablePriceEnrichment,
      risk_checked: enableRiskCheck,
      transaction_summary: txSummary,
      data_source: 'OKX Endpoint #7 (individual transactions)',
      reconstruction_method: 'FIFO'
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
 * Returns computed metrics from FIFO-reconstructed trades
 * 
 * Uses OKX Endpoint #7 to fetch individual transactions, reconstructs FIFO trades,
 * then computes all metrics per DEEP_ANALYSIS_PLAN.md
 */
router.get('/metrics/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    const chain = req.query.chain || 'sol';
    
    console.log(`[Analysis API] Computing metrics for ${walletAddress} on ${chain}`);
    
    // Step 1: Fetch individual transactions using OKX Endpoint #7
    // Limit to 7 days to match GMGN dashboard timeframe
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const allTransactions = await fetchAllTransactionsWithRetry(walletAddress, chain, {
      pageSize: 100,
      maxPages: 50, // Safety limit (5000 txs max)
      filterRisk: true,
      tradeTypes: [1, 2]
    });
    
    // Filter to last 7 days only (match GMGN dashboard)
    const transactions = allTransactions.filter(tx => tx.blockTime >= sevenDaysAgo);
    
    console.log(`[Analysis API] Filtered ${allTransactions.length} transactions to ${transactions.length} (last 7 days)`);
    
    if (transactions.length === 0) {
      return res.json({
        wallet_address: walletAddress,
        chain,
        total_trades: 0,
        win_count: 0,
        loss_count: 0,
        win_rate: 0,
        total_pnl: 0,
        avg_roi: 0,
        median_roi: 0,
        avg_holding_hours: 0,
        message: 'No transactions found for this wallet'
      });
    }
    
    console.log(`[Analysis API] Fetched ${transactions.length} individual transactions`);
    
    // Step 2: Reconstruct FIFO trades
    const fifoResult = reconstructFIFOTrades(transactions);
    validateFIFOReconstruction(transactions, fifoResult);
    
    let { closedTrades, openPositions } = fifoResult;
    
    if (closedTrades.length === 0) {
      return res.json({
        wallet_address: walletAddress,
        chain,
        total_trades: 0,
        win_count: 0,
        loss_count: 0,
        win_rate: 0,
        total_pnl: 0,
        avg_roi: 0,
        median_roi: 0,
        avg_holding_hours: 0,
        open_positions: openPositions.length,
        message: 'No closed trades found (only open positions)'
      });
    }
    
    console.log(`[Analysis API] FIFO reconstruction: ${closedTrades.length} closed, ${openPositions.length} open`);
    
    // Step 3: Enrich with token overview (rug detection, liquidity checks)
    // DISABLED BY DEFAULT - causes timeouts on wallets with many trades (GMGN API is slow)
    // Enable with ?enableTokenOverview=true if needed
    const enableTokenOverview = req.query.enableTokenOverview === 'true';
    
    if (enableTokenOverview) {
      console.log(`[Analysis API] Enriching ${closedTrades.length} closed trades with token overview (rug detection)...`);
      closedTrades = await enrichTradesWithTokenOverview(closedTrades, chain);
      console.log(`[Analysis API] Enriching ${openPositions.length} open positions with token overview...`);
      openPositions = await enrichTradesWithTokenOverview(openPositions, chain);
      console.log(`[Analysis API] Token overview enrichment complete`);
    } else {
      console.log(`[Analysis API] Token overview enrichment DISABLED (use ?enableTokenOverview=true to enable)`);
    }
    
    // Step 4: Enrichment options
    // DISABLED BY DEFAULT - GMGN OHLC API causes rate limiting (429 errors)
    const enablePriceEnrichment = req.query.enrichPrices === 'true';
    const enableRiskCheck = req.query.checkRisks !== 'false';
    const enableMcapEnrichment = req.query.enrichMcap !== 'false';
    const filterRisky = req.query.filterRisky === 'true';
    
    // Enrich with market cap data
    if (enableMcapEnrichment) {
      console.log(`[Analysis API] Enriching ${closedTrades.length} trades with market cap data...`);
      closedTrades = await enrichTradesWithMarketCap(closedTrades, chain);
      console.log(`[Analysis API] Market cap enrichment complete`);
    }
    
    // Enrich with OHLC price data for max_potential_roi
    if (enablePriceEnrichment) {
      console.log(`[Analysis API] Enriching ${closedTrades.length} trades with OHLC data...`);
      closedTrades = await enrichTradesWithPrices(closedTrades, chain);
      console.log(`[Analysis API] Price enrichment complete`);
    } else {
      console.log(`[Analysis API] Price enrichment DISABLED (use ?enrichPrices=true to enable)`);
    }
    
    // Enhanced risk check (OKX already provides risk levels)
    if (enableRiskCheck) {
      console.log(`[Analysis API] Running enhanced risk checks...`);
      closedTrades = await enrichTradesWithRiskCheck(closedTrades, chain);
      console.log(`[Analysis API] Risk checks complete`);
    }
    
    // Filter risky trades if requested
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
    
    // Step 4: Compute metrics per DEEP_ANALYSIS_PLAN.md
    const metrics = computeMetrics(closedTrades);
    
    // Add market cap distribution
    if (enableMcapEnrichment) {
      metrics.market_cap_distribution = calculateMcapDistribution(closedTrades);
    }
    
    // Add diversity metrics
    metrics.diversity = calculateDiversityMetrics(closedTrades);
    metrics.temporal_diversity = calculateTemporalDiversity(closedTrades);
    
    // Step 5: Format for Advanced Analysis tab
    // Provides per-trade, per-token, and 7D overview data
    const advancedAnalysisData = formatForAdvancedAnalysis(closedTrades, openPositions);
    
    console.log(`[Analysis API] Metrics computed: ${metrics.total_trades} trades, ${metrics.win_rate.toFixed(1)}% win rate`);
    
    res.json({
      wallet_address: walletAddress,
      chain,
      
      // Core metrics
      metrics,
      
      // Advanced Analysis tab data (per-trade, per-token, 7D overview)
      advanced_analysis: advancedAnalysisData,
      
      // Metadata
      all_trades_count: allTradesCount,
      risky_trades_filtered: riskyTradesCount,
      open_positions_count: openPositions.length,
      enriched: enablePriceEnrichment,
      risk_checked: enableRiskCheck,
      filtered_risky: filterRisky,
      data_source: 'OKX Endpoint #7 (individual transactions)',
      reconstruction_method: 'FIFO'
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
