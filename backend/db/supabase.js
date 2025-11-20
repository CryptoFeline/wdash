import { createClient } from '@supabase/supabase-js';

// Lazy initialization - only initialize when first function is called
let supabase = null;

function initSupabase() {
  if (supabase) return supabase;
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('❌ Supabase credentials not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey);
  console.log(`[Supabase] Connected to ${supabaseUrl}`);
  
  return supabase;
}

/**
 * Upsert wallet with full JSON data and extracted metadata
 */
export async function upsertWallet(walletData) {
  const supabaseClient = initSupabase();
  const { wallet_address, chain = 'eth', data, metadata = {} } = walletData;
  
  if (!wallet_address || !data) {
    throw new Error('wallet_address and data are required');
  }
  
  try {
    const { error } = await supabaseClient
      .from('wallets')
      .upsert(
        {
          wallet_address,
          chain,
          data, // Full JSON response
          metadata, // Extracted metrics for indexed queries
          last_synced: new Date().toISOString(),
        },
        {
          onConflict: 'wallet_address,chain',
        }
      );
    
    if (error) throw error;
    
    console.log(`[Supabase] Upserted wallet: ${wallet_address} (${chain})`);
  } catch (error) {
    console.error('[Supabase] Upsert failed:', error);
    throw error;
  }
}

/**
 * Batch upsert wallets (much faster than individual inserts)
 */
export async function upsertWalletsBatch(wallets) {
  const supabaseClient = initSupabase();
  try {
    if (wallets.length === 0) return { success: true, count: 0 };
    
    const now = new Date().toISOString();
    const formattedWallets = wallets.map(w => ({
      wallet_address: w.wallet_address,
      chain: w.chain || 'eth',
      data: w.data,
      metadata: w.metadata || {},
      last_synced: now,
    }));
    
    // Use upsert with ignoreDuplicates: false (default) to update existing rows
    const { error } = await supabaseClient
      .from('wallets')
      .upsert(formattedWallets, {
        onConflict: 'wallet_address,chain',
      });
    
    if (error) throw error;
    
    console.log(`[Supabase] Upserted ${wallets.length} wallets in batch`);
    return { success: true, count: wallets.length };
  } catch (error) {
    console.error('[Supabase] Batch upsert failed:', error);
    throw error;
  }
}
export async function getWallets(chain = 'eth', limit = 50, offset = 0) {
  const supabaseClient = initSupabase();
  try {
    const { data, error } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('chain', chain)
      .order('last_synced', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('[Supabase] Get wallets failed:', error);
    throw error;
  }
}

/**
 * Get a single wallet by address and chain
 */
export async function getWallet(wallet_address, chain = 'eth') {
  const supabaseClient = initSupabase();
  try {
    const { data, error } = await supabaseClient
      .from('wallets')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('chain', chain)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
    
    return data || null;
  } catch (error) {
    console.error('[Supabase] Get wallet failed:', error);
    throw error;
  }
}

/**
 * Create a snapshot of wallet state (for historical tracking)
 */
export async function createSnapshot(wallet_address, chain = 'eth', snapshotData, metrics = {}) {
  const supabaseClient = initSupabase();
  try {
    const { error } = await supabaseClient
      .from('wallet_snapshots')
      .insert({
        wallet_address,
        chain,
        snapshot_data: snapshotData,
        metrics,
        snapped_at: new Date().toISOString(),
      });
    
    if (error) throw error;
    
    console.log(`[Supabase] Created snapshot for ${wallet_address}`);
  } catch (error) {
    console.error('[Supabase] Create snapshot failed:', error);
    throw error;
  }
}

/**
 * Batch create snapshots (much faster than individual inserts)
 */
export async function createSnapshotsBatch(snapshots) {
  const supabaseClient = initSupabase();
  try {
    if (snapshots.length === 0) return { success: true, count: 0 };
    
    const { error } = await supabaseClient
      .from('wallet_snapshots')
      .insert(snapshots);
    
    if (error) throw error;
    
    console.log(`[Supabase] Created ${snapshots.length} snapshots in batch`);
    return { success: true, count: snapshots.length };
  } catch (error) {
    console.error('[Supabase] Batch snapshot creation failed:', error);
    throw error;
  }
}

/**
 * Get snapshots for a wallet (for trending)
 */
export async function getSnapshots(wallet_address, chain = 'eth', limit = 30) {
  const supabaseClient = initSupabase();
  try {
    const { data, error } = await supabaseClient
      .from('wallet_snapshots')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('chain', chain)
      .order('snapped_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('[Supabase] Get snapshots failed:', error);
    throw error;
  }
}

/**
 * Update wallet flag status
 */
export async function updateWalletFlag(wallet_address, chain, is_flagged) {
  const supabaseClient = initSupabase();
  try {
    const { error } = await supabaseClient
      .from('wallets')
      .update({ is_flagged })
      .eq('wallet_address', wallet_address)
      .eq('chain', chain);
    
    if (error) throw error;
    console.log(`[Supabase] Updated flag for ${wallet_address}: ${is_flagged}`);
    return { success: true };
  } catch (error) {
    console.error('[Supabase] Update flag failed:', error);
    throw error;
  }
}

export default {
  upsertWallet,
  upsertWalletsBatch,
  getWallets,
  getWallet,
  createSnapshot,
  createSnapshotsBatch,
  getSnapshots,
  updateWalletFlag,
};
