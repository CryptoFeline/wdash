import { fetchTradeHistory, fetchTokenList } from './services/okx/fetchers.js';

const wallet = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const chain = '501';

(async () => {
  console.log('Fetching token list...');
  const tokenList = await fetchTokenList(wallet, chain);
  
  console.log(`\nTotal tokens in list: ${tokenList.length}`);
  console.log('\nFirst 5 tokens with prices:');
  tokenList.slice(0, 5).forEach(t => {
    console.log(`${t.tokenSymbol.padEnd(15)} | price: ${t.price || 'N/A'} | address: ${t.tokenContractAddress}`);
  });
  
  console.log('\nTokens with price > 0:');
  const withPrice = tokenList.filter(t => parseFloat(t.price || 0) > 0);
  console.log(`Count: ${withPrice.length}/${tokenList.length}`);
  
  if (withPrice.length > 0) {
    console.log('\nSample tokens with price:');
    withPrice.slice(0, 3).forEach(t => {
      console.log(`${t.tokenSymbol}: $${t.price}`);
    });
  }
})();
