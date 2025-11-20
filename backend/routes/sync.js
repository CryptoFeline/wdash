import express from 'express';
import { fetchGMGNData } from '../scraper/fetcher.js';
import { fetchOKXLeaderboard, fetchCMCLeaderboard } from '../scraper/leaderboard_fetchers.js';
import { 
  upsertWalletsBatch,
  createSnapshotsBatch,
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
    sources: walletData._sources || ['gmgn'], // Track data sources
  };
}

/**
 * POST /api/sync
 * 
 * Sync wallets from GMGN, OKX, and CMC APIs to Supabase
 * Called by frontend when "Refresh" is clicked
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
    const { chain = 'eth', timeframe = '7d', tag = 'all', limit = 200, sources } = req.body;
    
    // Default to all sources if not specified
    const targetSources = sources || ['gmgn', 'okx', 'cmc'];
    
    console.log(`[Sync] Starting sync: chain=${chain}, timeframe=${timeframe}, tag=${tag}, sources=${targetSources.join(',')}`);
    
    // Fetch from requested sources in parallel
    const promises = [];

    // 1. GMGN
    if (targetSources.includes('gmgn')) {
      promises.push(
        fetchGMGNData({ 
          chain, 
          timeframe, 
          tag: tag === 'all' ? null : tag, 
          limit 
        }).catch(e => {
          console.error('[Sync] GMGN Fetch Error:', e.message);
          return { data: { rank: [] } };
        })
      );
    } else {
      promises.push(Promise.resolve({ data: { rank: [] } }));
    }

    // 2. OKX
    if (targetSources.includes('okx')) {
      promises.push(
        fetchOKXLeaderboard().catch(e => {
          console.error('[Sync] OKX Fetch Error:', e.message);
          return [];
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }

    // 3. CMC
    if (targetSources.includes('cmc')) {
      promises.push(
        fetchCMCLeaderboard().catch(e => {
          console.error('[Sync] CMC Fetch Error:', e.message);
          return [];
        })
      );
    } else {
      promises.push(Promise.resolve([]));
    }
    
    const [gmgnResponse, okxWallets, cmcWallets] = await Promise.all(promises);
    
    const gmgnWallets = gmgnResponse.data?.rank || [];
    
    console.log(`[Sync] Got ${gmgnWallets.length} GMGN, ${okxWallets.length} OKX, ${cmcWallets.length} CMC wallets`);
    
    // Merge and Deduplicate
    const walletMap = new Map();
    
    // Helper to merge/add wallet
    const mergeWallet = (wallet, source) => {
      const address = wallet.address;
      if (!address) return;
      
      if (!walletMap.has(address)) {
        walletMap.set(address, { ...wallet, _sources: [source] });
      } else {
        const existing = walletMap.get(address);
        
        // Merge logic:
        // 1. Always track sources
        const sources = new Set(existing._sources || []);
        sources.add(source);
        
        // 2. If GMGN is the source, it overrides everything (richest data)
        if (source === 'gmgn') {
           walletMap.set(address, { 
             ...wallet, 
             _sources: Array.from(sources) 
           });
        } 
        // 3. If existing is NOT GMGN (e.g. OKX vs CMC), prefer the one with higher PnL? 
        // Or just keep the first one? 
        // Current logic: First come first served, but update stats if "newer"?
        // Since we fetch in parallel, order isn't guaranteed, but we process GMGN first below.
        else if (!existing._sources.includes('gmgn')) {
           // If neither is GMGN, we could merge fields.
           // For now, let's just update the source list and keep the first one found
           // to avoid thrashing values between OKX/CMC if they disagree slightly.
           existing._sources = Array.from(sources);
        } else {
           // Existing is GMGN, just update sources
           existing._sources = Array.from(sources);
        }
      }
    };
    
    // Process GMGN first (highest priority)
    gmgnWallets.forEach(w => mergeWallet(w, 'gmgn'));
    // Then OKX
    okxWallets.forEach(w => mergeWallet(w, 'okx'));
    // Then CMC
    cmcWallets.forEach(w => mergeWallet(w, 'cmc'));
    
    const wallets = Array.from(walletMap.values());
    console.log(`[Sync] Total unique wallets to sync: ${wallets.length}`);
    
    if (wallets.length === 0) {
      console.log('[Sync] No wallets returned from any source');
      return res.json({ 
        success: true, 
        synced: 0, 
        message: 'No wallets to sync' 
      });
    }

    // Fetch existing wallets from DB to preserve rich data if we are only doing a light sync (OKX/CMC)
    // This prevents overwriting a rich GMGN record with a sparse OKX record
    if (!targetSources.includes('gmgn')) {
       console.log('[Sync] Light sync detected. Fetching existing DB records to preserve data...');
       // We can't easily fetch all 200+ individually, but we can try to fetch by IDs if needed.
       // However, Supabase upsert replaces the whole JSON.
       // Strategy: If we are in light sync, we only want to update:
       // 1. New wallets (insert)
       // 2. Existing wallets (update PnL/Winrate but KEEP other fields)
       
       // Since we can't do a partial JSON update easily in one batch without reading first:
       // We will rely on the fact that if a user wants "rich" data, they click "Refresh" (which includes GMGN).
       // The auto-sync is just for the leaderboard.
       // BUT, if we overwrite, we lose the "rich" data until they click refresh.
       // Let's try to read the existing wallets for this batch.
       
       const addresses = wallets.map(w => w.address);
       const { createClient } = await import('@supabase/supabase-js');
       const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
       
       const { data: existingRows } = await supabase
         .from('wallets')
         .select('wallet_address, data')
         .in('wallet_address', addresses)
         .eq('chain', chain);
         
       if (existingRows && existingRows.length > 0) {
         const existingMap = new Map(existingRows.map(r => [r.wallet_address, r.data]));
         
         wallets.forEach(w => {
           const existingData = existingMap.get(w.address);
           if (existingData) {
             // If we have existing data, and the new source is NOT GMGN (which we know it isn't),
             // we should merge carefully.
             // We want to update PnL/Winrate from the new source (OKX/CMC) because it's "live",
             // but keep the rich fields (risk, token_num, etc) from the existing GMGN data.
             
             // Fields to update from new source
             const fieldsToUpdate = ['pnl_7d', 'winrate_7d', 'roi_7d', 'realized_profit_7d', 'txs_7d', 'volume_7d', 'updated_at'];
             
             fieldsToUpdate.forEach(field => {
               if (w[field] !== undefined && w[field] !== null) {
                 existingData[field] = w[field];
               }
             });
             
             // Update the wallet object in our list to be the merged version
             // This ensures we write back the rich data + new stats
             Object.assign(w, existingData);
           }
         });
         console.log(`[Sync] Merged ${existingRows.length} existing records with fresh stats.`);
       }
    }
    
    // Prepare batch operations
    const walletsToBatch = [];
    const snapshotsToBatch = [];
    let successCount = 0;
    const errors = [];
    
    // Prepare wallets and snapshots for batch operations
    for (const wallet of wallets) {
      try {
        const wallet_address = wallet.address;
        const metadata = extractMetadata(wallet);
        const fullData = wallet; // Store entire merged response
        
        // Prepare wallet for batch upsert
        walletsToBatch.push({
          wallet_address,
          chain,
          data: fullData,
          metadata,
        });
        
        // Prepare snapshot for batch insert
        snapshotsToBatch.push({
          wallet_address,
          chain,
          snapshot_data: fullData,
          metrics: metadata,
          snapped_at: new Date().toISOString(),
        });
        
        successCount++;
      } catch (error) {
        console.error(`[Sync] Failed to process wallet ${wallet.address}:`, error);
        errors.push({
          wallet: wallet.address,
          error: error.message,
        });
      }
    }
    
    // Batch upsert all wallets at once (much faster)
    if (walletsToBatch.length > 0) {
      try {
        console.log(`[Sync] Batch upserting ${walletsToBatch.length} wallets...`);
        await upsertWalletsBatch(walletsToBatch);
      } catch (error) {
        console.error('[Sync] Failed to batch upsert wallets:', error);
        // Don't fail the whole sync - continue to snapshots
      }
    }
    
    // Batch insert all snapshots at once (much faster)
    if (snapshotsToBatch.length > 0) {
      try {
        console.log(`[Sync] Batch inserting ${snapshotsToBatch.length} snapshots...`);
        await createSnapshotsBatch(snapshotsToBatch);
      } catch (error) {
        console.error('[Sync] Failed to batch insert snapshots:', error);
        // Don't fail the whole sync if snapshots fail - wallets were already saved
      }
    }
    
    console.log(`[Sync] Completed: ${successCount}/${wallets.length} wallets synced, ${snapshotsToBatch.length} snapshots created`);
    
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
