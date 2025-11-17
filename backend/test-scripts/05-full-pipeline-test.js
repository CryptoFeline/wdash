// ============================================================
// TEST SCRIPT 05: FULL PIPELINE INTEGRATION
// ============================================================
// Purpose: End-to-end test combining all previous scripts
// Tests: Data fetching → FIFO → Aggregations → Validation
// ============================================================

import fetch from 'node-fetch';

const TEST_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo'; // Solana
const TEST_CHAIN = '501'; // Solana

console.log('================================================');
console.log('TEST SCRIPT 05: FULL PIPELINE INTEGRATION');
console.log('================================================');
console.log(`Test Wallet: ${TEST_WALLET}`);
console.log(`Chain: ${TEST_CHAIN} (Solana)`);
console.log('================================================\n');

// ============================================================
// CACHING
// ============================================================

const cache = new Map();

function getCached(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
    console.log(`   🔄 CACHE HIT: ${key}`);
    return cached.data;
  }
  return null;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

// ============================================================
// OKX API FETCHER
// ============================================================

async function fetchOKX(url, params, cacheKey = null) {
  if (cacheKey) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }
  
  const queryString = new URLSearchParams(params).toString();
  const fullUrl = `${url}?${queryString}`;
  
  const response = await fetch(fullUrl, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }
  });
  
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  
  const json = await response.json();
  
  if (json.code !== 0) {
    throw new Error(`API Error ${json.code}: ${json.msg}`);
  }
  
  const data = json.data;
  
  if (cacheKey) {
    setCache(cacheKey, data);
  }
  
  return data;
}

// ============================================================
// DATA FETCHERS
// ============================================================

async function fetchTradeHistory(walletAddress, chainId) {
  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
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
        tradeType: '1,2',
        filterRisk: 'false',
        t: Date.now()
      }
    );
    
    const trades = data.rows || [];
    if (trades.length === 0) break;
    
    const oldestInBatch = Math.min(...trades.map(t => t.blockTime));
    const recentTrades = trades.filter(t => t.blockTime >= sevenDaysAgo);
    allTrades = allTrades.concat(recentTrades);
    
    if (oldestInBatch < sevenDaysAgo) {
      reachedOldTrades = true;
      break;
    }
    
    hasNext = data.hasNext;
    
    if (hasNext && !reachedOldTrades) {
      await new Promise(r => setTimeout(r, 200));
      page++;
    }
  }
  
  return allTrades;
}

async function fetchTokenList(walletAddress, chainId, filterEmptyBalance = false) {
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
        sortType: '1',
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
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  return allTokens;
}

async function fetchWalletProfileSummary(walletAddress, chainId, periodType = '3') {
  const data = await fetchOKX(
    'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/summary',
    {
      walletAddress,
      chainId,
      periodType, // 3 = 7 days
      t: Date.now()
    },
    `profile_summary_${walletAddress}_${chainId}_${periodType}`
  );
  
  return data;
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
  const tokenTxMap = new Map();
  
  for (const tx of transactions) {
    const tokenAddress = tx.tokenContractAddress;
    if (!tokenTxMap.has(tokenAddress)) {
      tokenTxMap.set(tokenAddress, []);
    }
    tokenTxMap.get(tokenAddress).push(tx);
  }
  
  const allPairedTrades = [];
  const openPositions = [];
  
  for (const [tokenAddress, txs] of tokenTxMap) {
    txs.sort((a, b) => a.blockTime - b.blockTime);
    
    const tokenSymbol = txs[0].tokenSymbol;
    const buyQueue = [];
    
    for (const tx of txs) {
      if (tx.type === 1) {
        buyQueue.push({
          ...tx,
          remaining: parseFloat(tx.amount)
        });
      } else if (tx.type === 2) {
        let remainingSell = parseFloat(tx.amount);
        
        while (remainingSell > 0 && buyQueue.length > 0) {
          const buy = buyQueue[0];
          const matchedAmount = Math.min(buy.remaining, remainingSell);
          
          const entryValue = matchedAmount * parseFloat(buy.price);
          const exitValue = matchedAmount * parseFloat(tx.price);
          const realizedPnl = exitValue - entryValue;
          const realizedRoi = ((parseFloat(tx.price) - parseFloat(buy.price)) / parseFloat(buy.price)) * 100;
          const holdingTimeSeconds = (tx.blockTime - buy.blockTime) / 1000;
          
          allPairedTrades.push({
            token_address: tokenAddress,
            token_symbol: tokenSymbol,
            entry_time: buy.blockTime,
            exit_time: tx.blockTime,
            holding_time_seconds: holdingTimeSeconds,
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
          });
          
          buy.remaining -= matchedAmount;
          remainingSell -= matchedAmount;
          
          if (buy.remaining <= 0.000001) {
            buyQueue.shift();
          }
        }
      }
    }
    
    // Open positions
    if (buyQueue.length > 0) {
      for (const buy of buyQueue) {
        openPositions.push({
          token_address: tokenAddress,
          token_symbol: tokenSymbol,
          entry_time: buy.blockTime,
          exit_time: null,
          holding_time_seconds: (Date.now() - buy.blockTime) / 1000,
          entry_price: parseFloat(buy.price),
          exit_price: null,
          amount: buy.remaining,
          entry_value_usd: buy.remaining * parseFloat(buy.price),
          exit_value_usd: null,
          realized_pnl: null,
          realized_roi: null,
          unrealized_pnl: null,
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
  }
  
  return { pairedTrades: allPairedTrades, openPositions };
}

// ============================================================
// ENRICHMENT & RUG DETECTION
// ============================================================

async function enrichOpenPositions(openPositions, tokenList) {
  const tokenPrices = new Map();
  for (const token of tokenList) {
    const currentPrice = parseFloat(token.price || 0);
    tokenPrices.set(token.tokenContractAddress, currentPrice);
  }
  
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
  }
  
  // Rug detection
  for (const position of openPositions) {
    try {
      const overview = await fetchTokenOverview(position.token_address, TEST_CHAIN);
      
      const currentLiquidity = parseFloat(overview.marketInfo?.totalLiquidity || 0);
      const devRugCount = parseInt(overview.basicInfo?.devRugPullTokenCount || 0);
      
      const isRugged = currentLiquidity < 100 || devRugCount > 0;
      
      position.current_liquidity = currentLiquidity;
      position.is_rug = isRugged;
      position.rug_reason = [];
      
      if (currentLiquidity < 100) {
        position.rug_reason.push(`Low Liquidity ($${currentLiquidity.toFixed(2)})`);
      }
      if (devRugCount > 0) {
        position.rug_reason.push(`Deployer Rug History (${devRugCount} tokens)`);
      }
      
      // CORRECTED: Real loss = entry cost
      position.unrealized_pnl_raw = position.unrealized_pnl;
      position.unrealized_pnl_real = isRugged ? -position.entry_value_usd : position.unrealized_pnl;
      position.confirmed_loss = isRugged ? position.entry_value_usd : 0;
      
      if (isRugged) {
        position.realized_roi = -100;
        position.is_realized_loss = true;
      }
      
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.error(`   ❌ Failed to check ${position.token_symbol}:`, error.message);
      position.is_rug = false;
    }
  }
  
  return openPositions;
}

async function checkClosedTradesForRugs(pairedTrades) {
  const uniqueTokens = [...new Set(pairedTrades.map(t => t.token_address))];
  
  for (const tokenAddress of uniqueTokens) {
    try {
      const overview = await fetchTokenOverview(tokenAddress, TEST_CHAIN);
      
      const currentLiquidity = parseFloat(overview.marketInfo?.totalLiquidity || 0);
      const devRugCount = parseInt(overview.basicInfo?.devRugPullTokenCount || 0);
      
      const isRugNow = currentLiquidity < 100 || devRugCount > 0;
      
      const tokenTrades = pairedTrades.filter(t => t.token_address === tokenAddress);
      for (const trade of tokenTrades) {
        trade.is_rug_now = isRugNow;
        trade.current_liquidity = currentLiquidity;
        
        if (isRugNow) {
          trade.rug_warning = `Token later became rug (liquidity: $${currentLiquidity.toFixed(2)})`;
        }
      }
      
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.error(`   ❌ Failed to check ${tokenAddress.slice(0, 8)}:`, error.message);
    }
  }
  
  return pairedTrades;
}

// ============================================================
// CHRONOLOGICAL CAPITAL TRACKING
// ============================================================

function trackCapitalChronologically(pairedTrades, openPositions) {
  const allTransactions = [];
  
  for (const trade of pairedTrades) {
    allTransactions.push({
      time: trade.entry_time,
      type: 'BUY',
      amount: trade.entry_value_usd,
      token: trade.token_symbol,
      trade_ref: trade
    });
    allTransactions.push({
      time: trade.exit_time,
      type: 'SELL',
      amount: trade.exit_value_usd,
      pnl: trade.realized_pnl,
      token: trade.token_symbol,
      trade_ref: trade
    });
  }
  
  for (const position of openPositions) {
    allTransactions.push({
      time: position.entry_time,
      type: 'BUY',
      amount: position.entry_value_usd,
      token: position.token_symbol,
      trade_ref: position
    });
  }
  
  allTransactions.sort((a, b) => a.time - b.time);
  
  let starting_capital = 0;
  let current_capital = 0;
  let peak_capital = 0;
  let capital_deployed = 0;
  let total_gains = 0;
  let total_losses = 0;
  
  const timeline = [];
  
  for (const tx of allTransactions) {
    if (tx.type === 'BUY') {
      const needed_capital = tx.amount;
      
      if (current_capital < needed_capital) {
        const fresh_capital_needed = needed_capital - current_capital;
        starting_capital += fresh_capital_needed;
        capital_deployed = Math.max(capital_deployed, starting_capital);
        current_capital += fresh_capital_needed;
      }
      
      current_capital -= needed_capital;
      
      timeline.push({
        time: tx.time,
        type: 'BUY',
        token: tx.token,
        amount: needed_capital,
        capital_before: current_capital + needed_capital,
        capital_after: current_capital,
        starting_capital,
        capital_deployed
      });
      
    } else if (tx.type === 'SELL') {
      current_capital += tx.amount;
      
      if (tx.pnl > 0) {
        total_gains += tx.pnl;
      } else if (tx.pnl < 0) {
        total_losses += Math.abs(tx.pnl);
      }
      
      peak_capital = Math.max(peak_capital, current_capital);
      
      timeline.push({
        time: tx.time,
        type: 'SELL',
        token: tx.token,
        amount: tx.amount,
        pnl: tx.pnl,
        capital_before: current_capital - tx.amount,
        capital_after: current_capital,
        total_gains,
        total_losses,
        peak_capital
      });
    }
  }
  
  const ruggedPositions = openPositions.filter(p => p.is_rug);
  const rugged_capital = ruggedPositions.reduce((sum, p) => sum + p.confirmed_loss, 0);
  total_losses += rugged_capital;
  
  const final_capital = current_capital - rugged_capital;
  
  return {
    starting_capital,
    peak_capital_deployed: capital_deployed,
    current_liquid_capital: current_capital,
    rugged_capital,
    final_capital,
    total_gains,
    total_losses,
    net_pnl: total_gains - total_losses,
    wallet_growth_roi: (final_capital - starting_capital) / starting_capital * 100,
    trading_performance_roi: (total_gains - total_losses) / starting_capital * 100,
    timeline
  };
}

// ============================================================
// AGGREGATIONS
// ============================================================

function aggregateToTokenLevel(pairedTrades, openPositions) {
  const tokenMap = new Map();
  const allTrades = [...pairedTrades, ...openPositions];
  
  for (const trade of allTrades) {
    if (!tokenMap.has(trade.token_address)) {
      tokenMap.set(trade.token_address, {
        token_address: trade.token_address,
        token_symbol: trade.token_symbol,
        total_trades: 0,
        closed_trades: 0,
        open_positions: 0,
        rugged_positions: 0,
        winning_trades: 0,
        losing_trades: 0,
        total_invested: 0,
        total_returned: 0,
        total_realized_pnl: 0,
        total_confirmed_loss: 0,
        net_pnl: 0,
        avg_roi: 0,
        is_held: false,
        is_rugged: false,
        traded_rug_token: false,
        rug_flags: []
      });
    }
    
    const token = tokenMap.get(trade.token_address);
    token.total_trades++;
    token.total_invested += trade.entry_value_usd;
    
    if (trade.is_open) {
      token.open_positions++;
      token.is_held = true;
      
      if (trade.is_rug) {
        token.rugged_positions++;
        token.total_confirmed_loss += trade.confirmed_loss;
        token.losing_trades++;
      }
    } else {
      token.closed_trades++;
      token.total_returned += trade.exit_value_usd;
      token.total_realized_pnl += trade.realized_pnl;
      
      if (trade.realized_pnl > 0) {
        token.winning_trades++;
      } else {
        token.losing_trades++;
      }
      
      if (trade.is_rug_now) {
        token.traded_rug_token = true;
        token.rug_flags.push('Traded token that later rugged');
      }
    }
    
    if (trade.is_rug || trade.is_rug_now) {
      token.is_rugged = true;
      if (trade.current_liquidity !== undefined) {
        token.rug_flags.push(`Low Liquidity ($${trade.current_liquidity.toFixed(2)})`);
      }
    }
  }
  
  for (const token of tokenMap.values()) {
    token.net_pnl = token.total_realized_pnl - token.total_confirmed_loss;
    token.avg_roi = token.total_invested > 0 
      ? (token.net_pnl / token.total_invested) * 100 
      : 0;
    
    const totalDecided = token.winning_trades + token.losing_trades;
    token.win_rate = totalDecided > 0 
      ? (token.winning_trades / totalDecided) * 100 
      : 0;
    
    token.rug_flags = [...new Set(token.rug_flags)];
  }
  
  return Array.from(tokenMap.values());
}

function aggregateToOverview(pairedTrades, openPositions, tokens, capitalTracking) {
  const allTrades = [...pairedTrades, ...openPositions];
  const ruggedPositions = openPositions.filter(p => p.is_rug);
  
  const simple_total_buys = allTrades.reduce((sum, t) => sum + t.entry_value_usd, 0);
  const simple_total_sells = pairedTrades.reduce((sum, t) => sum + t.exit_value_usd, 0);
  const simple_gross_profit = simple_total_sells - simple_total_buys;
  
  const total_realized_pnl = pairedTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
  const total_confirmed_loss = ruggedPositions.reduce((sum, p) => sum + p.confirmed_loss, 0);
  const net_pnl = total_realized_pnl - total_confirmed_loss;
  
  const closed_winning = pairedTrades.filter(t => t.realized_pnl > 0).length;
  const closed_losing = pairedTrades.filter(t => t.realized_pnl < 0).length;
  const rugged_count = ruggedPositions.length;
  
  const total_winning = closed_winning;
  const total_losing = closed_losing + rugged_count;
  const win_rate = total_winning / (total_winning + total_losing) * 100;
  
  const total_roi = pairedTrades.reduce((sum, t) => sum + t.realized_roi, 0);
  const avg_roi = total_roi / pairedTrades.length;
  
  const verification = {
    simple_gross_profit_matches_net_pnl: Math.abs(simple_gross_profit - net_pnl) < 1,
    chronological_net_pnl_matches: Math.abs(capitalTracking.net_pnl - net_pnl) < 1,
    simple_gross_diff: simple_gross_profit - net_pnl,
    chronological_diff: capitalTracking.net_pnl - net_pnl
  };
  
  return {
    total_trades: allTrades.length,
    closed_trades: pairedTrades.length,
    open_positions: openPositions.length,
    rugged_positions: rugged_count,
    winning_trades: total_winning,
    losing_trades: total_losing,
    win_rate,
    
    simple_total_buys,
    simple_total_sells,
    simple_gross_profit,
    
    chronological_starting_capital: capitalTracking.starting_capital,
    chronological_peak_deployed: capitalTracking.peak_capital_deployed,
    chronological_final_capital: capitalTracking.final_capital,
    chronological_net_pnl: capitalTracking.net_pnl,
    chronological_wallet_growth_roi: capitalTracking.wallet_growth_roi,
    chronological_trading_performance_roi: capitalTracking.trading_performance_roi,
    chronological_total_gains: capitalTracking.total_gains,
    chronological_total_losses: capitalTracking.total_losses,
    
    total_realized_pnl,
    total_confirmed_loss,
    net_pnl,
    avg_roi,
    
    rugged_tokens: tokens.filter(t => t.is_rugged).length,
    traded_rug_tokens: tokens.filter(t => t.traded_rug_token).length,
    
    verification
  };
}

// ============================================================
// MAIN TEST EXECUTION
// ============================================================

async function runFullPipeline() {
  try {
    console.log('🚀 Starting Full Pipeline Test...\n');
    
    // Step 1: Fetch data
    console.log('📥 Step 1: Fetching data from OKX...');
    const [trades, tokenList, profileSummary] = await Promise.all([
      fetchTradeHistory(TEST_WALLET, TEST_CHAIN),
      fetchTokenList(TEST_WALLET, TEST_CHAIN),
      fetchWalletProfileSummary(TEST_WALLET, TEST_CHAIN)
    ]);
    console.log(`✅ Fetched: ${trades.length} trades, ${tokenList.length} tokens\n`);
    
    // Step 2: FIFO reconstruction
    console.log('🔄 Step 2: Running FIFO algorithm...');
    const { pairedTrades, openPositions } = reconstructTradesWithFIFO(trades);
    console.log(`✅ FIFO: ${pairedTrades.length} paired, ${openPositions.length} open\n`);
    
    // Step 3: Enrich open positions
    console.log('💰 Step 3: Enriching open positions...');
    const enrichedOpenPositions = await enrichOpenPositions(openPositions, tokenList);
    console.log(`✅ Enriched ${enrichedOpenPositions.length} positions\n`);
    
    // Step 4: Check closed trades for rugs
    console.log('🔍 Step 4: Checking closed trades for later rugs...');
    const rugCheckedClosedTrades = await checkClosedTradesForRugs(pairedTrades);
    const ruggedClosedTokens = [...new Set(rugCheckedClosedTrades.filter(t => t.is_rug_now).map(t => t.token_address))].length;
    console.log(`✅ Checked: ${ruggedClosedTokens} closed tokens are now rugged\n`);
    
    // Step 5: Track capital chronologically
    console.log('💸 Step 5: Tracking capital chronologically...');
    const capitalTracking = trackCapitalChronologically(rugCheckedClosedTrades, enrichedOpenPositions);
    console.log(`✅ Starting Capital: $${capitalTracking.starting_capital.toFixed(2)}`);
    console.log(`   Trading Performance ROI: ${capitalTracking.trading_performance_roi.toFixed(2)}%\n`);
    
    // Step 6: Aggregate to token level
    console.log('📊 Step 6: Aggregating to token level...');
    const tokens = aggregateToTokenLevel(rugCheckedClosedTrades, enrichedOpenPositions);
    console.log(`✅ Aggregated ${tokens.length} tokens\n`);
    
    // Step 7: Aggregate to overview level
    console.log('📈 Step 7: Aggregating to overview level...');
    const overview = aggregateToOverview(rugCheckedClosedTrades, enrichedOpenPositions, tokens, capitalTracking);
    console.log(`✅ Overview: ${overview.total_trades} trades, ${overview.win_rate.toFixed(2)}% win rate\n`);
    
    // Step 8: Display results
    console.log('================================================');
    console.log('FULL PIPELINE TEST RESULTS');
    console.log('================================================\n');
    
    console.log('📊 OVERVIEW:');
    console.log(`   Total Trades: ${overview.total_trades} (${overview.closed_trades} closed, ${overview.open_positions} open)`);
    console.log(`   Win Rate: ${overview.win_rate.toFixed(2)}% (${overview.winning_trades} wins / ${overview.losing_trades} losses)`);
    
    console.log('\n💰 CAPITAL (Simple Sums):');
    console.log(`   Total Buys: $${overview.simple_total_buys.toFixed(2)}`);
    console.log(`   Total Sells: $${overview.simple_total_sells.toFixed(2)}`);
    console.log(`   Gross Profit: $${overview.simple_gross_profit.toFixed(2)}`);
    
    console.log('\n📊 CAPITAL (Chronological):');
    console.log(`   Starting Capital: $${overview.chronological_starting_capital.toFixed(2)}`);
    console.log(`   Peak Deployed: $${overview.chronological_peak_deployed.toFixed(2)}`);
    console.log(`   Final Capital: $${overview.chronological_final_capital.toFixed(2)}`);
    console.log(`   Wallet Growth ROI: ${overview.chronological_wallet_growth_roi.toFixed(2)}%`);
    console.log(`   Trading Performance ROI: ${overview.chronological_trading_performance_roi.toFixed(2)}%`);
    
    console.log('\n📈 PNL:');
    console.log(`   Realized PnL: $${overview.total_realized_pnl.toFixed(2)}`);
    console.log(`   Confirmed Losses: -$${overview.total_confirmed_loss.toFixed(2)}`);
    console.log(`   Net PnL: $${overview.net_pnl.toFixed(2)}`);
    
    console.log('\n🚨 RISK:');
    console.log(`   Rugged Tokens: ${overview.rugged_tokens}`);
    console.log(`   Traded Rug Tokens: ${overview.traded_rug_tokens}`);
    console.log(`   Rugged Positions: ${overview.rugged_positions}/${overview.open_positions}`);
    
    console.log('\n✅ VERIFICATION:');
    console.log(`   Simple Gross = Net PnL? ${overview.verification.simple_gross_profit_matches_net_pnl ? '✅' : '❌'}`);
    console.log(`   Chronological = Net PnL? ${overview.verification.chronological_net_pnl_matches ? '✅' : '❌'}`);
    
    console.log('\n================================================');
    console.log('✅ FULL PIPELINE TEST COMPLETE');
    console.log('================================================');
    
    return { success: true, overview, tokens, capitalTracking };
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// Run the test
runFullPipeline()
  .then(result => {
    if (result.success) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
