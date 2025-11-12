import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (public, only anon key)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('❌ Supabase credentials not configured. Check NEXT_PUBLIC_SUPABASE_* env vars');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

console.log('[Supabase] Frontend client initialized');

/**
 * Get wallets from Supabase with optional filtering
 */
export async function getWallets(chain = 'eth', limit = 50, offset = 0) {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('chain', chain)
      .order('last_synced', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Supabase] Get wallets failed:', error);
    return [];
  }
}

/**
 * Get a single wallet's data
 */
export async function getWallet(wallet_address: string, chain: string = 'eth') {
  try {
    const { data, error } = await supabase
      .from('wallets')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('chain', chain)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('[Supabase] Get wallet failed:', error);
    return null;
  }
}

/**
 * Check if wallet data is stale (last synced > 30 minutes ago)
 */
export function isStale(lastSynced: string | null, thresholdMinutes: number = 30): boolean {
  if (!lastSynced) return true;
  
  const lastSyncTime = new Date(lastSynced).getTime();
  const now = new Date().getTime();
  const diffMinutes = (now - lastSyncTime) / (1000 * 60);
  
  return diffMinutes > thresholdMinutes;
}

/**
 * Trigger backend sync for fresh data
 */
export async function triggerSync(chain: string = 'eth', timeframe: string = '7d', tag: string = 'all') {
  try {
    const response = await fetch('/api/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chain,
        timeframe,
        tag,
        limit: 200,
      }),
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      console.error('[Sync] Failed:', result.error);
      return { success: false, error: result.error };
    }
    
    console.log('[Sync] Complete:', result);
    return { success: true, synced: result.synced };
  } catch (error) {
    console.error('[Sync] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get wallet snapshots for historical trending
 */
export async function getWalletTrend(wallet_address: string, chain: string = 'eth', limit: number = 30) {
  try {
    const { data, error } = await supabase
      .from('wallet_snapshots')
      .select('*')
      .eq('wallet_address', wallet_address)
      .eq('chain', chain)
      .order('snapped_at', { ascending: false })
      .limit(limit);
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('[Supabase] Get trend failed:', error);
    return [];
  }
}

/**
 * Get top gainers by profit change over a period
 * Compares first and last snapshot in the period
 */
export async function getTopGainers(chain: string = 'eth', days: number = 7): Promise<Array<{
  wallet_address: string;
  profit_change: number;
  current_profit: number;
}>> {
  try {
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    // Get snapshots from the period
    const { data, error } = await supabase
      .from('wallet_snapshots')
      .select('wallet_address, snapped_at, metrics')
      .eq('chain', chain)
      .gte('snapped_at', since.toISOString())
      .order('wallet_address', { ascending: true })
      .order('snapped_at', { ascending: true });
    
    if (error) throw error;
    
    // Group by wallet and calculate profit change
    const walletTrends: {
      [key: string]: {
        start_profit: number;
        end_profit: number;
      };
    } = {};
    
    (data || []).forEach((row: any) => {
      const walletAddr = row.wallet_address;
      const profit = Number(row.metrics?.realized_profit_7d) || 0;
      
      if (!walletTrends[walletAddr]) {
        walletTrends[walletAddr] = {
          start_profit: profit,
          end_profit: profit,
        };
      } else {
        walletTrends[walletAddr].end_profit = profit;
      }
    });
    
    // Calculate gains and sort
    const gainers = Object.entries(walletTrends)
      .map(([wallet, trend]) => ({
        wallet_address: wallet,
        profit_change: trend.end_profit - trend.start_profit,
        current_profit: trend.end_profit,
      }))
      .sort((a, b) => b.profit_change - a.profit_change)
      .slice(0, 10); // Top 10
    
    return gainers;
  } catch (error) {
    console.error('[Supabase] Get top gainers failed:', error);
    return [];
  }
}

/**
 * Get average metrics trend for all wallets
 */
export async function getAverageMetricsTrend(chain: string = 'eth', daysBack: number = 7) {
  try {
    const { data, error } = await supabase
      .from('wallet_snapshots')
      .select('snapped_at, metrics')
      .eq('chain', chain)
      .gte('snapped_at', new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString())
      .order('snapped_at', { ascending: true });
    
    if (error) throw error;
    
    // Group by date and calculate averages
    const grouped: { [key: string]: { date: string; pnlValues: number[]; profitValues: number[]; winrateValues: number[] } } = {};
    (data || []).forEach((snapshot: any) => {
      const date = new Date(snapshot.snapped_at).toLocaleDateString();
      if (!grouped[date]) {
        grouped[date] = {
          date,
          pnlValues: [],
          profitValues: [],
          winrateValues: [],
        };
      }
      
      grouped[date].pnlValues.push(Number(snapshot.metrics?.pnl_7d) || 0);
      grouped[date].profitValues.push(Number(snapshot.metrics?.realized_profit_7d) || 0);
      grouped[date].winrateValues.push(Number(snapshot.metrics?.winrate_7d) || 0);
    });
    
    // Calculate averages
    return Object.values(grouped).map((g) => ({
      date: g.date,
      avg_pnl_7d: g.pnlValues.length > 0 ? g.pnlValues.reduce((a: number, b: number) => a + b) / g.pnlValues.length : 0,
      avg_profit_7d: g.profitValues.length > 0 ? g.profitValues.reduce((a: number, b: number) => a + b) / g.profitValues.length : 0,
      avg_winrate_7d: g.winrateValues.length > 0 ? g.winrateValues.reduce((a: number, b: number) => a + b) / g.winrateValues.length : 0,
    }));
  } catch (error) {
    console.error('[Supabase] Get average metrics trend failed:', error);
    return [];
  }
}

export default {
  supabase,
  getWallets,
  getWallet,
  isStale,
  triggerSync,
  getWalletTrend,
  getTopGainers,
  getAverageMetricsTrend,
};
