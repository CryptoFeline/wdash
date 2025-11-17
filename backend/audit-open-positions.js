const { fetchTradeHistory, fetchTokenList } = require('./services/okx/fetchers.js');
const { reconstructTradesWithFIFO } = require('./services/analysis/fifo.js');
const { enrichOpenPositions } = require('./services/analysis/rug-detection.js');

const wallet = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const chain = '501';

(async () => {
  const [trades, tokenList] = await Promise.all([
    fetchTradeHistory(wallet, chain),
    fetchTokenList(wallet, chain)
  ]);
  
  const { openPositions } = reconstructTradesWithFIFO(trades);
  const enriched = await enrichOpenPositions(openPositions, tokenList, chain);
  
  // Find a non-rugged position
  const nonRugged = enriched.find(p => !p.is_rug);
  if (nonRugged) {
    console.log('NON-RUGGED POSITION:');
    console.log(JSON.stringify(nonRugged, null, 2));
  } else {
    console.log('NO NON-RUGGED POSITIONS FOUND');
    console.log('First position:', JSON.stringify(enriched[0], null, 2));
  }
  
  // Check token list prices
  console.log('\nTOKEN LIST SAMPLE (first 3):');
  tokenList.slice(0, 3).forEach(t => {
    console.log(`${t.tokenSymbol}: price=${t.price}, address=${t.tokenContractAddress.slice(0, 8)}`);
  });
  
  // Check if any positions have current_price > 0
  const withPrice = enriched.filter(p => p.current_price > 0);
  console.log(`\nPositions with current_price > 0: ${withPrice.length}/${enriched.length}`);
})();
