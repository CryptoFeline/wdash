import { fetchTokenList } from './services/okx/fetchers.js';

const wallet = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const chain = '501';

(async () => {
  console.log('Fetching token list...');
  const tokenList = await fetchTokenList(wallet, chain);
  
  console.log('\nFull first token object:');
  console.log(JSON.stringify(tokenList[0], null, 2));
  
  console.log('\nField keys available:');
  console.log(Object.keys(tokenList[0]).join(', '));
})();
