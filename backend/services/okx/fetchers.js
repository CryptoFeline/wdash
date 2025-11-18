// ============================================================
// OKX API FETCHERS
// ============================================================
// Clean, reusable OKX API data fetchers with caching
// All endpoints tested and validated in Test Scripts 01-05
// ============================================================

import fetch from 'node-fetch';

// ============================================================
// CACHING
// ============================================================

const cache = new Map();

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================
// BASE FETCHER
// ============================================================

async function fetchOKX(url, params, cacheKey = null) {
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  
  const queryString = new URLSearchParams(params).toString();
  const fullUrl = `${url}?${queryString}`;
  
  // Retry logic for rate limiting
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(fullUrl, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      if (response.status === 429) {
        // Rate limited - wait and retry
        const waitTime = Math.min(1000 * Math.pow(2, attempt), 5000); // Exponential backoff, max 5s
        console.log(`[OKX API] Rate limited, waiting ${waitTime}ms before retry ${attempt}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (cacheKey) {
        setCache(cacheKey, data);
      }
      
      return data;
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        const waitTime = 1000 * attempt;
        console.log(`[OKX API] Error on attempt ${attempt}, retrying in ${waitTime}ms:`, err.message);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
}

// ============================================================
// TRADE HISTORY (7-DAY WINDOW)
// ============================================================

export async function fetchTradeHistory(walletAddress, chainId) {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  let allTrades = [];
  let hasNext = true;
  let reachedOldTrades = false;
  
  while (hasNext && !reachedOldTrades) {
    const data = await fetchOKX(
      'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/trade-history',
      {
        walletAddress,
        chainId,
        pageSize: '100',
        tradeType: '1,2', // 1=buy, 2=sell
        filterRisk: 'false',
        t: Date.now()
      }
    );
    
    const trades = data.rows || [];
    if (trades.length === 0) break;
    
    // Check if we've reached trades older than 7 days
    const oldestInBatch = Math.min(...trades.map(t => t.blockTime));
    const recentTrades = trades.filter(t => t.blockTime >= sevenDaysAgo);
    allTrades = allTrades.concat(recentTrades);
    
    if (oldestInBatch < sevenDaysAgo) {
      reachedOldTrades = true;
      break;
    }
    
    hasNext = data.hasNext;
    
    if (hasNext && !reachedOldTrades) {
      await new Promise(r => setTimeout(r, 200)); // Rate limiting
    }
  }
  
  return allTrades;
}

// ============================================================
// TOKEN LIST (ALL TRADED TOKENS)
// ============================================================

export async function fetchTokenList(walletAddress, chainId, filterEmptyBalance = false) {
  let allTokens = [];
  let offset = 0;
  let hasNext = true;
  
  while (hasNext) {
    const data = await fetchOKX(
      'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list',
      {
        walletAddress,
        chainId,
        isAsc: 'false',
        sortType: '1', // Sort by PnL
        filterEmptyBalance: filterEmptyBalance ? 'true' : 'false',
        offset: offset.toString(),
        limit: '50',
        t: Date.now()
      }
    );
    
    const tokens = data.tokenList || [];
    allTokens = allTokens.concat(tokens);
    
    hasNext = data.hasNext;
    if (hasNext) {
      offset = data.offset;
      await new Promise(r => setTimeout(r, 200)); // Rate limiting
    }
  }
  
  return allTokens;
}

// ============================================================
// WALLET PROFILE SUMMARY
// ============================================================

export async function fetchWalletProfileSummary(walletAddress, chainId) {
  const cacheKey = `profile_${walletAddress}_${chainId}`;
  
  const data = await fetchOKX(
    'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/summary',
    {
      walletAddress,
      chainId,
      periodType: '3', // 7 days
      t: Date.now()
    },
    cacheKey
  );
  
  return data;
}

// ============================================================
// TOKEN OVERVIEW (FOR RUG DETECTION)
// ============================================================

export async function fetchTokenOverview(tokenAddress, chainId) {
  const cacheKey = `token_overview_${tokenAddress}_${chainId}`;
  
  try {
    const data = await fetchOKX(
      'https://web3.okx.com/priapi/v1/dx/market/v2/token/overview',
      {
        tokenContractAddress: tokenAddress,
        chainId: chainId,
        t: Date.now()
      },
      cacheKey
    );
    
    return data;
  } catch (error) {
    console.warn(`Failed to fetch token overview for ${tokenAddress}:`, error.message);
    return null;
  }
}

// ============================================================
// CLEAR CACHE (FOR TESTING)
// ============================================================

export function clearCache() {
  cache.clear();
}
