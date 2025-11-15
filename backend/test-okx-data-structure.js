/**
 * Test OKX API endpoints directly (Step 1)
 * This verifies the OKX API returns data before testing our backend
 * 
 * Run with: node test-okx-data-structure.js
 */

import axios from 'axios';

const OKX_BASE_URL = 'https://web3.okx.com';
const TEST_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const TEST_CHAIN_ID = '501'; // Solana

async function testOKXEndpoint(name, url, params) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${name}`);
  console.log(`URL: ${url}`);
  console.log(`Params:`, JSON.stringify(params, null, 2));
  console.log('-'.repeat(80));
  
  try {
    const startTime = Date.now();
    const response = await axios.get(url, {
      params,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept': 'application/json'
      },
      timeout: 15000
    });
    const duration = Date.now() - startTime;
    
    if (response.data?.code !== '0' && response.data?.code !== 0) {
      console.log('❌ FAILED - Bad response code');
      console.log(`Code: ${response.data?.code}`);
      console.log(`Message: ${response.data?.msg}`);
      return { success: false, error: `Bad code: ${response.data?.code}` };
    }
    
    console.log(`✅ SUCCESS (${duration}ms)`);
    console.log(`Status: ${response.status}`);
    console.log(`Code: ${response.data.code}`);
    
    const data = response.data.data;
    
    // Detailed data inspection
    console.log('\n--- OKX Response Data Structure ---');
    console.log(JSON.stringify(data, null, 2));
    
    console.log('\n--- Field Analysis ---');
    if (data) {
      if (data.tokenList) {
        console.log(`tokenList: Array with ${data.tokenList.length} items`);
        if (data.tokenList.length > 0) {
          console.log('First token:', JSON.stringify(data.tokenList[0], null, 2));
        }
      }
      
      // Check for important fields
      const importantFields = [
        'totalPnl', 'totalPnlRoi', 'winRate', 'totalVolumeBuy', 'totalVolumeSell',
        'totalTxsBuy', 'totalTxsSell', 'unrealizedPnl', 'avgCostBuy'
      ];
      
      importantFields.forEach(field => {
        if (data[field] !== undefined) {
          console.log(`  ${field}: ${data[field]}`);
        }
      });
    }
    
    return { success: true, duration, data: response.data };
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
  console.log('║' + ' OKX API DATA STRUCTURE TESTS'.padEnd(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\nTest Wallet:', TEST_WALLET);
  console.log('Chain ID:', TEST_CHAIN_ID);
  
  const results = {};
  
  // Test 1: Wallet Profile Summary
  results.summary = await testOKXEndpoint(
    'Wallet Profile Summary',
    `${OKX_BASE_URL}/priapi/v1/dx/market/v2/pnl/wallet-profile/summary`,
    {
      periodType: 3, // 7 days
      chainId: TEST_CHAIN_ID,
      walletAddress: TEST_WALLET,
      t: Date.now()
    }
  );
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Token List - All Trades
  results.tokenList = await testOKXEndpoint(
    'Token List - All Trades',
    `${OKX_BASE_URL}/priapi/v1/dx/market/v2/pnl/token-list`,
    {
      walletAddress: TEST_WALLET,
      chainId: TEST_CHAIN_ID,
      isAsc: false,
      sortType: 1,
      filterEmptyBalance: false,
      offset: 0,
      limit: 100,
      t: Date.now()
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
  
  if (passed === total) {
    console.log('✅ OKX API RETURNS DATA');
    console.log('\nNext: Test backend transformation of this data');
  } else {
    console.log('❌ OKX API ISSUES');
    console.log('\nOKX API is not returning data - backend cannot work');
  }
  
  console.log('='.repeat(80) + '\n');
}

// Run the tests
runTests().catch(console.error);
