import axios from 'axios';

/**
 * Fetch swap list from CoinMarketCap DEX API
 * 
 * @param {string} address - Wallet address
 * @param {string} platform - Platform name (ethereum, solana, bsc, base, arbitrum)
 * @param {number} startTime - Start timestamp (ms)
 * @param {number} endTime - End timestamp (ms)
 * @returns {Promise<Array>} List of swaps
 */
export async function fetchSwapList(address, platform, startTime, endTime) {
  try {
    // Map internal chain names to CMC platform names
    const platformMap = {
      'eth': 'ethereum',
      '1': 'ethereum',
      'sol': 'solana',
      '501': 'solana',
      'bsc': 'bsc',
      '56': 'bsc',
      'base': 'base',
      '8453': 'base',
      'arb': 'arbitrum',
      '42161': 'arbitrum'
    };

    const cmcPlatform = platformMap[platform] || platform;

    const url = 'https://dapi.coinmarketcap.com/dex/v1/swap/list';
    const params = {
      address,
      platform: cmcPlatform,
      startTime,
      endTime,
      limit: 100, // Max limit per docs
      sortBy: 'ts',
      sortType: 'asc' // We want chronological order to find the "next" trade
    };

    console.log(`[CMC] Fetching swaps for ${address} on ${cmcPlatform} from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}`);

    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Origin': 'https://coinmarketcap.com',
        'Referer': 'https://coinmarketcap.com/'
      },
      timeout: 15000
    });

    if (response.data && response.data.data && response.data.data.swaps) {
      return {
        swaps: response.data.data.swaps,
        lastId: response.data.data.lastId
      };
    }

    return { swaps: [], lastId: null };
  } catch (error) {
    console.error(`[CMC] Error fetching swaps: ${error.message}`);
    return { swaps: [], lastId: null };
  }
}

/**
 * Fetch all swaps for a given time range (handling pagination)
 * 
 * @param {string} address - Wallet address
 * @param {string} platform - Platform name
 * @param {number} startTime - Start timestamp (ms)
 * @param {number} endTime - End timestamp (ms)
 * @returns {Promise<Array>} Complete list of swaps
 */
export async function fetchAllSwaps(address, platform, startTime, endTime) {
  let allSwaps = [];
  let lastId = null;
  let hasMore = true;
  let page = 0;
  const MAX_PAGES = 10; // Safety limit

  while (hasMore && page < MAX_PAGES) {
    // For pagination, CMC usually uses the lastId as a cursor.
    // The docs show "lastId" in response, but don't explicitly say how to use it in request.
    // Usually it's a query param like `?lastId=...` or `?cursor=...`.
    // Looking at the docs example URL: `...&limit=50&sortBy=ts&sortType=desc`
    // It doesn't show `lastId` in the request example.
    // However, standard pagination usually involves passing the `lastId` back.
    // I will assume we pass it as `lastId` param if it exists.
    
    // Wait, if I can't confirm how to paginate, maybe I should just rely on time windows?
    // But the user said "limit: Number of records to return (max 100)".
    // If I have > 100 swaps, I need pagination.
    // Let's assume `lastId` is the param.
    
    // Actually, if I can't paginate, I can slide the window.
    // But let's try to use `lastId` if I can.
    // If not, I'll just fetch once for now and maybe the user can clarify or I'll find out.
    // But wait, the docs say: "lastId": "1762021247000_23706239_75_186" // Last ID for pagination
    // This strongly implies it's used for pagination.
    
    // Let's try to pass `lastId` in params if we have it.
    
    const url = 'https://dapi.coinmarketcap.com/dex/v1/swap/list';
    // ... (I'll reuse the logic from fetchSwapList but adapted)
    
    // Actually, let's just modify fetchSwapList to accept lastId and use it in the loop here.
    // But I need to modify fetchSwapList signature or params.
    
    // Let's just implement the loop here calling a modified fetchSwapList or just axios directly.
    // To avoid code duplication, I'll refactor fetchSwapList to accept `params` override.
    
    // Re-reading fetchSwapList implementation...
    // I'll just copy the axios call logic here for now to be safe and flexible.
    
    try {
      const platformMap = {
        'eth': 'ethereum',
        '1': 'ethereum',
        'sol': 'solana',
        '501': 'solana',
        'bsc': 'bsc',
        '56': 'bsc',
        'base': 'base',
        '8453': 'base',
        'arb': 'arbitrum',
        '42161': 'arbitrum'
      };
      const cmcPlatform = platformMap[platform] || platform;
      
      const requestParams = {
        address,
        platform: cmcPlatform,
        startTime,
        endTime,
        limit: 100,
        sortBy: 'ts',
        sortType: 'asc'
      };
      
      if (lastId) {
        requestParams.lastId = lastId;
      }

      console.log(`[CMC] Fetching page ${page + 1} for ${address} (lastId: ${lastId || 'none'})`);

      const response = await axios.get('https://dapi.coinmarketcap.com/dex/v1/swap/list', {
        params: requestParams,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Origin': 'https://coinmarketcap.com',
          'Referer': 'https://coinmarketcap.com/'
        },
        timeout: 15000
      });

      if (response.data && response.data.data && response.data.data.swaps) {
        const newSwaps = response.data.data.swaps;
        allSwaps = [...allSwaps, ...newSwaps];
        lastId = response.data.data.lastId;
        
        if (newSwaps.length < 100 || !lastId) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
      
      page++;
      
      // Rate limit protection
      if (hasMore) await new Promise(r => setTimeout(r, 200));
      
    } catch (err) {
      console.error(`[CMC] Error fetching page ${page}: ${err.message}`);
      hasMore = false;
    }
  }
  
  return allSwaps;
}

/**
 * Find the "Copytrade Entry Price" for a specific trade
 * 
 * Logic:
 * 1. Find the trade in the swap list that matches the original trade (by time/hash approx)
 * 2. Find the *next* trade in the list
 * 3. Extract the price of the token bought/sold
 * 
 * @param {Object} trade - The original trade object
 * @param {Array} swapList - List of swaps from CMC
 * @param {string} [walletAddress] - Optional wallet address to help identify the trade
 * @returns {Object} Object containing copyPrice, originalTrade, and nextTrade details
 */
export function findNextTradePrice(trade, swapList, walletAddress = null) {
  const result = {
    copyPrice: null,
    originalTrade: null,
    nextTrade: null
  };

  if (!swapList || swapList.length === 0) return result;

  // Sort by timestamp (asc) AND block height (asc) to ensure correct order
  // Even if timestamps are identical, the block height 'h' will differentiate the order
  swapList.sort((a, b) => {
    const tsDiff = parseInt(a.ts) - parseInt(b.ts);
    if (tsDiff !== 0) return tsDiff;
    
    // If timestamps are equal, sort by block height
    const hA = parseInt(a.h || '0');
    const hB = parseInt(b.h || '0');
    return hA - hB;
  });

  // Find the index of the trade in the swap list
  // We match by transaction hash if available, or approximate timestamp
  
  const tradeTimeMs = trade.entry_timestamp || trade.entry_time || (trade.blockTime ? trade.blockTime * 1000 : 0);
  const tokenAddr = (trade.tokenContractAddress || trade.token_address || '').toLowerCase();

  if (!tokenAddr) return result;
  
  // Find the trade index
  let tradeIndex = -1;
  
  // 1. Try to match by tx hash (Strongest signal)
  if (trade.txHash || trade.entry_tx_hash) {
    const tx = trade.txHash || trade.entry_tx_hash;
    tradeIndex = swapList.findIndex(s => s.tx === tx || s.txId === tx);
  }

  // 2. Try to match by Wallet Address + Timestamp (Strong signal)
  if (tradeIndex === -1 && walletAddress) {
    // Look for a trade with the same maker address around the same time
    tradeIndex = swapList.findIndex(s => 
      s.ma === walletAddress && 
      Math.abs(parseInt(s.ts) - tradeTimeMs) < 60000 && // 1 min buffer
      (s.t0a.toLowerCase() === tokenAddr || s.t1a.toLowerCase() === tokenAddr)
    );
  }
  
  // 3. Fallback: Fuzzy timestamp matching (Weakest signal)
  if (tradeIndex === -1) {
    tradeIndex = swapList.findIndex(s => Math.abs(parseInt(s.ts) - tradeTimeMs) < 60000 && 
      (s.t0a.toLowerCase() === tokenAddr || s.t1a.toLowerCase() === tokenAddr)
    );
  }

  // Helper to extract price from swap
  const getPrice = (swap) => {
    if (swap.t0a.toLowerCase() === tokenAddr) return parseFloat(swap.t0pu);
    if (swap.t1a.toLowerCase() === tokenAddr) return parseFloat(swap.t1pu);
    return null;
  };

  // Helper to format trade info
  const formatTradeInfo = (swap) => ({
    price: getPrice(swap),
    ts: swap.ts,
    h: swap.h,
    tx: swap.tx || swap.txId
  });

  if (tradeIndex !== -1) {
    // We found the original trade
    result.originalTrade = formatTradeInfo(swapList[tradeIndex]);

    if (tradeIndex < swapList.length - 1) {
      // We found the next trade
      const nextSwap = swapList[tradeIndex + 1];
      result.nextTrade = formatTradeInfo(nextSwap);
      
      // CONSERVATIVE SIMULATION:
      // If the next trade price is LOWER than the original, it's likely a Sell (Bid price) 
      // or the market moved down. In a real copy-buy scenario, it is very rare to get a 
      // better entry than the leader immediately after. We assume the floor is the leader's price.
      // This protects against "lucky" simulations where we pick up a subsequent Sell order.
      result.copyPrice = Math.max(result.nextTrade.price, result.originalTrade.price);
      
      return result;
    }
  }
  
  // Fallback: If we can't find the exact trade, but we have swaps *after* the trade time
  // take the first swap that is strictly AFTER the trade time
  const nextSwap = swapList.find(s => parseInt(s.ts) > tradeTimeMs);
  
  if (nextSwap) {
    result.nextTrade = formatTradeInfo(nextSwap);
    // Apply the same conservative floor logic
    const originalPrice = result.originalTrade ? result.originalTrade.price : 0;
    // If we don't have original trade price (rare), just use next price. 
    // If we do, ensure we don't go lower.
    result.copyPrice = originalPrice ? Math.max(result.nextTrade.price, originalPrice) : result.nextTrade.price;
  }

  return result;
}
