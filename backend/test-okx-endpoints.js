/**
 * Test script to verify OKX API endpoints work correctly
 * 
 * Run with: node test-okx-endpoints.js
 */

import axios from 'axios';

const TEST_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const TEST_CHAIN_ID = '501'; // Solana

const OKX_BASE_URL = 'https://web3.okx.com'; // Use same base URL as okx.js

async function testEndpoint(name, url, params) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${name}`);
  console.log(`URL: ${url}`);
  console.log(`Params:`, params);
  console.log('-'.repeat(80));
  
  try {
    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 10000
    });
    
    if (response.data?.code === '0' || response.data?.code === 0) {
      console.log('✅ SUCCESS');
      console.log(`Status: ${response.status}`);
      console.log(`Code: ${response.data.code}`);
      console.log(`Message: ${response.data.msg || 'OK'}`);
      
      // Show summary of data returned
      const data = response.data.data;
      if (data) {
        if (Array.isArray(data)) {
          console.log(`Data: Array with ${data.length} items`);
          if (data.length > 0) {
            console.log('First item keys:', Object.keys(data[0]).join(', '));
          }
        } else if (typeof data === 'object') {
          console.log('Data keys:', Object.keys(data).join(', '));
          
          // Show specific useful fields
          if (data.totalPnl !== undefined) {
            console.log(`  - totalPnl: ${data.totalPnl}`);
          }
          if (data.winRate !== undefined) {
            console.log(`  - winRate: ${data.winRate}`);
          }
          if (data.tokenList) {
            console.log(`  - tokenList: ${data.tokenList.length} tokens`);
          }
        }
      }
      
      return { success: true, data: response.data };
    } else {
      console.log('❌ FAILED - Bad response code');
      console.log(`Code: ${response.data?.code}`);
      console.log(`Message: ${response.data?.msg}`);
      return { success: false, error: `Bad code: ${response.data?.code}` };
    }
  } catch (error) {
    console.log('❌ ERROR');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Message: ${error.response.statusText}`);
      console.log(`Data:`, JSON.stringify(error.response.data, null, 2));
    } else {
      console.log(`Error: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' OKX API ENDPOINT TESTS'.padEnd(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  
  const results = {};
  
  // Test 1: Wallet Profile Summary (CORRECT - used by okx.js)
  results.summary = await testEndpoint(
    'Wallet Profile Summary',
    `${OKX_BASE_URL}/priapi/v1/dx/market/v2/pnl/wallet-profile/summary`,
    {
      periodType: 3, // 7 days
      chainId: TEST_CHAIN_ID,
      walletAddress: TEST_WALLET,
      t: Date.now()
    }
  );
  
  // Test 2: Token List - All Trades (CORRECT - used by okx.js)
  results.tokenListAllTrades = await testEndpoint(
    'Token List - All Trades (filterEmptyBalance=false)',
    `${OKX_BASE_URL}/priapi/v1/dx/market/v2/pnl/token-list`,
    {
      walletAddress: TEST_WALLET,
      chainId: TEST_CHAIN_ID,
      isAsc: false,
      sortType: 1, // Sort by PnL
      filterEmptyBalance: false, // All tokens including sold
      offset: 0,
      limit: 100,
      t: Date.now()
    }
  );
  
  // Test 3: Token List - Holdings (CORRECT - used by okx.js)
  results.tokenListHoldings = await testEndpoint(
    'Token List - Current Holdings (filterEmptyBalance=true)',
    `${OKX_BASE_URL}/priapi/v1/dx/market/v2/pnl/token-list`,
    {
      walletAddress: TEST_WALLET,
      chainId: TEST_CHAIN_ID,
      isAsc: false,
      sortType: 1,
      filterEmptyBalance: true, // Only current holdings
      offset: 0,
      limit: 100,
      t: Date.now()
    }
  );
  
  // Test 4: Wallet Transactions (WRONG - 404 error)
  results.walletTransactions = await testEndpoint(
    'Wallet Transactions (OLD/WRONG endpoint)',
    'https://www.okx.com/priapi/v1/invest/activity/smart-money/wallet-transactions',
    {
      chainId: TEST_CHAIN_ID,
      walletAddress: TEST_WALLET,
      limit: 100
    }
  );
  
  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const passed = Object.entries(results).filter(([_, r]) => r.success).length;
  const total = Object.keys(results).length;
  
  console.log(`\nTotal: ${passed}/${total} endpoints working\n`);
  
  Object.entries(results).forEach(([name, result]) => {
    const status = result.success ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${name}`);
  });
  
  console.log('\n' + '='.repeat(80));
  console.log('CONCLUSION');
  console.log('='.repeat(80));
  console.log('\nThe analysis.js routes should use:');
  console.log('  ✅ /priapi/v1/dx/market/v2/pnl/wallet-profile/summary');
  console.log('     (with periodType, walletAddress, chainId, t params)');
  console.log('  ✅ /priapi/v1/dx/market/v2/pnl/token-list');
  console.log('     (with walletAddress, chainId, sortType, filterEmptyBalance, t params)');
  console.log('\nNOT:');
  console.log('  ❌ /priapi/v1/invest/activity/smart-money/wallet-transactions (404)');
  console.log('\n' + '='.repeat(80) + '\n');
}

// Run the tests
runTests().catch(console.error);
