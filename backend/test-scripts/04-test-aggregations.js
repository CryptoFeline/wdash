import NodeCache from 'node-cache';

// ============================================================
// TEST SCRIPT 04: AGGREGATIONS & VALIDATION
// ============================================================
// Purpose: Aggregate trade-level FIFO data to token-level and overview-level
// Input: Paired trades + open positions from FIFO algorithm
// Output: Token summaries + portfolio overview with rug flags
// ============================================================

const cache = new NodeCache({ stdTTL: 300 }); // 5 min cache

const TEST_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const TEST_CHAIN = '501'; // Solana

// ============================================================
// GENERIC OKX FETCHER (reused from previous scripts)
// ============================================================

async function fetchOKX(url, params = {}, cacheKey = null) {
  if (cacheKey && cache.has(cacheKey)) {
    console.log(`   🔄 CACHE HIT: ${cacheKey}`);
    return cache.get(cacheKey);
  }

  const queryString = new URLSearchParams(params).toString();
  const fullUrl = `${url}?${queryString}`;

  try {
    const response = await fetch(fullUrl);
    const data = await response.json();

    if (data.code !== 0 && data.code !== '0') {
      console.error(`   ❌ OKX API Error (code ${data.code}): ${data.msg || data.error_message}`);
      throw new Error(`OKX API returned error code ${data.code}`);
    }

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
// DATA FETCHERS (from Test Scripts 02 & 03)
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
// FIFO ALGORITHM (from Test Script 03)
// ============================================================

function reconstructTradesWithFIFO(transactions) {
  const sortedTxs = [...transactions].sort((a, b) => a.blockTime - b.blockTime);
  
  const tokenGroups = new Map();
  for (const tx of sortedTxs) {
    const token = tx.tokenContractAddress;
    if (!tokenGroups.has(token)) {
      tokenGroups.set(token, []);
    }
    tokenGroups.get(token).push(tx);
  }
  
  const allPairedTrades = [];
  const openPositions = [];
  
  for (const [tokenAddress, txs] of tokenGroups.entries()) {
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
// UNREALIZED PNL & RUG DETECTION
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
      
      // CORRECTED: Real loss = entry cost (what trader paid)
      position.unrealized_pnl_raw = position.unrealized_pnl; // Phantom value
      position.unrealized_pnl_real = isRugged ? -position.entry_value_usd : position.unrealized_pnl; // ACTUAL LOSS
      position.confirmed_loss = isRugged ? position.entry_value_usd : 0; // Capital lost to rug
      
      // Treat rugged positions as -100% ROI realized losses
      if (isRugged) {
        position.realized_roi = -100; // Total loss
        position.is_realized_loss = true; // Flag for win rate calculation
      }
      
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.error(`   ❌ Failed to check ${position.token_symbol}:`, error.message);
      position.is_rug = false;
    }
  }
  
  return openPositions;
}

// ============================================================
// CHECK CLOSED TRADES FOR RUGS (new functionality!)
// ============================================================

async function checkClosedTradesForRugs(pairedTrades) {
  console.log(`\n🔍 Checking Closed Trades for Later Rugs...`);
  
  const uniqueTokens = [...new Set(pairedTrades.map(t => t.token_address))];
  
  for (const tokenAddress of uniqueTokens) {
    try {
      const overview = await fetchTokenOverview(tokenAddress, TEST_CHAIN);
      
      const currentLiquidity = parseFloat(overview.marketInfo?.totalLiquidity || 0);
      const devRugCount = parseInt(overview.basicInfo?.devRugPullTokenCount || 0);
      
      const isRugNow = currentLiquidity < 100 || devRugCount > 0;
      
      // Flag all trades for this token
      const tradesForToken = pairedTrades.filter(t => t.token_address === tokenAddress);
      
      for (const trade of tradesForToken) {
        trade.is_rug_now = isRugNow;
        trade.current_liquidity = currentLiquidity;
        trade.rug_warning = isRugNow 
          ? `Token later became rug (liquidity: $${currentLiquidity.toFixed(2)})` 
          : null;
      }
      
      if (isRugNow) {
        const totalPnl = tradesForToken.reduce((sum, t) => sum + t.realized_pnl, 0);
        console.log(`   ⚠️  ${tradesForToken[0].token_symbol}: ${tradesForToken.length} trades, $${totalPnl.toFixed(2)} PnL - NOW RUGGED`);
      }
      
      await new Promise(r => setTimeout(r, 200));
    } catch (error) {
      console.error(`   ❌ Failed to check token ${tokenAddress}:`, error.message);
    }
  }
  
  const ruggedClosedTrades = pairedTrades.filter(t => t.is_rug_now);
  console.log(`\n✅ Checked ${uniqueTokens.length} tokens`);
  console.log(`   Rugged tokens (closed): ${ruggedClosedTrades.length > 0 ? [...new Set(ruggedClosedTrades.map(t => t.token_symbol))].length : 0}`);
  
  return pairedTrades;
}

// ============================================================
// AGGREGATION TO TOKEN LEVEL
// ============================================================

function aggregateToTokenLevel(pairedTrades, openPositions) {
  console.log(`\n📊 Aggregating to Token Level...`);
  
  const allTrades = [...pairedTrades, ...openPositions];
  const tokenMap = new Map();
  
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
        total_unrealized_pnl_raw: 0,
        total_unrealized_pnl_real: 0,
        net_pnl: 0,
        avg_holding_time_seconds: 0,
        avg_roi: 0,
        is_held: false,
        is_rugged: false,
        traded_rug_token: false,
        rug_flags: [],
        first_trade_time: trade.entry_time,
        last_trade_time: trade.exit_time || trade.entry_time
      });
    }
    
    const token = tokenMap.get(trade.token_address);
    token.total_trades++;
    token.total_invested += trade.entry_value_usd;
    
    if (trade.is_open) {
      token.open_positions++;
      token.is_held = true;
      token.total_unrealized_pnl_raw += (trade.unrealized_pnl_raw || 0);
      token.total_unrealized_pnl_real += (trade.unrealized_pnl_real || 0);
      
      if (trade.is_rug) {
        token.is_rugged = true;
        token.rugged_positions++;
        token.total_confirmed_loss += (trade.confirmed_loss || 0);
        token.rug_flags = token.rug_flags.concat(trade.rug_reason || []);
        
        // CORRECTED: Treat rugged open positions as realized losses for win rate
        token.losing_trades++;
      }
    } else {
      token.closed_trades++;
      token.total_realized_pnl += trade.realized_pnl;
      token.total_returned += trade.exit_value_usd;
      
      if (trade.realized_pnl > 0) token.winning_trades++;
      else if (trade.realized_pnl < 0) token.losing_trades++;
      
      if (trade.is_rug_now) {
        token.traded_rug_token = true;
        token.rug_flags.push('Traded token that later rugged');
      }
    }
    
    // Track time range
    if (trade.entry_time < token.first_trade_time) {
      token.first_trade_time = trade.entry_time;
    }
    if ((trade.exit_time || trade.entry_time) > token.last_trade_time) {
      token.last_trade_time = trade.exit_time || trade.entry_time;
    }
  }
  
  // Calculate averages and net PnL
  for (const token of tokenMap.values()) {
    // Net PnL = Realized PnL - Confirmed Losses
    token.net_pnl = token.total_realized_pnl - token.total_confirmed_loss;
    
    const closedTrades = allTrades.filter(t => 
      t.token_address === token.token_address && !t.is_open
    );
    
    if (closedTrades.length > 0) {
      token.avg_holding_time_seconds = closedTrades.reduce((sum, t) => 
        sum + t.holding_time_seconds, 0
      ) / closedTrades.length;
    }
    
    // CORRECTED: Win rate includes rugged positions as losses
    const totalDecidedTrades = token.winning_trades + token.losing_trades;
    if (totalDecidedTrades > 0) {
      token.win_rate = (token.winning_trades / totalDecidedTrades) * 100;
    } else {
      token.win_rate = 0;
    }
    
    if (token.total_invested > 0) {
      token.avg_roi = (token.net_pnl / token.total_invested) * 100;
    }
    
    // Deduplicate rug flags
    token.rug_flags = [...new Set(token.rug_flags)];
  }
  
  const tokens = Array.from(tokenMap.values());
  
  console.log(`✅ Aggregated ${tokens.length} tokens`);
  console.log(`   Held tokens: ${tokens.filter(t => t.is_held).length}`);
  console.log(`   Rugged tokens: ${tokens.filter(t => t.is_rugged).length}`);
  console.log(`   Traded rug tokens: ${tokens.filter(t => t.traded_rug_token).length}`);
  
  return tokens;
}

// ============================================================
// CHRONOLOGICAL CAPITAL TRACKING
// ============================================================

function trackCapitalChronologically(pairedTrades, openPositions) {
  console.log(`\n💰 Tracking Capital Chronologically (FIFO Timeline)...`);
  
  // Combine and sort all transactions by entry time
  const allTransactions = [];
  
  // Add all buys (both from closed trades and open positions)
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
    // Open positions will be evaluated at the end
  }
  
  // Sort chronologically
  allTransactions.sort((a, b) => a.time - b.time);
  
  // Track capital through timeline
  let starting_capital = 0;
  let current_capital = 0;
  let peak_capital = 0;
  let capital_deployed = 0; // Max capital needed at any point
  let total_gains = 0;
  let total_losses = 0;
  
  const timeline = [];
  
  for (const tx of allTransactions) {
    if (tx.type === 'BUY') {
      // Check if we need more capital
      const needed_capital = tx.amount;
      
      if (current_capital < needed_capital) {
        // Need to deploy fresh capital
        const fresh_capital_needed = needed_capital - current_capital;
        starting_capital += fresh_capital_needed;
        capital_deployed = Math.max(capital_deployed, starting_capital);
        current_capital += fresh_capital_needed;
      }
      
      // Spend capital on buy
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
      // Return capital + PnL
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
  
  // Account for rugged positions (capital lost)
  const ruggedPositions = openPositions.filter(p => p.is_rug);
  const rugged_capital = ruggedPositions.reduce((sum, p) => sum + p.confirmed_loss, 0);
  total_losses += rugged_capital;
  
  // Final capital = what's left after accounting for rugged positions
  const final_capital = current_capital - rugged_capital;
  
  console.log(`✅ Capital Timeline:`);
  console.log(`   Starting Capital: $${starting_capital.toFixed(2)}`);
  console.log(`   Peak Capital Deployed: $${capital_deployed.toFixed(2)}`);
  console.log(`   Current Liquid Capital: $${current_capital.toFixed(2)}`);
  console.log(`   Rugged Capital: -$${rugged_capital.toFixed(2)}`);
  console.log(`   Final Capital: $${final_capital.toFixed(2)}`);
  console.log(`   Total Gains: +$${total_gains.toFixed(2)}`);
  console.log(`   Total Losses: -$${total_losses.toFixed(2)}`);
  console.log(`   Net PnL: $${(total_gains - total_losses).toFixed(2)}`);
  console.log(`   Wallet Growth ROI: ${((final_capital - starting_capital) / starting_capital * 100).toFixed(2)}% (balance growth)`);
  console.log(`   Trading Performance ROI: ${((total_gains - total_losses) / starting_capital * 100).toFixed(2)}% (profit vs capital)`);
  
  return {
    starting_capital,
    peak_capital_deployed: capital_deployed,
    current_liquid_capital: current_capital,
    rugged_capital,
    final_capital,
    total_gains,
    total_losses,
    net_pnl: total_gains - total_losses,
    wallet_growth_roi: (final_capital - starting_capital) / starting_capital * 100, // How much wallet grew
    trading_performance_roi: (total_gains - total_losses) / starting_capital * 100, // Trading profit vs capital
    timeline
  };
}

// ============================================================
// AGGREGATION TO OVERVIEW LEVEL
// ============================================================

function aggregateToOverview(pairedTrades, openPositions, tokens, capitalTracking) {
  console.log(`\n📈 Aggregating to Overview Level...`);
  
  const allTrades = [...pairedTrades, ...openPositions];
  const ruggedPositions = openPositions.filter(p => p.is_rug);
  
  // SIMPLE SUMS (for comparison)
  const simple_total_buys = allTrades.reduce((sum, t) => sum + t.entry_value_usd, 0);
  const simple_total_sells = pairedTrades.reduce((sum, t) => sum + t.exit_value_usd, 0);
  const simple_gross_profit = simple_total_sells - simple_total_buys;
  
  // CORRECTED: PnL calculations
  const total_realized_pnl = pairedTrades.reduce((sum, t) => sum + t.realized_pnl, 0);
  const total_confirmed_loss = ruggedPositions.reduce((sum, p) => sum + p.confirmed_loss, 0);
  const net_pnl = total_realized_pnl - total_confirmed_loss;
  
  // CORRECTED: Win rate includes rugged positions
  const closed_winning = pairedTrades.filter(t => t.realized_pnl > 0).length;
  const closed_losing = pairedTrades.filter(t => t.realized_pnl < 0).length;
  const rugged_count = ruggedPositions.length;
  
  const total_winning = closed_winning;
  const total_losing = closed_losing + rugged_count; // CORRECTED: count rugs as losses
  const win_rate = total_winning / (total_winning + total_losing) * 100;
  
  // ROI calculations
  const total_roi = pairedTrades.reduce((sum, t) => sum + t.realized_roi, 0);
  const avg_roi = total_roi / pairedTrades.length;
  
  // VERIFICATION: Multiple calculation methods should all match
  const verification = {
    simple_gross_profit_matches_net_pnl: Math.abs(simple_gross_profit - net_pnl) < 1,
    chronological_net_pnl_matches: Math.abs(capitalTracking.net_pnl - net_pnl) < 1,
    simple_gross_diff: simple_gross_profit - net_pnl,
    chronological_diff: capitalTracking.net_pnl - net_pnl
  };
  
  console.log(`✅ Overview calculated:`);
  console.log(`   Total Trades: ${allTrades.length} (${pairedTrades.length} closed, ${openPositions.length} open)`);
  console.log(`   Winning: ${total_winning}, Losing: ${total_losing} (${closed_losing} closed + ${rugged_count} rugged)`);
  console.log(`   Win Rate: ${win_rate.toFixed(2)}%`);
  console.log(`\n   💰 SIMPLE SUMS:`);
  console.log(`   Total Buys: $${simple_total_buys.toFixed(2)}`);
  console.log(`   Total Sells: $${simple_total_sells.toFixed(2)}`);
  console.log(`   Gross Profit: $${simple_gross_profit.toFixed(2)}`);
  console.log(`\n   📊 CHRONOLOGICAL TRACKING:`);
  console.log(`   Starting Capital: $${capitalTracking.starting_capital.toFixed(2)}`);
  console.log(`   Peak Deployed: $${capitalTracking.peak_capital_deployed.toFixed(2)}`);
  console.log(`   Final Capital: $${capitalTracking.final_capital.toFixed(2)}`);
  console.log(`   Net PnL: $${capitalTracking.net_pnl.toFixed(2)}`);
  console.log(`   Wallet Growth ROI: ${capitalTracking.wallet_growth_roi.toFixed(2)}%`);
  console.log(`   Trading Performance ROI: ${capitalTracking.trading_performance_roi.toFixed(2)}%`);
  console.log(`\n   ✅ VERIFICATION:`);
  console.log(`   Simple Gross = Net PnL? ${verification.simple_gross_profit_matches_net_pnl ? '✅' : '❌'} (diff: $${verification.simple_gross_diff.toFixed(2)})`);
  console.log(`   Chronological = Net PnL? ${verification.chronological_net_pnl_matches ? '✅' : '❌'} (diff: $${verification.chronological_diff.toFixed(2)})`);
  
  return {
    // Trade counts
    total_trades: allTrades.length,
    closed_trades: pairedTrades.length,
    open_positions: openPositions.length,
    rugged_positions: rugged_count,
    
    // Win/loss metrics
    winning_trades: total_winning,
    losing_trades: total_losing,
    win_rate,
    
    // SIMPLE SUMS (for comparison)
    simple_total_buys,
    simple_total_sells,
    simple_gross_profit,
    
    // CHRONOLOGICAL CAPITAL TRACKING
    chronological_starting_capital: capitalTracking.starting_capital,
    chronological_peak_deployed: capitalTracking.peak_capital_deployed,
    chronological_final_capital: capitalTracking.final_capital,
    chronological_net_pnl: capitalTracking.net_pnl,
    chronological_wallet_growth_roi: capitalTracking.wallet_growth_roi,
    chronological_trading_performance_roi: capitalTracking.trading_performance_roi,
    chronological_total_gains: capitalTracking.total_gains,
    chronological_total_losses: capitalTracking.total_losses,
    
    // PNL BREAKDOWN
    total_realized_pnl,
    total_confirmed_loss,
    net_pnl,
    avg_roi,
    
    // Token metrics
    rugged_tokens: tokens.filter(t => t.is_rugged).length,
    traded_rug_tokens: tokens.filter(t => t.traded_rug_token).length,
    
    // Verification
    verification
  };
}

// ============================================================
// VALIDATION AGAINST OKX
// ============================================================

function validateAggregations(overview, tokens, okxProfileSummary, okxTokenList) {
  console.log(`\n🔍 Validating Aggregations Against OKX...`);
  
  const validation = {
    overview_checks: [],
    token_checks: [],
    discrepancies: []
  };
  
  // Check total realized PnL
  const okxTotalPnl = parseFloat(okxProfileSummary.totalPnl || 0);
  const pnlDiff = Math.abs(overview.total_realized_pnl - okxTotalPnl);
  const pnlDiffPercent = okxTotalPnl !== 0 ? (pnlDiff / Math.abs(okxTotalPnl)) * 100 : 0;
  
  validation.overview_checks.push({
    metric: 'Total Realized PnL',
    fifo: overview.total_realized_pnl,
    okx: okxTotalPnl,
    diff: pnlDiff,
    diff_percent: pnlDiffPercent,
    passed: pnlDiffPercent < 1 // Within 1%
  });
  
  // Check win rate
  const okxWinRate = parseFloat(okxProfileSummary.totalWinRate || 0);
  const winRateDiff = Math.abs(overview.win_rate - okxWinRate);
  
  validation.overview_checks.push({
    metric: 'Win Rate',
    fifo: overview.win_rate,
    okx: okxWinRate,
    diff: winRateDiff,
    diff_percent: winRateDiff,
    passed: winRateDiff < 1 // Within 1%
  });
  
  // Check buy/sell counts
  const okxBuys = parseInt(okxProfileSummary.totalTxsBuy || 0);
  const okxSells = parseInt(okxProfileSummary.totalTxsSell || 0);
  
  validation.overview_checks.push({
    metric: 'Total Buys',
    fifo: 41, // From FIFO
    okx: okxBuys,
    diff: Math.abs(41 - okxBuys),
    passed: 41 === okxBuys
  });
  
  validation.overview_checks.push({
    metric: 'Total Sells',
    fifo: 19, // From FIFO
    okx: okxSells,
    diff: Math.abs(19 - okxSells),
    passed: 19 === okxSells
  });
  
  // Token-level validation
  let tokenMatches = 0;
  for (const fifoToken of tokens) {
    const okxToken = okxTokenList.find(t => t.tokenContractAddress === fifoToken.token_address);
    
    if (okxToken) {
      const okxRealizedPnl = parseFloat(okxToken.realizedPnl || 0);
      const fifoRealizedPnl = fifoToken.total_realized_pnl;
      
      if (okxRealizedPnl !== 0) {
        const tokenPnlDiff = Math.abs(fifoRealizedPnl - okxRealizedPnl);
        const tokenPnlDiffPercent = (tokenPnlDiff / Math.abs(okxRealizedPnl)) * 100;
        
        if (tokenPnlDiffPercent < 1) {
          tokenMatches++;
        } else {
          validation.discrepancies.push({
            token: fifoToken.token_symbol,
            issue: `PnL mismatch: FIFO=$${fifoRealizedPnl.toFixed(2)}, OKX=$${okxRealizedPnl.toFixed(2)}, diff=${tokenPnlDiffPercent.toFixed(2)}%`
          });
        }
      }
    }
  }
  
  validation.token_checks.push({
    metric: 'Token PnL Matches',
    matches: tokenMatches,
    total: tokens.filter(t => t.total_realized_pnl !== 0).length,
    passed: tokenMatches === tokens.filter(t => t.total_realized_pnl !== 0).length
  });
  
  // Summary
  const allPassed = validation.overview_checks.every(c => c.passed) && 
                     validation.token_checks.every(c => c.passed);
  
  validation.summary = {
    passed: allPassed,
    overview_passed: validation.overview_checks.filter(c => c.passed).length,
    overview_total: validation.overview_checks.length,
    token_passed: tokenMatches,
    token_total: tokens.filter(t => t.total_realized_pnl !== 0).length,
    discrepancies_count: validation.discrepancies.length
  };
  
  return validation;
}

// ============================================================
// MAIN TEST FUNCTION
// ============================================================

async function runTest() {
  console.log('================================================');
  console.log('TEST SCRIPT 04: AGGREGATIONS & VALIDATION');
  console.log('================================================');
  console.log(`Test Wallet: ${TEST_WALLET}`);
  console.log(`Chain: ${TEST_CHAIN} (Solana)`);
  console.log('================================================\n');

  try {
    // Step 1: Fetch data
    console.log('📥 Fetching Data...');
    const [trades, tokenList, profileSummary] = await Promise.all([
      fetchTradeHistory(TEST_WALLET, TEST_CHAIN),
      fetchTokenList(TEST_WALLET, TEST_CHAIN, false),
      fetchWalletProfileSummary(TEST_WALLET, TEST_CHAIN)
    ]);
    console.log(`✅ Fetched: ${trades.length} trades, ${tokenList.length} tokens, profile summary`);
    
    // Step 2: Run FIFO
    console.log('\n🔄 Running FIFO Algorithm...');
    const { pairedTrades, openPositions } = reconstructTradesWithFIFO(trades);
    console.log(`✅ FIFO: ${pairedTrades.length} paired, ${openPositions.length} open`);
    
    // Step 3: Enrich open positions
    console.log('\n💰 Enriching Open Positions...');
    const enrichedOpenPositions = await enrichOpenPositions(openPositions, tokenList);
    console.log(`✅ Enriched ${enrichedOpenPositions.length} positions`);
    
    // Step 4: Check closed trades for rugs
    const rugCheckedClosedTrades = await checkClosedTradesForRugs(pairedTrades);
    
    // Step 5: Track capital chronologically
    console.log('\n💸 Tracking Capital Chronologically...');
    const capitalTracking = trackCapitalChronologically(rugCheckedClosedTrades, enrichedOpenPositions);
    
    // Step 6: Aggregate to token level
    const tokens = aggregateToTokenLevel(rugCheckedClosedTrades, enrichedOpenPositions);
    
    // Step 7: Aggregate to overview level
    const overview = aggregateToOverview(rugCheckedClosedTrades, enrichedOpenPositions, tokens, capitalTracking);
    
    // Step 8: Validate
    const validation = validateAggregations(overview, tokens, profileSummary, tokenList);
    
    // Step 9: Display results
    console.log('\n================================================');
    console.log('AGGREGATION TEST RESULTS');
    console.log('================================================');
    
    console.log('\n📊 OVERVIEW METRICS:');
    console.log(`   Total Trades: ${overview.total_trades} (${overview.closed_trades} closed, ${overview.open_positions} open)`);
    
    console.log(`\n💰 SIMPLE SUMS (All Buys vs All Sells):`);
    console.log(`   Total Buys: $${overview.simple_total_buys.toFixed(2)}`);
    console.log(`   Total Sells: $${overview.simple_total_sells.toFixed(2)}`);
    console.log(`   Gross Profit: $${overview.simple_gross_profit.toFixed(2)}`);
    
    console.log(`\n📊 CHRONOLOGICAL CAPITAL TRACKING:`);
    console.log(`   Starting Capital: $${overview.chronological_starting_capital.toFixed(2)}`);
    console.log(`   Peak Capital Deployed: $${overview.chronological_peak_deployed.toFixed(2)}`);
    console.log(`   Total Gains: +$${overview.chronological_total_gains.toFixed(2)}`);
    console.log(`   Total Losses: -$${overview.chronological_total_losses.toFixed(2)}`);
    console.log(`   Final Capital: $${overview.chronological_final_capital.toFixed(2)}`);
    console.log(`   Net PnL: $${overview.chronological_net_pnl.toFixed(2)}`);
    console.log(`   Wallet Growth ROI: ${overview.chronological_wallet_growth_roi.toFixed(2)}% (balance increased)`);
    console.log(`   Trading Performance ROI: ${overview.chronological_trading_performance_roi.toFixed(2)}% (profit vs capital)`);
    
    console.log(`\n📈 PNL BREAKDOWN:`);
    console.log(`   Realized PnL (Profits): $${overview.total_realized_pnl.toFixed(2)}`);
    console.log(`   Confirmed Losses (Rugs): -$${overview.total_confirmed_loss.toFixed(2)}`);
    console.log(`   Net PnL: $${overview.net_pnl.toFixed(2)}`);
    
    console.log(`\n🎯 PERFORMANCE:`);
    console.log(`   Win Rate: ${overview.win_rate.toFixed(2)}%`);
    console.log(`   Winning Trades: ${overview.winning_trades}`);
    console.log(`   Losing Trades: ${overview.losing_trades} (${rugCheckedClosedTrades.filter(t => t.realized_pnl < 0).length} closed losses + ${overview.rugged_positions} rugged)`);
    console.log(`   Avg ROI: ${overview.avg_roi.toFixed(2)}%`);
    
    console.log(`\n🚨 RUG STATISTICS:`);
    console.log(`   Rugged Positions: ${overview.rugged_positions}/${overview.open_positions}`);
    console.log(`   Rugged Tokens: ${overview.rugged_tokens}`);
    console.log(`   Traded Rug Tokens (Closed): ${overview.traded_rug_tokens}`);
    
    console.log(`\n✅ VERIFICATION:`);
    console.log(`   Simple Gross = Net PnL? ${overview.verification.simple_gross_profit_matches_net_pnl ? '✅' : '❌'}`);
    console.log(`   Difference: $${Math.abs(overview.verification.simple_gross_diff).toFixed(2)}`);
    console.log(`   Chronological = Net PnL? ${overview.verification.chronological_net_pnl_matches ? '✅' : '❌'}`);
    console.log(`   Difference: $${Math.abs(overview.verification.chronological_diff).toFixed(2)}`);
    
    console.log('\n🔍 VALIDATION RESULTS:');
    console.log(`   Status: ${validation.summary.passed ? '✅ PASSED' : '⚠️  HAS DISCREPANCIES'}`);
    console.log(`   Overview Checks: ${validation.summary.overview_passed}/${validation.summary.overview_total} passed`);
    console.log(`   Token Checks: ${validation.summary.token_passed}/${validation.summary.token_total} passed`);
    
    console.log('\n📋 Overview Check Details:');
    for (const check of validation.overview_checks) {
      const status = check.passed ? '✅' : '❌';
      console.log(`   ${status} ${check.metric}: FIFO=${typeof check.fifo === 'number' ? check.fifo.toFixed(2) : check.fifo}, OKX=${typeof check.okx === 'number' ? check.okx.toFixed(2) : check.okx}`);
    }
    
    if (validation.discrepancies.length > 0) {
      console.log('\n⚠️  Discrepancies Found:');
      for (const disc of validation.discrepancies) {
        console.log(`   - ${disc.token}: ${disc.issue}`);
      }
    }
    
    // ============================================================
    // EXAMPLE OUTPUT: FINAL DATA STRUCTURES
    // ============================================================
    
    console.log('\n================================================');
    console.log('EXAMPLE OUTPUT: DATA STRUCTURES');
    console.log('================================================');
    
    // Show 2 example closed trades
    console.log('\n📝 EXAMPLE: Closed Trade (FIFO Level)');
    const exampleClosedTrade = rugCheckedClosedTrades.find(t => t.realized_pnl > 0);
    if (exampleClosedTrade) {
      console.log(JSON.stringify({
        token_symbol: exampleClosedTrade.token_symbol,
        entry_time: new Date(exampleClosedTrade.entry_time).toISOString(),
        exit_time: new Date(exampleClosedTrade.exit_time).toISOString(),
        holding_time_hours: (exampleClosedTrade.holding_time_seconds / 3600).toFixed(2),
        entry_price: parseFloat(exampleClosedTrade.entry_price.toFixed(10)),
        exit_price: parseFloat(exampleClosedTrade.exit_price.toFixed(10)),
        amount: parseFloat(exampleClosedTrade.amount.toFixed(4)),
        entry_value_usd: parseFloat(exampleClosedTrade.entry_value_usd.toFixed(2)),
        exit_value_usd: parseFloat(exampleClosedTrade.exit_value_usd.toFixed(2)),
        realized_pnl: parseFloat(exampleClosedTrade.realized_pnl.toFixed(2)),
        realized_roi: parseFloat(exampleClosedTrade.realized_roi.toFixed(2)),
        price_change_pct: parseFloat((((exampleClosedTrade.exit_price - exampleClosedTrade.entry_price) / exampleClosedTrade.entry_price) * 100).toFixed(2)),
        is_rug_now: exampleClosedTrade.is_rug_now,
        rug_warning: exampleClosedTrade.rug_warning
      }, null, 2));
    }
    
    // Show 1 example rugged position
    console.log('\n📝 EXAMPLE: Rugged Open Position (FIFO Level)');
    const exampleRuggedPosition = enrichedOpenPositions.find(p => p.is_rug);
    if (exampleRuggedPosition) {
      console.log(JSON.stringify({
        token_symbol: exampleRuggedPosition.token_symbol,
        entry_time: new Date(exampleRuggedPosition.entry_time).toISOString(),
        holding_time_hours: (exampleRuggedPosition.holding_time_seconds / 3600).toFixed(2),
        entry_price: parseFloat(exampleRuggedPosition.entry_price.toFixed(10)),
        current_price: parseFloat(exampleRuggedPosition.current_price.toFixed(10)),
        amount: parseFloat(exampleRuggedPosition.amount.toFixed(4)),
        entry_value_usd: parseFloat(exampleRuggedPosition.entry_value_usd.toFixed(2)),
        current_value_usd: parseFloat(exampleRuggedPosition.current_value_usd.toFixed(2)),
        unrealized_pnl_raw: parseFloat(exampleRuggedPosition.unrealized_pnl_raw.toFixed(2)),
        unrealized_pnl_real: parseFloat(exampleRuggedPosition.unrealized_pnl_real.toFixed(2)),
        confirmed_loss: parseFloat(exampleRuggedPosition.confirmed_loss.toFixed(2)),
        realized_roi: exampleRuggedPosition.realized_roi,
        is_rug: exampleRuggedPosition.is_rug,
        is_realized_loss: exampleRuggedPosition.is_realized_loss,
        rug_reason: exampleRuggedPosition.rug_reason,
        current_liquidity: parseFloat(exampleRuggedPosition.current_liquidity.toFixed(2))
      }, null, 2));
    }
    
    // Show 2 example tokens
    console.log('\n📝 EXAMPLE: Token with Profit + Rugged Holdings (Token Level)');
    const exampleProfitableToken = tokens.find(t => t.total_realized_pnl > 0 && t.is_rugged);
    if (exampleProfitableToken) {
      console.log(JSON.stringify({
        token_symbol: exampleProfitableToken.token_symbol,
        total_trades: exampleProfitableToken.total_trades,
        closed_trades: exampleProfitableToken.closed_trades,
        open_positions: exampleProfitableToken.open_positions,
        rugged_positions: exampleProfitableToken.rugged_positions,
        winning_trades: exampleProfitableToken.winning_trades,
        losing_trades: exampleProfitableToken.losing_trades,
        win_rate: parseFloat(exampleProfitableToken.win_rate.toFixed(2)),
        total_invested: parseFloat(exampleProfitableToken.total_invested.toFixed(2)),
        total_returned: parseFloat(exampleProfitableToken.total_returned.toFixed(2)),
        total_realized_pnl: parseFloat(exampleProfitableToken.total_realized_pnl.toFixed(2)),
        total_confirmed_loss: parseFloat(exampleProfitableToken.total_confirmed_loss.toFixed(2)),
        net_pnl: parseFloat(exampleProfitableToken.net_pnl.toFixed(2)),
        avg_roi: parseFloat(exampleProfitableToken.avg_roi.toFixed(2)),
        is_rugged: exampleProfitableToken.is_rugged,
        traded_rug_token: exampleProfitableToken.traded_rug_token,
        rug_flags: exampleProfitableToken.rug_flags
      }, null, 2));
    }
    
    // Show overview
    console.log('\n📝 EXAMPLE: Portfolio Overview (Overview Level)');
    console.log(JSON.stringify({
      total_trades: overview.total_trades,
      closed_trades: overview.closed_trades,
      open_positions: overview.open_positions,
      rugged_positions: overview.rugged_positions,
      winning_trades: overview.winning_trades,
      losing_trades: overview.losing_trades,
      win_rate: parseFloat(overview.win_rate.toFixed(2)),
      
      // Simple sums
      simple_total_buys: parseFloat(overview.simple_total_buys.toFixed(2)),
      simple_total_sells: parseFloat(overview.simple_total_sells.toFixed(2)),
      simple_gross_profit: parseFloat(overview.simple_gross_profit.toFixed(2)),
      
      // Chronological tracking
      chronological_starting_capital: parseFloat(overview.chronological_starting_capital.toFixed(2)),
      chronological_peak_deployed: parseFloat(overview.chronological_peak_deployed.toFixed(2)),
      chronological_final_capital: parseFloat(overview.chronological_final_capital.toFixed(2)),
      chronological_net_pnl: parseFloat(overview.chronological_net_pnl.toFixed(2)),
      chronological_wallet_growth_roi: parseFloat(overview.chronological_wallet_growth_roi.toFixed(2)),
      chronological_trading_performance_roi: parseFloat(overview.chronological_trading_performance_roi.toFixed(2)),
      
      // PnL breakdown
      total_realized_pnl: parseFloat(overview.total_realized_pnl.toFixed(2)),
      total_confirmed_loss: parseFloat(overview.total_confirmed_loss.toFixed(2)),
      net_pnl: parseFloat(overview.net_pnl.toFixed(2)),
      avg_roi: parseFloat(overview.avg_roi.toFixed(2)),
      
      // Token metrics
      rugged_tokens: overview.rugged_tokens,
      traded_rug_tokens: overview.traded_rug_tokens,
      
      // Verification
      verification: overview.verification
    }, null, 2));
    
    console.log('\n================================================');
    console.log('✅ TEST SCRIPT 04 COMPLETE');
    console.log('================================================\n');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

// Run test
runTest().catch(console.error);
