import express from 'express';
import axios from 'axios';

const router = express.Router();
const OKX_BASE_URL = 'https://web3.okx.com';
const SOLANA_CHAIN_ID = '501';

/**
 * GET /api/okx/wallet/:address
 * Fetches comprehensive wallet data from OKX API
 * Combines data from 4 endpoints:
 * 1. Wallet Summary (Endpoint 1)
 * 2. Token Holdings - Current (Endpoint 4a with filterEmptyBalance=true)
 * 3. Token Trades - Historical (Endpoint 4b with filterEmptyBalance=false)
 * 4. Top 3 Token Trading History (Endpoint 6)
 */
router.get('/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const chainId = req.query.chainId || SOLANA_CHAIN_ID;

    console.log(`[OKX] Fetching data for wallet: ${address}, chain: ${chainId}`);

    // Parallel fetch for Endpoints 1, 4a, 4b
    const [summaryResponse, holdingsResponse, tradesResponse] = await Promise.all([
      // Endpoint 1: Wallet Profile Summary
      axios.get(`${OKX_BASE_URL}/priapi/v1/dx/market/v2/pnl/wallet-profile/summary`, {
        params: {
          periodType: 3, // 7 days
          chainId,
          walletAddress: address,
          t: Date.now()
        },
        timeout: 15000
      }),

      // Endpoint 4a: Current Holdings (filterEmptyBalance=true)
      axios.get(`${OKX_BASE_URL}/priapi/v1/dx/market/v2/pnl/token-list`, {
        params: {
          walletAddress: address,
          chainId,
          isAsc: false,
          sortType: 1, // Sort by PnL
          filterEmptyBalance: true, // Only current holdings
          offset: 0,
          limit: 100,
          t: Date.now()
        },
        timeout: 15000
      }),

      // Endpoint 4b: All Trades (filterEmptyBalance=false)
      axios.get(`${OKX_BASE_URL}/priapi/v1/dx/market/v2/pnl/token-list`, {
        params: {
          walletAddress: address,
          chainId,
          isAsc: false,
          sortType: 1,
          filterEmptyBalance: false, // All tokens including sold
          offset: 0,
          limit: 100,
          t: Date.now()
        },
        timeout: 15000
      })
    ]);

    // Extract data from responses
    const summary = summaryResponse.data?.data || {};
    const holdings = holdingsResponse.data?.data?.tokenList || [];
    const allTrades = tradesResponse.data?.data?.tokenList || [];

    // Get top 3 tokens by PnL for detailed history
    const topTokens = allTrades
      .filter(token => token.totalPnl && parseFloat(token.totalPnl) > 0)
      .sort((a, b) => parseFloat(b.totalPnl) - parseFloat(a.totalPnl))
      .slice(0, 3);

    // Fetch trading history for top 3 tokens (Endpoint 6)
    const tokenHistories = await Promise.all(
      topTokens.map(async (token) => {
        try {
          const historyResponse = await axios.get(
            `${OKX_BASE_URL}/priapi/v1/dx/market/v2/trading/kline-bs-point`,
            {
              params: {
                chainId,
                tokenAddress: token.tokenAddress,
                fromAddress: address,
                after: Date.now(),
                bar: '1m',
                limit: 240,
                t: Date.now()
              },
              timeout: 15000
            }
          );
          return {
            tokenAddress: token.tokenAddress,
            tokenSymbol: token.tokenSymbol,
            history: historyResponse.data?.data || []
          };
        } catch (error) {
          console.error(`[OKX] Error fetching history for token ${token.tokenSymbol}:`, error.message);
          return {
            tokenAddress: token.tokenAddress,
            tokenSymbol: token.tokenSymbol,
            history: []
          };
        }
      })
    );

    // Deduplicate: Remove tokens from allTrades that appear in holdings
    const holdingAddresses = new Set(holdings.map(h => h.tokenAddress));
    const historicalTrades = allTrades.filter(
      trade => !holdingAddresses.has(trade.tokenAddress)
    );

    // Combine all data
    const combinedData = {
      address,
      chainId,
      fetchedAt: new Date().toISOString(),
      summary: {
        avgCostBuy: summary.avgCostBuy,
        datePnlList: summary.datePnlList || [],
        favoriteMcapType: summary.favoriteMcapType,
        mcapTxsBuyList: summary.mcapTxsBuyList || [],
        nativeTokenBalanceAmount: summary.nativeTokenBalanceAmount,
        nativeTokenBalanceUsd: summary.nativeTokenBalanceUsd,
        newWinRateDistribution: summary.newWinRateDistribution || [],
        topTokens: summary.topTokens || [],
        topTokensTotalPnl: summary.topTokensTotalPnl,
        topTokensTotalRoi: summary.topTokensTotalRoi,
        totalPnl: summary.totalPnl,
        totalPnlRoi: summary.totalPnlRoi,
        totalProfitPnl: summary.totalProfitPnl,
        totalProfitPnlRoi: summary.totalProfitPnlRoi,
        totalTxsBuy: summary.totalTxsBuy,
        totalTxsSell: summary.totalTxsSell,
        totalVolumeBuy: summary.totalVolumeBuy,
        totalVolumeSell: summary.totalVolumeSell,
        totalWinRate: summary.totalWinRate,
        unrealizedPnl: summary.unrealizedPnl,
        unrealizedPnlRoi: summary.unrealizedPnlRoi,
        winRateList: summary.winRateList || []
      },
      holdings: holdings.map(token => ({
        tokenAddress: token.tokenAddress,
        tokenSymbol: token.tokenSymbol,
        tokenName: token.tokenName,
        logoUrl: token.logoUrl,
        balance: token.balance,
        balanceUsd: token.balanceUsd,
        buyVolume: token.buyVolume,
        sellVolume: token.sellVolume,
        totalPnl: token.totalPnl,
        totalPnlPercentage: token.totalPnlPercentage,
        realizedPnl: token.realizedPnl,
        unrealizedPnl: token.unrealizedPnl,
        buyAvgPrice: token.buyAvgPrice,
        sellAvgPrice: token.sellAvgPrice,
        holdAvgPrice: token.holdAvgPrice,
        totalTxBuy: token.totalTxBuy,
        totalTxSell: token.totalTxSell,
        riskLevel: token.riskLevel,
        holdingTime: token.holdingTime,
        latestTime: token.latestTime
      })),
      historicalTrades: historicalTrades.map(token => ({
        tokenAddress: token.tokenAddress,
        tokenSymbol: token.tokenSymbol,
        tokenName: token.tokenName,
        logoUrl: token.logoUrl,
        totalPnl: token.totalPnl,
        totalPnlPercentage: token.totalPnlPercentage,
        realizedPnl: token.realizedPnl,
        buyVolume: token.buyVolume,
        sellVolume: token.sellVolume,
        buyAvgPrice: token.buyAvgPrice,
        sellAvgPrice: token.sellAvgPrice,
        totalTxBuy: token.totalTxBuy,
        totalTxSell: token.totalTxSell,
        riskLevel: token.riskLevel,
        holdingTime: token.holdingTime
      })),
      tokenHistories
    };

    console.log(`[OKX] Successfully fetched data for ${address}`);
    console.log(`[OKX] Summary: ${summary.totalPnl} PnL, ${holdings.length} holdings, ${historicalTrades.length} historical trades`);

    res.json({
      success: true,
      data: combinedData
    });

  } catch (error) {
    console.error('[OKX] Error fetching wallet data:', error.message);
    
    // Check if it's a rate limit error
    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again in a moment.'
      });
    }

    // Check if it's a timeout
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        success: false,
        error: 'Request timeout. Please try again.'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch wallet data from OKX',
      details: error.message
    });
  }
});

export default router;
