/**
 * Comprehensive test of production backend analysis endpoints
 * Tests data structure and values returned from Render deployment
 * 
 * Run with: node test-production-endpoints.js
 */

import axios from 'axios';

const PRODUCTION_URL = 'https://dashboard-backend-mo1j.onrender.com/api';
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
    
    // Pretty print the response
    console.log('\nResponse Data:');
    console.log(JSON.stringify(data, null, 2));
    
    // Analyze the structure
    console.log('\n--- Data Analysis ---');
    if (Array.isArray(data)) {
      console.log(`Type: Array with ${data.length} items`);
      if (data.length > 0) {
        console.log('First item:', JSON.stringify(data[0], null, 2));
      } else {
        console.log('⚠️  WARNING: Empty array returned');
      }
    } else if (typeof data === 'object') {
      const keys = Object.keys(data);
      console.log(`Type: Object with ${keys.length} keys`);
      console.log('Keys:', keys.join(', '));
      
      // Check for null/undefined/0 values
      const nullKeys = keys.filter(k => data[k] === null || data[k] === undefined);
      const zeroKeys = keys.filter(k => data[k] === 0 || data[k] === '0');
      
      if (nullKeys.length > 0) {
        console.log('⚠️  Null/undefined fields:', nullKeys.join(', '));
      }
      if (zeroKeys.length > 0) {
        console.log('⚠️  Zero value fields:', zeroKeys.join(', '));
      }
      
      // Show all values for debugging
      console.log('\nAll field values:');
      keys.forEach(key => {
        const value = data[key];
        const type = typeof value;
        console.log(`  ${key}: ${JSON.stringify(value)} (${type})`);
      });
    }
    
    return { success: true, duration, data };
  } catch (error) {
    console.log('❌ FAILED');
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
  console.log('║' + ' PRODUCTION BACKEND ANALYSIS TESTS'.padEnd(78) + '║');
  console.log('╚' + '═'.repeat(78) + '╝');
  console.log('\nProduction URL:', PRODUCTION_URL);
  console.log('Test Wallet:', TEST_WALLET);
  console.log('Test Chain:', TEST_CHAIN);
  
  const results = {};
  
  // Test 1: Summary endpoint
  results.summary = await testEndpoint(
    'Summary Endpoint',
    `${PRODUCTION_URL}/analysis/summary/${TEST_WALLET}?chain=${TEST_CHAIN}`
  );
  
  // Wait a bit between calls
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 2: Trades endpoint
  results.trades = await testEndpoint(
    'Trades Endpoint',
    `${PRODUCTION_URL}/analysis/trades/${TEST_WALLET}?chain=${TEST_CHAIN}`
  );
  
  // Wait a bit between calls
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Test 3: Metrics endpoint
  results.metrics = await testEndpoint(
    'Metrics Endpoint',
    `${PRODUCTION_URL}/analysis/metrics/${TEST_WALLET}?chain=${TEST_CHAIN}`
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
    console.log('✅ ALL ENDPOINTS WORKING');
    console.log('\nNext: Check if data structure matches frontend expectations');
  } else {
    console.log('❌ SOME ENDPOINTS FAILED');
    console.log('\nCheck the error details above');
  }
  
  console.log('='.repeat(80) + '\n');
}

// Run the tests
runTests().catch(console.error);
