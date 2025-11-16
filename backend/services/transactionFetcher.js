/**
 * OKX Transaction Fetcher Service
 * 
 * Fetches individual buy/sell transactions using OKX Endpoint #7:
 * GET /priapi/v1/dx/market/v2/pnl/wallet-profile/trade-history
 * 
 * Per OKX_API_DOCS.md Section 7:
 * - Returns individual transaction records with exact blockTime timestamps
 * - type field: 1 = BUY, 2 = SELL
 * - Includes blockchain data: txHash, blockHeight
 * - Has singleRealizedProfit per transaction
 * - Pagination via globalIndex parameter
 * 
 * Advantages over Endpoint #4 (token-list):
 * - Individual transactions instead of aggregated per-token data
 * - Exact timestamps instead of approximations
 * - Can reconstruct proper FIFO trades
 * - One API call for entire wallet
 */

import axios from 'axios';

/**
 * Fetch all individual transactions for a wallet
 * 
 * @param {string} walletAddress - Wallet address to fetch
 * @param {string} chain - Chain ('sol', 'eth', etc.)
 * @param {Object} options - Fetch options
 * @returns {Promise<Array>} Array of individual transaction records
 */
export async function fetchAllTransactions(walletAddress, chain = 'sol', options = {}) {
  const {
    pageSize = 100, // Max transactions per page (OKX default: 10)
    maxPages = 50,   // Safety limit to prevent infinite loops
    filterRisk = true, // Filter risky transactions
    tradeTypes = [1, 2] // 1 = BUY, 2 = SELL
  } = options;
  
  console.log(`[TransactionFetcher] Fetching transactions for ${walletAddress} on ${chain}`);
  
  const chainId = getChainId(chain);
  const allTransactions = [];
  let currentPage = 0;
  let hasNext = true;
  let lastGlobalIndex = null;
  
  while (hasNext && currentPage < maxPages) {
    const pageTransactions = await fetchTransactionPage({
      walletAddress,
      chainId,
      pageSize,
      globalIndex: lastGlobalIndex,
      filterRisk,
      tradeTypes
    });
    
    if (pageTransactions.length === 0) {
      console.log(`[TransactionFetcher] No more transactions on page ${currentPage + 1}`);
      break;
    }
    
    allTransactions.push(...pageTransactions);
    currentPage++;
    
    // Check if there are more pages
    // OKX uses globalIndex of last item for pagination
    const lastTx = pageTransactions[pageTransactions.length - 1];
    lastGlobalIndex = lastTx.globalIndex;
    
    // If we got fewer transactions than pageSize, we've reached the end
    hasNext = pageTransactions.length === pageSize;
    
    console.log(`[TransactionFetcher] Page ${currentPage}: ${pageTransactions.length} transactions (total: ${allTransactions.length})`);
  }
  
  console.log(`[TransactionFetcher] Fetched ${allTransactions.length} total transactions across ${currentPage} pages`);
  
  return allTransactions;
}

/**
 * Fetch single page of transactions
 */
async function fetchTransactionPage(params) {
  const {
    walletAddress,
    chainId,
    pageSize,
    globalIndex,
    filterRisk,
    tradeTypes
  } = params;
  
  const okxUrl = `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/trade-history`;
  
  // Build query parameters
  const queryParams = {
    walletAddress,
    chainId,
    pageSize,
    tradeType: tradeTypes.join(','), // "1,2" for both BUY and SELL
    filterRisk: filterRisk ? 'true' : 'false',
    t: Date.now()
  };
  
  // Add globalIndex for pagination (not on first page)
  if (globalIndex) {
    queryParams.globalIndex = globalIndex;
  }
  
  try {
    const response = await axios.get(okxUrl, {
      params: queryParams,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    
    if (response.data?.code !== '0' && response.data?.code !== 0) {
      console.error('[TransactionFetcher] OKX API error:', response.data);
      return [];
    }
    
    if (!response.data?.data?.rows) {
      console.warn('[TransactionFetcher] No rows in OKX response');
      return [];
    }
    
    const transactions = response.data.data.rows;
    
    // Normalize transaction format
    return transactions.map(tx => normalizeTransaction(tx, chainId));
    
  } catch (error) {
    console.error('[TransactionFetcher] Error fetching transaction page:', error.message);
    throw error;
  }
}

/**
 * Normalize OKX transaction to our internal format
 * 
 * Per OKX_API_DOCS.md Section 7, each transaction has:
 * - blockTime: exact blockchain timestamp
 * - type: 1 = BUY, 2 = SELL
 * - amount: tokens traded
 * - price: exact price
 * - turnover: USD value
 * - singleRealizedProfit: profit for this transaction
 * - txHash, blockHeight: blockchain verification
 * - tokenContractAddress, tokenSymbol: token identity
 * - mcap: market cap at trade time
 * - riskControlLevel: 1-5 risk level
 */
function normalizeTransaction(tx, chainId) {
  return {
    // Blockchain identity
    txHash: tx.txHash,
    blockHeight: tx.blockHeight,
    blockTime: tx.blockTime, // exact timestamp in milliseconds
    chainId: chainId,
    globalIndex: tx.globalIndex, // for pagination
    
    // Transaction type
    type: tx.type, // 1 = BUY, 2 = SELL
    
    // Token identity
    tokenContractAddress: tx.tokenContractAddress,
    tokenSymbol: tx.tokenSymbol,
    tokenLogo: tx.tokenLogo,
    
    // Trade data
    amount: tx.amount, // token quantity
    price: tx.price, // price in USD
    turnover: tx.turnover, // USD value of trade
    
    // PnL
    singleRealizedProfit: tx.singleRealizedProfit, // profit for this individual transaction
    
    // Market data at trade time
    mcap: tx.mcap, // market cap at time of trade
    nativeTokenPrice: tx.nativeTokenPrice, // e.g., SOL price in USD
    
    // Risk
    riskControlLevel: tx.riskControlLevel, // 1-5 scale
    
    // Links
    openLink: tx.openLink, // OKX explorer link
    innerGotoUrl: tx.innerGotoUrl // OKX internal link
  };
}

/**
 * Get OKX chain ID from chain name
 */
function getChainId(chain) {
  const chainMap = {
    'sol': '501',
    'eth': '1',
    'bsc': '56',
    'polygon': '137',
    'arbitrum': '42161',
    'optimism': '10',
    'avalanche': '43114',
    'base': '8453'
  };
  
  return chainMap[chain.toLowerCase()] || '501'; // Default to Solana
}

/**
 * Fetch transactions with retry logic
 */
export async function fetchAllTransactionsWithRetry(walletAddress, chain = 'sol', options = {}, maxRetries = 3) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[TransactionFetcher] Attempt ${attempt}/${maxRetries}`);
      return await fetchAllTransactions(walletAddress, chain, options);
    } catch (error) {
      lastError = error;
      console.error(`[TransactionFetcher] Attempt ${attempt} failed:`, error.message);
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000); // Exponential backoff, max 5s
        console.log(`[TransactionFetcher] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw new Error(`Failed to fetch transactions after ${maxRetries} attempts: ${lastError.message}`);
}

/**
 * Get transaction summary statistics
 */
export function getTransactionSummary(transactions) {
  const buys = transactions.filter(tx => tx.type === 1);
  const sells = transactions.filter(tx => tx.type === 2);
  
  const uniqueTokens = new Set(transactions.map(tx => tx.tokenContractAddress));
  
  const totalBuyVolume = buys.reduce((sum, tx) => sum + parseFloat(tx.turnover || 0), 0);
  const totalSellVolume = sells.reduce((sum, tx) => sum + parseFloat(tx.turnover || 0), 0);
  
  const earliestTx = transactions.reduce((earliest, tx) => 
    !earliest || tx.blockTime < earliest.blockTime ? tx : earliest, null);
  
  const latestTx = transactions.reduce((latest, tx) => 
    !latest || tx.blockTime > latest.blockTime ? tx : latest, null);
  
  return {
    totalTransactions: transactions.length,
    totalBuys: buys.length,
    totalSells: sells.length,
    uniqueTokens: uniqueTokens.size,
    totalBuyVolume,
    totalSellVolume,
    netVolume: totalSellVolume - totalBuyVolume,
    earliestTransaction: earliestTx ? new Date(earliestTx.blockTime).toISOString() : null,
    latestTransaction: latestTx ? new Date(latestTx.blockTime).toISOString() : null,
    tradingPeriodDays: earliestTx && latestTx ? 
      (latestTx.blockTime - earliestTx.blockTime) / (1000 * 86400) : 0
  };
}
