import express from 'express';
import { getCacheStats } from '../scraper/cache.js';
import { browserlessQueue } from '../scraper/queue.js';

const router = express.Router();

/**
 * GET /api/health
 * Health check endpoint
 */
router.get('/', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    cache: getCacheStats(),
    queue: browserlessQueue.status()
  });
});

/**
 * GET /api/chains
 * List available chains
 */
router.get('/chains', (req, res) => {
  res.json({
    chains: [
      { id: 'eth', name: 'Ethereum', symbol: 'ETH' },
      { id: 'sol', name: 'Solana', symbol: 'SOL' },
      { id: 'bsc', name: 'BNB Chain', symbol: 'BNB' },
      { id: 'arb', name: 'Arbitrum', symbol: 'ARB' },
      { id: 'base', name: 'Base', symbol: 'BASE' }
    ]
  });
});

/**
 * GET /api/tags
 * List available wallet tags
 */
router.get('/tags', (req, res) => {
  res.json({
    tags: [
      { id: 'all', name: 'All Wallets', description: 'All wallet types' },
      { id: 'smart_degen', name: 'Smart Money', description: 'Consistent winners with good track record' },
      { id: 'pump_smart', name: 'Early Pumpers', description: 'Early pump traders' },
      { id: 'renowned', name: 'Renowned', description: 'Well-known veteran wallets' },
      { id: 'snipe_bot', name: 'Sniper Bots', description: 'Bot-operated snipers' },
      { id: 'kol', name: 'KOL/VC', description: 'Key Opinion Leaders and VCs' },
      { id: 'fresh_wallet', name: 'Fresh Wallets', description: 'New wallets with strong performance' }
    ]
  });
});

export default router;
