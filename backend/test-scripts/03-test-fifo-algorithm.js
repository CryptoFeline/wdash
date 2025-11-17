import NodeCache from 'node-cache';

// ============================================================
// TEST SCRIPT 03: FIFO ALGORITHM
// ============================================================
// Purpose: Reconstruct trades by pairing buys/sells chronologically
// Input: Raw OKX trade history (type 1=buy, 2=sell)
// Output: Paired trades with entry/exit data, holding times, realized PnL
// ============================================================

const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache

const TEST_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const TEST_CHAIN = '501'; // Solana

// ============================================================
// GENERIC OKX FETCHER (with caching & error handling)
// ============================================================

async function fetchOKX(url, params = {}, cacheKey = null) {
  // Check cache
  if (cacheKey && cache.has(cacheKey)) {
    console.log(`   🔄 CACHE HIT: ${cacheKey}`);
    return cache.get(cacheKey);
  }

  // Build query string
  const queryString = new URLSearchParams(params).toString();
  const fullUrl = `${url}?${queryString}`;

  try {
    const response = await fetch(fullUrl);
    const data = await response.json();

    // Check for API errors
    if (data.code !== 0 && data.code !== '0') {
      console.error(`   ❌ OKX API Error (code ${data.code}): ${data.msg || data.error_message}`);
      console.error(`   Full response:`, JSON.stringify(data, null, 2));
      throw new Error(`OKX API returned error code ${data.code}`);
    }

    // Cache result
    if (cacheKey) {
      cache.set(cacheKey, data.data);
    }

    return data.data;
  } catch (error) {
    console.error(`   ❌ Fetch failed for ${url}:`, error.message);
    throw error;
  }
}

// ============================================================
// DATA FETCHERS (from Test Script 02)
// ============================================================

async function fetchTradeHistory(walletAddress, chainId) {
  console.log(`\n📜 Fetching Trade History (7-day window)...`);
  
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  console.log(`   7-day cutoff: ${new Date(sevenDaysAgo).toISOString()}`);
  
  let allTrades = [];
  let page = 1;
  let hasNext = true;
  let reachedOldTrades = false;
  
  while (hasNext && !reachedOldTrades) {
    const data = await fetchOKX(
      'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/trade-history',
      {
        walletAddress,
        chainId,
        pageSize: '100',
        tradeType: '1,2', // 1=buy, 2=sell (exclude transfers 3,4)
        filterRisk: 'false',
        t: Date.now()
      }
    );
    
    const trades = data.rows || [];
    if (trades.length === 0) break;
    
    // Get oldest trade in batch
    const oldestInBatch = Math.min(...trades.map(t => t.blockTime));
    const oldestDate = new Date(oldestInBatch).toISOString();
    
    // Filter to 7-day window
    const recentTrades = trades.filter(t => t.blockTime >= sevenDaysAgo);
    allTrades = allTrades.concat(recentTrades);
    
    console.log(`   Page ${page}: ${trades.length} trades, ${recentTrades.length} in 7d window (total: ${allTrades.length}) - oldest: ${oldestDate}`);
    
    // Early termination if reached old trades
    if (oldestInBatch < sevenDaysAgo) {
      reachedOldTrades = true;
      console.log(`   ⏹️  STOPPED: Oldest trade (${oldestDate}) is outside 7-day window`);
      break;
    }
    
    hasNext = data.hasNext;
    
    if (hasNext && !reachedOldTrades) {
      await new Promise(r => setTimeout(r, 200)); // Rate limit
      page++;
    }
  }
  
  console.log(`✅ Total 7-day trades: ${allTrades.length}`);
  console.log(`   Buys: ${allTrades.filter(t => t.type === 1).length}`);
  console.log(`   Sells: ${allTrades.filter(t => t.type === 2).length}`);
  
  return allTrades;
}

async function fetchTokenList(walletAddress, chainId, filterEmptyBalance = false) {
  console.log(`\n📊 Fetching Token List (filterEmptyBalance=${filterEmptyBalance})...`);
  
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
        limit: '50', // Max per page
        t: Date.now()
      }
    );
    
    const tokens = data.tokenList || [];
    allTokens = allTokens.concat(tokens);
    
    console.log(`   Fetched ${tokens.length} tokens (offset ${offset})`);
    
    hasNext = data.hasNext;
    if (hasNext) {
      offset = data.offset;
      await new Promise(r => setTimeout(r, 200)); // Rate limit
    }
  }
  
  console.log(`✅ Total tokens: ${allTokens.length}`);
  return allTokens;
}

async function fetchTokenOverview(tokenAddress, chainId) {
  const cacheKey = `token_overview_${chainId}_${tokenAddress}`;
  
  const data = await fetchOKX(
    'https://web3.okx.com/priapi/v1/dx/market/v2/token/overview',
    {
      chainId,
      tokenContractAddress: tokenAddress,
      t: Date.now()
    },
    cacheKey
  );
  
  return data;
}

// ============================================================
// FIFO ALGORITHM
// ============================================================

function reconstructTradesWithFIFO(transactions) {
  console.log(`\n🔄 Reconstructing Trades with FIFO Algorithm...`);
  console.log(`   Input: ${transactions.length} transactions`);
  
  // Sort by blockTime (oldest first)
  const sortedTxs = [...transactions].sort((a, b) => a.blockTime - b.blockTime);
  
  // Group by token
  const tokenGroups = new Map();
  for (const tx of sortedTxs) {
    const token = tx.tokenContractAddress;
    if (!tokenGroups.has(token)) {
      tokenGroups.set(token, []);
    }
    tokenGroups.get(token).push(tx);
  }
  
  console.log(`   Unique tokens: ${tokenGroups.size}`);
  
  // Reconstruct trades per token
  const allPairedTrades = [];
  const openPositions = [];
  
  for (const [tokenAddress, txs] of tokenGroups.entries()) {
    const tokenSymbol = txs[0].tokenSymbol;
    console.log(`\n   📈 Token: ${tokenSymbol} (${txs.length} transactions)`);
    
    const buyQueue = []; // FIFO queue of buys
    let pairedTradesForToken = 0;
    
    for (const tx of txs) {
      if (tx.type === 1) {
        // BUY: Add to queue
        buyQueue.push({
          ...tx,
          remaining: parseFloat(tx.amount)
        });
        console.log(`      BUY  ${new Date(tx.blockTime).toISOString()}: ${tx.amount} @ $${tx.price}`);
      } else if (tx.type === 2) {
        // SELL: Match with oldest buys (FIFO)
        let remainingSell = parseFloat(tx.amount);
        console.log(`      SELL ${new Date(tx.blockTime).toISOString()}: ${tx.amount} @ $${tx.price}`);
        
        while (remainingSell > 0 && buyQueue.length > 0) {
          const buy = buyQueue[0];
          const matchedAmount = Math.min(buy.remaining, remainingSell);
          
          // Calculate metrics
          const entryValue = matchedAmount * parseFloat(buy.price);
          const exitValue = matchedAmount * parseFloat(tx.price);
          const realizedPnl = exitValue - entryValue;
          const realizedRoi = ((parseFloat(tx.price) - parseFloat(buy.price)) / parseFloat(buy.price)) * 100;
          const holdingTimeSeconds = (tx.blockTime - buy.blockTime) / 1000;
          const holdingTimeHours = holdingTimeSeconds / 3600;
          
          const pairedTrade = {
            token_address: tokenAddress,
            token_symbol: tokenSymbol,
            entry_time: buy.blockTime,
            exit_time: tx.blockTime,
            holding_time_seconds: holdingTimeSeconds,
            holding_time_hours: holdingTimeHours,
            entry_price: parseFloat(buy.price),
            exit_price: parseFloat(tx.price),
            amount: matchedAmount,
            entry_value_usd: entryValue,
            exit_value_usd: exitValue,
            realized_pnl: realizedPnl,
            realized_roi: realizedRoi,
            entry_mcap: parseFloat(buy.mcap || 0),
            exit_mcap: parseFloat(tx.mcap || 0),
            entry_tx_hash: buy.txHash,
            exit_tx_hash: tx.txHash,
            is_open: false
          };
          
          allPairedTrades.push(pairedTrade);
          pairedTradesForToken++;
          
          console.log(`         ✅ Paired: ${matchedAmount.toFixed(2)} tokens, ${holdingTimeHours.toFixed(1)}h hold, PnL: $${realizedPnl.toFixed(2)} (${realizedRoi.toFixed(2)}%)`);
          
          // Update remaining amounts
          buy.remaining -= matchedAmount;
          remainingSell -= matchedAmount;
          
          // Remove buy if fully consumed
          if (buy.remaining <= 0.000001) { // Small epsilon for floating point
            buyQueue.shift();
          }
        }
        
        if (remainingSell > 0.000001) {
          console.log(`         ⚠️  WARNING: ${remainingSell.toFixed(2)} tokens sold without matching buy (possible transfer-in)`);
        }
      }
    }
    
    // Open positions (unsold buys)
    if (buyQueue.length > 0) {
      console.log(`      🔓 Open positions: ${buyQueue.length} buys`);
      for (const buy of buyQueue) {
        openPositions.push({
          token_address: tokenAddress,
          token_symbol: tokenSymbol,
          entry_time: buy.blockTime,
          exit_time: null,
          holding_time_seconds: (Date.now() - buy.blockTime) / 1000,
          holding_time_hours: (Date.now() - buy.blockTime) / 3600000,
          entry_price: parseFloat(buy.price),
          exit_price: null,
          amount: buy.remaining,
          entry_value_usd: buy.remaining * parseFloat(buy.price),
          exit_value_usd: null,
          realized_pnl: null,
          realized_roi: null,
          unrealized_pnl: null, // Will calculate later with current price
          unrealized_roi: null,
          entry_mcap: parseFloat(buy.mcap || 0),
          exit_mcap: null,
          entry_tx_hash: buy.txHash,
          exit_tx_hash: null,
          is_open: true,
          current_price: null,
          current_value_usd: null
        });
      }
    }
    
    console.log(`      ✅ Paired trades: ${pairedTradesForToken}`);
  }
  
  console.log(`\n✅ FIFO Reconstruction Complete:`);
  console.log(`   Paired trades: ${allPairedTrades.length}`);
  console.log(`   Open positions: ${openPositions.length}`);
  
  return { pairedTrades: allPairedTrades, openPositions };
}

// ============================================================
// UNREALIZED PNL CALCULATION (for open positions)
// ============================================================

async function calculateUnrealizedPnL(openPositions, tokenList) {
  console.log(`\n💰 Calculating Unrealized PnL for Open Positions...`);
  
  // Create token price lookup from token list
  const tokenPrices = new Map();
  for (const token of tokenList) {
    const currentPrice = parseFloat(token.price || 0);
    tokenPrices.set(token.tokenContractAddress, currentPrice);
  }
  
  // Enrich open positions
  for (const position of openPositions) {
    const currentPrice = tokenPrices.get(position.token_address) || 0;
    const currentValue = position.amount * currentPrice;
    const unrealizedPnl = currentValue - position.entry_value_usd;
    const unrealizedRoi = currentPrice > 0 
      ? ((currentPrice - position.entry_price) / position.entry_price) * 100 
      : 0;
    
    position.current_price = currentPrice;
    position.current_value_usd = currentValue;
    position.unrealized_pnl = unrealizedPnl;
    position.unrealized_roi = unrealizedRoi;
    
    console.log(`   ${position.token_symbol}: Entry $${position.entry_price.toFixed(8)} → Current $${currentPrice.toFixed(8)} = ${unrealizedRoi.toFixed(2)}% ($${unrealizedPnl.toFixed(2)})`);
  }
  
  return openPositions;
}

// ============================================================
// RUG DETECTION (check liquidity on open positions)
// ============================================================

async function detectRugs(openPositions) {
  console.log(`\n🚨 Detecting Rugs (Liquidity Removal)...`);
  
  const ruggedPositions = [];
  
  for (const position of openPositions) {
    try {
      const overview = await fetchTokenOverview(position.token_address, TEST_CHAIN);
      
      const currentLiquidity = parseFloat(overview.marketInfo?.totalLiquidity || 0);
      const hasLowLiquidity = currentLiquidity < 100; // Less than $100
      const devRugCount = parseInt(overview.basicInfo?.devRugPullTokenCount || 0);
      const hasRugHistory = devRugCount > 0;
      
      // Rug detection flags
      const isRugged = hasLowLiquidity || hasRugHistory;
      
      position.current_liquidity = currentLiquidity;
      position.is_rug = isRugged;
      position.rug_reason = [];
      
      if (hasLowLiquidity) {
        position.rug_reason.push(`Low Liquidity ($${currentLiquidity.toFixed(2)})`);
      }
      if (hasRugHistory) {
        position.rug_reason.push(`Deployer Rug History (${devRugCount} tokens)`);
      }
      
      if (isRugged) {
        ruggedPositions.push(position);
        console.log(`   🚨 RUGGED: ${position.token_symbol} - ${position.rug_reason.join(', ')}`);
        console.log(`      FALSE Unrealized PnL: $${position.unrealized_pnl?.toFixed(2)} (WORTHLESS!)`);
      } else {
        console.log(`   ✅ ${position.token_symbol}: Liquidity $${currentLiquidity.toFixed(2)}`);
      }
      
      await new Promise(r => setTimeout(r, 200)); // Rate limit
    } catch (error) {
      console.error(`   ❌ Failed to check ${position.token_symbol}:`, error.message);
    }
  }
  
  console.log(`\n✅ Rug Detection Complete:`);
  console.log(`   Rugged positions: ${ruggedPositions.length}/${openPositions.length}`);
  
  if (ruggedPositions.length > 0) {
    const falsePnL = ruggedPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
    console.log(`   ⚠️  FALSE Unrealized PnL: $${falsePnL.toFixed(2)} (liquidity removed!)`);
  }
  
  return openPositions;
}

// ============================================================
// VALIDATION (compare FIFO to OKX token-list data)
// ============================================================

function validateFIFO(pairedTrades, openPositions, tokenList) {
  console.log(`\n🔍 Validating FIFO Results Against OKX Token-List...`);
  
  // Aggregate FIFO data by token
  const fifoByToken = new Map();
  
  for (const trade of pairedTrades) {
    if (!fifoByToken.has(trade.token_address)) {
      fifoByToken.set(trade.token_address, {
        token_address: trade.token_address,
        token_symbol: trade.token_symbol,
        realized_pnl: 0,
        trade_count: 0
      });
    }
    const token = fifoByToken.get(trade.token_address);
    token.realized_pnl += trade.realized_pnl;
    token.trade_count++;
  }
  
  // Add unrealized PnL from open positions
  for (const position of openPositions) {
    if (!fifoByToken.has(position.token_address)) {
      fifoByToken.set(position.token_address, {
        token_address: position.token_address,
        token_symbol: position.token_symbol,
        realized_pnl: 0,
        trade_count: 0
      });
    }
    const token = fifoByToken.get(position.token_address);
    token.unrealized_pnl = (token.unrealized_pnl || 0) + (position.unrealized_pnl || 0);
  }
  
  // Compare to OKX token-list
  const discrepancies = [];
  let matchCount = 0;
  
  for (const [tokenAddress, fifoToken] of fifoByToken.entries()) {
    const okxToken = tokenList.find(t => t.tokenContractAddress === tokenAddress);
    
    if (!okxToken) {
      discrepancies.push({
        token: fifoToken.token_symbol,
        issue: 'Not found in OKX token list'
      });
      continue;
    }
    
    // Compare realized PnL
    const okxRealizedPnl = parseFloat(okxToken.realizedPnl || 0);
    const fifoRealizedPnl = fifoToken.realized_pnl || 0;
    
    if (okxRealizedPnl !== 0) {
      const pnlDiff = Math.abs(fifoRealizedPnl - okxRealizedPnl);
      const pnlDiffPercent = (pnlDiff / Math.abs(okxRealizedPnl)) * 100;
      
      if (pnlDiffPercent > 5) {
        discrepancies.push({
          token: fifoToken.token_symbol,
          issue: `PnL mismatch: FIFO=$${fifoRealizedPnl.toFixed(2)}, OKX=$${okxRealizedPnl.toFixed(2)}, diff=${pnlDiffPercent.toFixed(2)}%`
        });
      } else {
        matchCount++;
        console.log(`   ✅ ${fifoToken.token_symbol}: FIFO=$${fifoRealizedPnl.toFixed(2)}, OKX=$${okxRealizedPnl.toFixed(2)} (${pnlDiffPercent.toFixed(2)}% diff)`);
      }
    }
  }
  
  console.log(`\n✅ Validation Complete:`);
  console.log(`   Matches: ${matchCount}/${fifoByToken.size}`);
  console.log(`   Discrepancies: ${discrepancies.length}`);
  
  if (discrepancies.length > 0) {
    console.log(`\n⚠️  Discrepancies Found:`);
    for (const disc of discrepancies) {
      console.log(`   - ${disc.token}: ${disc.issue}`);
    }
  }
  
  return {
    isValid: discrepancies.length === 0,
    matches: matchCount,
    total: fifoByToken.size,
    discrepancies
  };
}

// ============================================================
// MAIN TEST FUNCTION
// ============================================================

async function runTest() {
  console.log('================================================');
  console.log('TEST SCRIPT 03: FIFO ALGORITHM');
  console.log('================================================');
  console.log(`Test Wallet: ${TEST_WALLET}`);
  console.log(`Chain: ${TEST_CHAIN} (Solana)`);
  console.log('================================================\n');

  try {
    // Step 1: Fetch trade history
    const trades = await fetchTradeHistory(TEST_WALLET, TEST_CHAIN);
    
    // Step 2: Fetch token list (for validation & unrealized PnL)
    const tokenList = await fetchTokenList(TEST_WALLET, TEST_CHAIN, false);
    
    // Step 3: Run FIFO algorithm
    const { pairedTrades, openPositions } = reconstructTradesWithFIFO(trades);
    
    // Step 4: Calculate unrealized PnL
    const enrichedOpenPositions = await calculateUnrealizedPnL(openPositions, tokenList);
    
    // Step 5: Detect rugs
    const rugCheckedPositions = await detectRugs(enrichedOpenPositions);
    
    // Step 6: Validate against OKX
    const validation = validateFIFO(pairedTrades, rugCheckedPositions, tokenList);
    
    // Step 7: Summary stats
    console.log('\n================================================');
    console.log('FIFO ALGORITHM TEST RESULTS');
    console.log('================================================');
    
    const totalRealizedPnl = pairedTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
    const totalUnrealizedPnl = rugCheckedPositions.reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
    const ruggedCount = rugCheckedPositions.filter(p => p.is_rug).length;
    const falsePnl = rugCheckedPositions.filter(p => p.is_rug).reduce((sum, p) => sum + (p.unrealized_pnl || 0), 0);
    
    console.log(`\n📊 Trade Reconstruction:`);
    console.log(`   Paired trades: ${pairedTrades.length}`);
    console.log(`   Open positions: ${rugCheckedPositions.length}`);
    console.log(`   Winning trades: ${pairedTrades.filter(t => t.realized_pnl > 0).length}`);
    console.log(`   Losing trades: ${pairedTrades.filter(t => t.realized_pnl < 0).length}`);
    
    console.log(`\n💰 PnL Summary:`);
    console.log(`   Realized PnL: $${totalRealizedPnl.toFixed(2)}`);
    console.log(`   Unrealized PnL: $${totalUnrealizedPnl.toFixed(2)}`);
    console.log(`   Total PnL: $${(totalRealizedPnl + totalUnrealizedPnl).toFixed(2)}`);
    
    console.log(`\n🚨 Rug Detection:`);
    console.log(`   Rugged positions: ${ruggedCount}/${rugCheckedPositions.length}`);
    console.log(`   FALSE Unrealized PnL: $${falsePnl.toFixed(2)}`);
    console.log(`   REAL Unrealized PnL: $${(totalUnrealizedPnl - falsePnl).toFixed(2)}`);
    
    console.log(`\n🔍 Validation:`);
    console.log(`   Status: ${validation.isValid ? '✅ PASSED' : '⚠️  HAS DISCREPANCIES'}`);
    console.log(`   Matches: ${validation.matches}/${validation.total}`);
    
    console.log('\n================================================');
    console.log('✅ TEST SCRIPT 03 COMPLETE');
    console.log('================================================\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run test
runTest().catch(console.error);
