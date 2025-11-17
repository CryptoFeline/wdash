// Quick test of advanced analytics endpoint
import fetch from 'node-fetch';

const API_KEY = 'test-api-key-12345';
const WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const CHAIN = '501';

console.log('🧪 Testing Advanced Analytics Endpoint...\n');
console.log(`Wallet: ${WALLET}`);
console.log(`Chain: ${CHAIN}\n`);

const url = `http://localhost:3001/api/advanced-analysis/${WALLET}/${CHAIN}`;

try {
  const response = await fetch(url, {
    headers: { 'x-api-key': API_KEY }
  });
  
  const json = await response.json();
  
  if (json.success) {
    console.log('✅ SUCCESS!\n');
    console.log('📊 OVERVIEW:');
    console.log(JSON.stringify(json.data.overview, null, 2));
  } else {
    console.log('❌ FAILED:');
    console.log(json);
  }
} catch (error) {
  console.error('❌ ERROR:', error.message);
}
