import express from 'express';
import { fetchGMGNData } from '../scraper/fetcher.js';
import { 
  upsertWallet, 
  createSnapshot, 
  getWallet 
} from '../db/supabase.js';

const router = express.Router();

/**
 * Extract metadata from GMGN wallet response
 */
function extractMetadata(walletData) {
  if (!walletData) return {};
  
  return {
    pnl_7d: walletData.pnl_7d || 0,
    pnl_30d: walletData.pnl_30d || 0,
    realized_profit_7d: walletData.realized_profit_7d || 0,
    realized_profit_30d: walletData.realized_profit_30d || 0,
    winrate_7d: walletData.winrate_7d || 0,
    token_num_7d: walletData.token_num_7d || 0,
    buy_30d: walletData.buy_30d || 0,
    sell_30d: walletData.sell_30d || 0,
    tags: walletData.tags || [],
    risk: walletData.risk || {},
  };
}

/**
 * POST /api/sync
 * 
 * Sync wallets from GMGN API to Supabase
 * Called by frontend when data is stale (> 30 minutes old)
 * 
 * Body:
 * {
 *   "chain": "eth",
 *   "timeframe": "7d",
 *   "tag": "all",
 *   "limit": 200
 * }
 */
router.post('/', async (req, res) => {
  try {
    const { chain = 'eth', timeframe = '7d', tag = 'all', limit = 200 } = req.body;
    
    console.log(`[Sync] Starting sync: chain=${chain}, timeframe=${timeframe}, tag=${tag}`);
    
    // Fetch from GMGN API
    const response = await fetchGMGNData({ 
      chain, 
      timeframe, 
      tag: tag === 'all' ? null : tag, 
      limit 
    });
    
    const wallets = response.data?.rank || [];
    
    if (wallets.length === 0) {
      console.log('[Sync] No wallets returned from GMGN API');
      return res.json({ 
        success: true, 
        synced: 0, 
        message: 'No wallets to sync' 
      });
    }
    
    // Upsert each wallet to Supabase
    let successCount = 0;
    const errors = [];
    
    for (const wallet of wallets) {
      try {
        const wallet_address = wallet.address;
        const metadata = extractMetadata(wallet);
        const fullData = wallet; // Store entire GMGN response
        
        // Upsert to wallets table
        await upsertWallet({
          wallet_address,
          chain,
          data: fullData,
          metadata,
        });
        
        // Create snapshot for historical tracking
        await createSnapshot(wallet_address, chain, fullData, metadata);
        
        successCount++;
      } catch (error) {
        console.error(`[Sync] Failed to sync wallet ${wallet.address}:`, error);
        errors.push({
          wallet: wallet.address,
          error: error.message,
        });
      }
    }
    
    console.log(`[Sync] Completed: ${successCount}/${wallets.length} wallets synced`);
    
    res.json({
      success: true,
      synced: successCount,
      failed: errors.length,
      errors: errors.length > 0 ? errors.slice(0, 5) : undefined, // Return first 5 errors
      message: `Synced ${successCount} wallets to Supabase`,
    });
  } catch (error) {
    console.error('[Sync] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
