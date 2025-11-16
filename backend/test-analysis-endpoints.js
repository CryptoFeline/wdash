/**
 * Test script for analysis endpoints
 * Tests all three endpoints: summary, trades, metrics
 * 
 * PREREQUISITE: Backend server must be running on port 3001
 * 
 * Run with: node test-analysis-endpoints.js
 */

import axios from 'axios';

const BACKEND_URL = 'http://localhost:3001/api';
const TEST_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const TEST_CHAIN = 'sol';

async function testEndpoint(name, url) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${name}`);
  console.log(`URL: ${url}`);
  console.log('-'.repeat(80));
  
  try {
    const startTime = Date.now();
    const response = await axios.get(url, { timeout: 30000 });
    const duration = Date.now() - startTime;
    
    console.log(`✅ SUCCESS (${duration}ms)`);
    console.log(`Status: ${response.status}`);
    
    const data = response.data;
    
    if (Array.isArray(data)) {
      console.log(`Response: Array with ${data.length} items`);
      if (data.length > 0) {
        console.log('First item keys:', Object.keys(data[0]).slice(0, 10).join(', '));
        if (Object.keys(data[0]).length > 10) {
          console.log(`  ... and ${Object.keys(data[0]).length - 10} more`);
        }
      }
    } else if (typeof data === 'object') {
      const keys = Object.keys(data);
      console.log(`Response: Object with ${keys.length} keys`);
      console.log('Keys:', keys.slice(0, 15).join(', '));
      if (keys.length > 15) {
        console.log(`  ... and ${keys.length - 15} more`);
      }
      
      // Show specific interesting values
      const interestingKeys = [
        'total_pnl', 'total_roi_percent', 'win_rate',
        'avg_pnl_per_trade', 'sharpe_ratio', 'sortino_ratio',
        'total_trades', 'closed_trades', 'wallet_address'
      ];
      
      interestingKeys.forEach(key => {
        if (data[key] !== undefined) {
          console.log(`  - ${key}: ${data[key]}`);
        }
      });
    }
    
    return { success: true, duration, data };
  } catch (error) {
    console.log('❌ FAILED');
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Message: ${error.response.statusText}`);
      console.log(`Data:`, JSON.stringify(error.response.data, null, 2));
    } else if (error.code === 'ECONNREFUSED') {
      console.log('ERROR: Cannot connect to backend server');
      console.log('Make sure the backend is running on port 3001');
      console.log('Run: cd backend && npm start');
    } else {
      console.log(`Error: ${error.message}`);
    }
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n');
  console.log('╔' + '═'.repeat(78) + '╗');
  console.log('║' + ' ANALYSIS API ENDPOINT TESTS'.padEnd(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\nTest Wallet:', TEST_WALLET);
  console.log('Test Chain:', TEST_CHAIN);
  console.log('\nNOTE: Backend must be running on port 3001');
  
  const results = {};
  
  // Test 1: Summary endpoint
  results.summary = await testEndpoint(
    'GET /api/analysis/summary/:walletAddress',
    `${BACKEND_URL}/analysis/summary/${TEST_WALLET}?chain=${TEST_CHAIN}`
  );
  
  // Test 2: Trades endpoint
  results.trades = await testEndpoint(
    'GET /api/analysis/trades/:walletAddress',
    `${BACKEND_URL}/analysis/trades/${TEST_WALLET}?chain=${TEST_CHAIN}`
  );
  
  // Test 3: Metrics endpoint
  results.metrics = await testEndpoint(
    'GET /api/analysis/metrics/:walletAddress',
    `${BACKEND_URL}/analysis/metrics/${TEST_WALLET}?chain=${TEST_CHAIN}`
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
    const duration = result.duration ? ` (${result.duration}ms)` : '';
    console.log(`${status} - ${name}${duration}`);
  });
  
  console.log('\n' + '='.repeat(80));
  
  if (passed === total) {
    console.log('✅ ALL TESTS PASSED');
    console.log('\nReady to deploy to production!');
    console.log('Next steps:');
    console.log('  1. git add .');
    console.log('  2. git commit -m "Fix analysis endpoints with correct OKX API params"');
    console.log('  3. git push');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('\nPlease fix the failing endpoints before deploying.');
  }
  
  console.log('='.repeat(80) + '\n');
}

// Run the tests
runTests().catch(console.error);
