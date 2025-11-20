import { fetchTradeHistory, fetchTokenList } from '../services/okx/fetchers.js';
import { reconstructTradesWithFIFO } from '../services/analysis/fifo.js';
import { enrichTradesWithCopyTradeAnalysis } from '../services/analysis/copy-trade.js';
import { enrichOpenPositions } from '../services/analysis/rug-detection.js';

const WALLET = '4gDfKJMbEye7pXAhCRKfQgbfFoVNiT4e41sWTphCZ1sb';
const CHAIN = '501'; // Solana

async function runTest() {
  console.log(`\n🧪 Testing Copy Trade Analysis for ${WALLET} on Solana...\n`);

  try {
    // 1. Fetch Data
    console.log('1. Fetching trade history and token list...');
    const [trades, tokenList] = await Promise.all([
      fetchTradeHistory(WALLET, CHAIN),
      fetchTokenList(WALLET, CHAIN)
    ]);
    console.log(`   Fetched ${trades.length} trades and ${tokenList.length} tokens.`);

    // 2. FIFO Reconstruction
    console.log('\n2. Reconstructing trades (FIFO)...');
    const { pairedTrades, openPositions } = reconstructTradesWithFIFO(trades);
    console.log(`   Reconstructed ${pairedTrades.length} closed trades and ${openPositions.length} open positions.`);

    // 3. Enrich Open Positions (Basic)
    console.log('\n3. Enriching open positions (Basic)...');
    const enrichedOpenPositions = await enrichOpenPositions(openPositions, tokenList, CHAIN, false);

    // 4. Copy Trade Analysis
    console.log('\n4. Running Copy Trade Analysis...');
    
    console.log('   Analyzing Closed Trades...');
    const enrichedClosedTrades = await enrichTradesWithCopyTradeAnalysis(pairedTrades, CHAIN, WALLET);
    
    console.log('   Analyzing Open Positions...');
    const enrichedOpenPositionsWithCopyTrade = await enrichTradesWithCopyTradeAnalysis(enrichedOpenPositions, CHAIN, WALLET);

    // 5. Display Results
    console.log('\n📊 RESULTS:\n');

    console.log('--- CLOSED TRADES (First 3) ---');
    enrichedClosedTrades.slice(0, 3).forEach((trade, i) => {
      const symbol = trade.tokenSymbol || trade.token_symbol;
      const addr = trade.tokenContractAddress || trade.token_address;
      console.log(`\n[Trade #${i + 1}] ${symbol} (${addr})`);
      console.log(`  Entry Price: $${trade.entry_price?.toFixed(8)}`);
      console.log(`  Exit Price:  $${trade.exit_price?.toFixed(8)}`);
      console.log(`  Realized PnL: $${trade.realized_pnl?.toFixed(2)} (${trade.realized_roi?.toFixed(2)}%)`);
      
      if (trade.copy_trade_analysis) {
        const cta = trade.copy_trade_analysis;
        console.log(`  📋 Copy Trade Analysis:`);
        if (cta.original_trade_debug) {
          console.log(`     CMC Entry:  $${cta.original_trade_debug.price?.toFixed(8)} (ts: ${cta.original_trade_debug.ts}, h: ${cta.original_trade_debug.h})`);
        }
        console.log(`     Copy Entry: $${cta.entry_price?.toFixed(8) || 'N/A'} (ts: ${cta.next_trade_debug?.ts}, h: ${cta.next_trade_debug?.h})`);
        console.log(`     Gain (1h/Max): ${cta.possible_gain_1h?.toFixed(2)}% / ${cta.possible_gain_full?.toFixed(2)}%`);
        console.log(`     Loss (1h/Max): ${cta.possible_loss_1h?.toFixed(2)}% / ${cta.possible_loss_full?.toFixed(2)}%`);
        console.log(`     Time to 25%: ${cta.time_to_25_percent ? (cta.time_to_25_percent/1000/60).toFixed(1) + 'm' : 'Never'}`);
        console.log(`     Time to 50%: ${cta.time_to_50_percent ? (cta.time_to_50_percent/1000/60).toFixed(1) + 'm' : 'Never'}`);
      } else {
        console.log(`  📋 Copy Trade Analysis: N/A`);
      }
    });

    console.log('\n--- OPEN POSITIONS (First 3) ---');
    enrichedOpenPositionsWithCopyTrade.slice(0, 3).forEach((pos, i) => {
      console.log(`\n[Position #${i + 1}] ${pos.token_symbol} (${pos.token_address})`);
      console.log(`  Entry Price: $${pos.entry_price?.toFixed(8)}`);
      console.log(`  Current Price: $${pos.current_price?.toFixed(8)}`);
      console.log(`  Unrealized PnL: $${pos.unrealized_pnl?.toFixed(2)} (${pos.unrealized_roi?.toFixed(2)}%)`);

      if (pos.copy_trade_analysis) {
        const cta = pos.copy_trade_analysis;
        console.log(`  📋 Copy Trade Analysis:`);
        if (cta.original_trade_debug) {
          console.log(`     CMC Entry:  $${cta.original_trade_debug.price?.toFixed(8)} (ts: ${cta.original_trade_debug.ts}, h: ${cta.original_trade_debug.h})`);
        }
        console.log(`     Copy Entry: $${cta.entry_price?.toFixed(8) || 'N/A'} (ts: ${cta.next_trade_debug?.ts}, h: ${cta.next_trade_debug?.h})`);
        console.log(`     Gain (1h/Max): ${cta.possible_gain_1h?.toFixed(2)}% / ${cta.possible_gain_full?.toFixed(2)}%`);
        console.log(`     Loss (1h/Max): ${cta.possible_loss_1h?.toFixed(2)}% / ${cta.possible_loss_full?.toFixed(2)}%`);
        console.log(`     Time to 25%: ${cta.time_to_25_percent ? (cta.time_to_25_percent/1000/60).toFixed(1) + 'm' : 'Never'}`);
        console.log(`     Time to 50%: ${cta.time_to_50_percent ? (cta.time_to_50_percent/1000/60).toFixed(1) + 'm' : 'Never'}`);
      } else {
        console.log(`  📋 Copy Trade Analysis: N/A`);
      }
    });

  } catch (error) {
    console.error('❌ Test Failed:', error);
  }
}

runTest();
