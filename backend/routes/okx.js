import express from 'express';

const router = express.Router();

// OKX API base URL
const OKX_API_URL = 'https://web3.okx.com/priapi/v1/dx/market/v2/pnl';

/**
 * GET /api/okx/wallet/:address
 * Fetch comprehensive wallet data from OKX API endpoints
 */
router.get('/wallet/:address', async (req, res) => {
  try {
    const { address } = req.params;
    const chainId = req.query.chainId || '501'; // Default to Solana
    const periodType = req.query.periodType || '3'; // Default to 7 days

    console.log(`[OKX] Fetching wallet data for ${address.substring(0, 8)}...`);

    // Fetch all 4 endpoints in parallel
    const [profileRes, holdingsRes, soldRes, transactionsRes] = await Promise.all([
      // Endpoint 1: Wallet Profile Summary
      fetch(`${OKX_API_URL}/wallet-profile/summary?periodType=${periodType}&chainId=${chainId}&walletAddress=${address}&t=${Date.now()}`),
      
      // Endpoint 4a: Token Holdings (current)
      fetch(`${OKX_API_URL}/token/list/holding?chainId=${chainId}&walletAddress=${address}&periodType=${periodType}&t=${Date.now()}`),
      
      // Endpoint 4b: Sold Tokens
      fetch(`${OKX_API_URL}/token/list/sold?chainId=${chainId}&walletAddress=${address}&periodType=${periodType}&t=${Date.now()}`),
      
      // Endpoint 6: Transaction History
      fetch(`${OKX_API_URL}/token/transaction-list?chainId=${chainId}&walletAddress=${address}&periodType=${periodType}&page=1&limit=50&t=${Date.now()}`)
    ]);

    // Check if all requests succeeded
    if (!profileRes.ok || !holdingsRes.ok || !soldRes.ok || !transactionsRes.ok) {
      const failedEndpoint = 
        !profileRes.ok ? 'profile' :
        !holdingsRes.ok ? 'holdings' :
        !soldRes.ok ? 'sold tokens' :
        'transactions';
      
      console.error(`[OKX] Failed to fetch ${failedEndpoint} for ${address.substring(0, 8)}...`);
      return res.status(502).json({
        error: 'Failed to fetch wallet data from OKX API',
        details: `Endpoint failed: ${failedEndpoint}`
      });
    }

    // Parse all responses
    const [profile, holdings, sold, transactions] = await Promise.all([
      profileRes.json(),
      holdingsRes.json(),
      soldRes.json(),
      transactionsRes.json()
    ]);

    // Combine all data into single response
    const walletData = {
      address,
      chainId,
      periodType,
      timestamp: Date.now(),
      
      // Summary data from endpoint 1
      summary: profile.data || {},
      
      // Holdings data from endpoint 4a
      holdings: holdings.data?.dataList || [],
      
      // Sold tokens from endpoint 4b
      sold: sold.data?.dataList || [],
      
      // Transaction history from endpoint 6
      transactions: transactions.data?.dataList || [],
      transactionsTotal: transactions.data?.total || 0,
    };

    console.log(`[OKX] Successfully fetched wallet data for ${address.substring(0, 8)}...`);
    res.json(walletData);

  } catch (error) {
    console.error('[OKX] Error fetching wallet data:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

export default router;
