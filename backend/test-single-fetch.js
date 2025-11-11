#!/usr/bin/env node

/**
 * Test Single GMGN.ai Fetch
 * 
 * Tests fetching wallet data from GMGN.ai via Browserless without running prefetch.
 * Useful for testing rate limits and response format.
 */

import dotenv from 'dotenv';
dotenv.config();

import { fetchGMGNData, filterQualityWallets, rankWallets } from './scraper/fetcher.js';

console.log('\n🧪 Testing Single GMGN.ai Fetch via Browserless...\n');

const config = {
  chain: 'sol',
  timeframe: '7d',
  tag: 'smart_degen',
  limit: 50
};

console.log('Config:', config);
console.log('─'.repeat(60));

const startTime = Date.now();

fetchGMGNData(config)
  .then(data => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n✅ SUCCESS!');
    console.log('─'.repeat(60));
    console.log('Duration:', duration, 'seconds');
    console.log('Wallets fetched:', data.data?.rank?.length || 0);
    
    if (data.data?.rank?.length > 0) {
      const filtered = filterQualityWallets(data.data.rank);
      const ranked = rankWallets(filtered);
      
      console.log('After filtering:', filtered.length);
      console.log('\nTop 5 wallets:');
      ranked.slice(0, 5).forEach((w, i) => {
        console.log(`  ${i + 1}. ${w.wallet_address.substring(0, 8)}... - PnL: ${(w.pnl_7d * 100).toFixed(1)}%, Score: ${w.score.toFixed(3)}`);
      });
    }
    
    console.log('\n🎉 Test complete!\n');
    process.exit(0);
  })
  .catch(error => {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n❌ FAILED!');
    console.log('─'.repeat(60));
    console.log('Duration:', duration, 'seconds');
    console.log('Error:', error.message);
    
    if (error.message.includes('429') || error.message.includes('rate limit')) {
      console.log('\n💡 Rate Limit Hit:');
      console.log('   Browserless free tier: 1 concurrent browser');
      console.log('   Wait 30 seconds between requests');
      console.log('   Or upgrade to Prototyping plan ($25/mo, 3 concurrent)');
    }
    
    console.log('');
    process.exit(1);
  });
