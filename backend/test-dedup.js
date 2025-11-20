
import { fetchOKXLeaderboard, fetchCMCLeaderboard } from './scraper/leaderboard_fetchers.js';

async function testDeduplication() {
  console.log('Starting Deduplication Test...');
  console.log('Fetching OKX and CMC leaderboards...');

  try {
    const [okxWallets, cmcWallets] = await Promise.all([
      fetchOKXLeaderboard(),
      fetchCMCLeaderboard()
    ]);

    console.log(`\nFetched ${okxWallets.length} OKX wallets`);
    console.log(`Fetched ${cmcWallets.length} CMC wallets`);

    // Create Maps for easy lookup
    const okxMap = new Map(okxWallets.map(w => [w.address, w]));
    const cmcMap = new Map(cmcWallets.map(w => [w.address, w]));

    // Find Intersections
    const intersection = [];
    const okxOnly = [];
    const cmcOnly = [];

    okxWallets.forEach(w => {
      if (cmcMap.has(w.address)) {
        intersection.push({
          address: w.address,
          okx: w,
          cmc: cmcMap.get(w.address)
        });
      } else {
        okxOnly.push(w);
      }
    });

    cmcWallets.forEach(w => {
      if (!okxMap.has(w.address)) {
        cmcOnly.push(w);
      }
    });

    console.log('\n--- Results ---');
    console.log(`Total Unique Wallets: ${okxOnly.length + cmcOnly.length + intersection.length}`);
    console.log(`Overlapping Wallets: ${intersection.length}`);
    console.log(`OKX Only: ${okxOnly.length}`);
    console.log(`CMC Only: ${cmcOnly.length}`);

    if (intersection.length > 0) {
      console.log('\n--- Comparison of Overlapping Wallets ---');
      intersection.forEach((item, index) => {
        console.log(`\n[${index + 1}] Address: ${item.address}`);
        
        // Compare Rank
        console.log(`   Rank:     OKX=#${item.okx.rank} | CMC=#${item.cmc.rank}`);

        // Compare PnL
        const pnlDiff = Math.abs(item.okx.pnl_7d - item.cmc.pnl_7d);
        const pnlMatch = pnlDiff < 1; // Allow small float diff
        console.log(`   PnL (7d): OKX=${item.okx.pnl_7d.toFixed(2)} | CMC=${item.cmc.pnl_7d.toFixed(2)} [${pnlMatch ? 'MATCH' : 'DIFF'}]`);
        
        // Compare ROI
        console.log(`   ROI (7d): OKX=${item.okx.roi_7d} | CMC=${item.cmc.roi_7d}`);

        // Compare Winrate
        console.log(`   Winrate:  OKX=${item.okx.winrate_7d} | CMC=${item.cmc.winrate_7d}`);
      });
    } else {
      console.log('\nNo overlapping wallets found to compare.');
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testDeduplication();
