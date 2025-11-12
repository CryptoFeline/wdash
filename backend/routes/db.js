import express from 'express';

const router = express.Router();

/**
 * GET /api/wallets/db
 * 
 * Fetch wallets from Supabase (fast, no GMGN API call)
 * Used for initial page load to quickly hydrate frontend with all accumulated data
 * 
 * Query params:
 * - chain: Filter by chain (default: all)
 * - page: Page number (default: 1)
 * - limit: Results per page (default: 200)
 */
router.get('/', async (req, res) => {
  try {
    const chain = req.query.chain || null;
    const page = parseInt(req.query.page || '1', 10);
    const limit = parseInt(req.query.limit || '200', 10);

    console.log(`[DB] Fetching wallets from Supabase: chain=${chain}, page=${page}, limit=${limit}`);

    // Import Supabase client (lazy load)
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({
        error: 'Database not configured',
        message: 'Supabase credentials not set'
      });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all wallets from database (with chain filter if specified)
    let query = supabase
      .from('wallets')
      .select('*');

    if (chain && chain !== 'all') {
      query = query.eq('chain', chain);
    }

    const { data: allWallets, error } = await query;

    if (error) {
      console.error('[DB] Error fetching from Supabase:', error);
      throw error;
    }

    // Pagination
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedWallets = (allWallets || []).slice(start, end);
    const total = (allWallets || []).length;
    const totalPages = Math.ceil(total / limit);

    // Extract wallet data from stored JSON
    const processedWallets = paginatedWallets.map(record => ({
      ...record.data, // Spread the GMGN wallet data
      _stored_at: record.last_synced,
    }));

    console.log(`[DB] Returned ${processedWallets.length}/${total} wallets (page ${page}/${totalPages})`);

    res.json({
      data: processedWallets,
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
      source: 'supabase' // Indicate data came from DB, not fresh GMGN API
    });

  } catch (error) {
    console.error('[DB] Error:', error);
    res.status(500).json({
      error: 'Failed to fetch from database',
      message: error.message
    });
  }
});

export default router;
