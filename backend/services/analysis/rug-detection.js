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

export async function enrichOpenPositions(openPositions, tokenList, chainId) {
  // Build price map from token list
  const tokenPrices = new Map();
  for (const token of tokenList) {
    const currentPrice = parseFloat(token.price || 0);
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
  
  // Rug detection via liquidity monitoring
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
      // 404 errors likely mean token was delisted/rugged
      const is404 = error.message?.includes('404') || error.message?.includes('Not Found');
      
      position.current_liquidity = 0;
      position.is_rug = is404; // ✅ 404 = likely rugged/delisted
      position.rug_reason = is404 ? ['Token delisted from OKX (API 404)'] : [];
      
      // CORRECTED: Treat 404 as confirmed loss
      position.unrealized_pnl_raw = position.unrealized_pnl;
      position.unrealized_pnl_real = is404 ? -position.entry_value_usd : position.unrealized_pnl;
      position.confirmed_loss = is404 ? position.entry_value_usd : 0;
      
      if (is404) {
        position.realized_roi = -100; // Treat as total loss
        position.is_realized_loss = true; // Include in win rate
      }
      
      // Only log non-404 errors
      if (!is404) {
        console.warn(`Failed to check rug status for ${position.token_symbol}:`, error.message);
      }
    }
  }
  
  return openPositions;
}

// ============================================================
// CHECK CLOSED TRADES FOR RUGS
// ============================================================

export async function checkClosedTradesForRugs(pairedTrades, chainId) {
  const checkedTokens = new Set();
  
  for (const trade of pairedTrades) {
    if (checkedTokens.has(trade.token_address)) continue;
    
    try {
      const overview = await fetchTokenOverview(trade.token_address, chainId);
      
      if (!overview) continue;
      
      const currentLiquidity = parseFloat(overview.marketInfo?.totalLiquidity || 0);
      const devRugCount = parseInt(overview.basicInfo?.devRugPullTokenCount || 0);
      
      const isRugNow = currentLiquidity < 100 || devRugCount > 0;
      
      // Mark all trades of this token
      for (const t of pairedTrades) {
        if (t.token_address === trade.token_address) {
          t.is_rug_now = isRugNow;
          t.rug_warning = isRugNow 
            ? `Token later became rug (liquidity: $${currentLiquidity.toFixed(2)})` 
            : null;
        }
      }
      
      checkedTokens.add(trade.token_address);
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 100));
    } catch (error) {
      // 404 errors likely mean token was delisted/rugged
      const is404 = error.message?.includes('404') || error.message?.includes('Not Found');
      
      if (is404) {
        // Mark all trades of this token as rugged
        for (const t of pairedTrades) {
          if (t.token_address === trade.token_address) {
            t.is_rug_now = true;
            t.rug_warning = 'Token later became rug (delisted from OKX - API 404)';
          }
        }
      }
      
      checkedTokens.add(trade.token_address);
      
      // Only log non-404 errors
      if (!is404) {
        console.warn(`Failed to check rug status for ${trade.token_symbol}:`, error.message);
      }
    }
  }
  
  return pairedTrades;
}
