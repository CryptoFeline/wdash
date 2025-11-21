// ============================================================
// RUG DETECTION & ENRICHMENT
// ============================================================
// Enriches open positions with current prices
// Detects rugged tokens via liquidity monitoring
// Flags closed trades that later became rugs
// ============================================================

import { fetchTokenOverview } from '../okx/fetchers.js';

// ============================================================
// ENRICH OPEN POSITIONS
// ============================================================

export async function enrichOpenPositions(openPositions, tokenList, chainId, enableRugDetection = true) {
  // Build price map from token list
  const tokenPrices = new Map();
  for (const token of tokenList) {
    const balance = parseFloat(token.balance || 0);
    const balanceUsd = parseFloat(token.balanceUsd || 0);
    // Calculate current price from balanceUsd / balance
    const currentPrice = balance > 0 ? balanceUsd / balance : 0;
    tokenPrices.set(token.tokenContractAddress, currentPrice);
  }
  
  // Add current prices and calculate unrealized PnL
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
  
  // Skip rug detection if disabled (for fast initial load)
  if (!enableRugDetection) {
    console.log('[Rug Detection] SKIPPED - will run in phase 2');
    for (const position of openPositions) {
      position.current_liquidity = 0;
      position.is_rug = false;
      position.rug_reason = [];
      position.unrealized_pnl_raw = position.unrealized_pnl;
      position.unrealized_pnl_real = position.unrealized_pnl;
      position.confirmed_loss = 0;
    }
    return openPositions;
  }
  
  // Rug detection via liquidity monitoring
  console.log(`[Rug Detection] Checking ${openPositions.length} open positions...`);
  for (const position of openPositions) {
    try {
      const overview = await fetchTokenOverview(position.token_address, chainId);
      
      if (!overview) {
        position.current_liquidity = 0;
        position.is_rug = false;
        position.rug_reason = [];
        continue;
      }
      
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
      
      // CORRECTED: Real loss = entry cost (capital deployed)
      position.unrealized_pnl_raw = position.unrealized_pnl;
      position.unrealized_pnl_real = isRugged ? -position.entry_value_usd : position.unrealized_pnl;
      position.confirmed_loss = isRugged ? position.entry_value_usd : 0;
      
      if (isRugged) {
        position.realized_roi = -100; // Treat as total loss
        position.is_realized_loss = true; // Include in win rate
      }
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      console.warn(`Failed to check rug status for ${position.token_symbol}:`, error.message);
      position.current_liquidity = 0;
      position.is_rug = false;
      position.rug_reason = [];
    }
  }
  
  return openPositions;
}

// ============================================================
// CHECK CLOSED TRADES FOR RUGS
// ============================================================

export async function checkClosedTradesForRugs(pairedTrades, chainId) {
  const uniqueTokens = [...new Set(pairedTrades.map(t => t.token_address))];
  const BATCH_SIZE = 5;
  
  console.log(`[Rug Detection] Checking ${uniqueTokens.length} unique tokens from closed trades...`);

  for (let i = 0; i < uniqueTokens.length; i += BATCH_SIZE) {
    const batch = uniqueTokens.slice(i, i + BATCH_SIZE);
    
    await Promise.all(batch.map(async (tokenAddress) => {
      try {
        const overview = await fetchTokenOverview(tokenAddress, chainId);
        
        if (!overview) return;
        
        const currentLiquidity = parseFloat(overview.marketInfo?.totalLiquidity || 0);
        const devRugCount = parseInt(overview.basicInfo?.devRugPullTokenCount || 0);
        
        const isRugNow = currentLiquidity < 100 || devRugCount > 0;
        
        // Mark all trades of this token
        for (const t of pairedTrades) {
          if (t.token_address === tokenAddress) {
            t.is_rug_now = isRugNow;
            t.rug_warning = isRugNow 
              ? `Token later became rug (liquidity: $${currentLiquidity.toFixed(2)})` 
              : null;
          }
        }
      } catch (error) {
        console.warn(`Failed to check rug status for ${tokenAddress}:`, error.message);
      }
    }));
    
    // Rate limiting between batches
    if (i + BATCH_SIZE < uniqueTokens.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
  
  return pairedTrades;
}
