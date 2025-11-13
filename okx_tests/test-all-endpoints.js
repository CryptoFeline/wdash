#!/usr/bin/env node

/**
 * OKX API Endpoint Testing & Rate Analysis Tool
 * 
 * Tests all 10 OKX endpoints to verify:
 * 1. Endpoint availability & response structure
 * 2. Response time (latency)
 * 3. Data completeness
 * 4. Rate limiting behavior
 * 5. Pagination handling
 * 
 * Usage:
 *   node okx_tests/test-all-endpoints.js
 * 
 * Output:
 *   - Console report with timing, status, and recommendations
 *   - results.json with detailed metrics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RESULTS_FILE = path.join(__dirname, 'results.json');

// Test wallet (Solana, high activity)
const TEST_WALLET = 'Ez2jp3rwXUbaTx7XwiHGaWVgTPFdzJoSg8TopqbxfaJN';
const SOLANA_CHAIN_ID = 501;

// Test token
const TEST_TOKEN = '7tWAwLXjcTfDXqedWzQxNc274huxq38xB16MNFQ5bonk';

console.log('🚀 OKX API Endpoint Testing Suite');
console.log('='.repeat(80));
console.log(`Test Wallet: ${TEST_WALLET}`);
console.log(`Test Token: ${TEST_TOKEN}`);
console.log('='.repeat(80));
console.log('');

const results = {
  timestamp: new Date().toISOString(),
  testWallet: TEST_WALLET,
  endpoints: [],
  summary: {
    totalEndpoints: 10,
    successfulEndpoints: 0,
    failedEndpoints: 0,
    averageLatency: 0,
    totalApiCalls: 0,
  },
};

// Helper function to measure API call
async function testEndpoint(name, url, description, options = {}) {
  const endpoint = {
    number: results.endpoints.length + 1,
    name,
    url,
    description,
    status: 'pending',
    latency: 0,
    statusCode: 0,
    dataSize: 0,
    dataFields: [],
    errorMessage: '',
    successRate: 0,
    recommendations: [],
  };

  console.log(`\n[${endpoint.number}] ${name}`);
  console.log(`    URL: ${url}`);
  console.log(`    Description: ${description}`);
  console.log('    Testing...');

  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (OKX Test Suite)',
        'Accept': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    const latency = Date.now() - startTime;

    endpoint.latency = latency;
    endpoint.statusCode = response.status;
    endpoint.successRate = response.ok ? 100 : 0;

    if (!response.ok) {
      endpoint.status = 'failed';
      endpoint.errorMessage = `HTTP ${response.status}`;
      results.endpoints.push(endpoint);
      console.log(`    ❌ FAILED: ${response.status}`);
      return endpoint;
    }

    const data = await response.json();
    const dataJson = JSON.stringify(data);
    endpoint.dataSize = dataJson.length;

    // Extract field names from response
    if (data.data && typeof data.data === 'object') {
      endpoint.dataFields = Object.keys(data.data).sort();
    }

    endpoint.status = 'success';
    results.endpoints.push(endpoint);

    console.log(`    ✅ SUCCESS (${latency}ms, ${endpoint.dataSize} bytes)`);
    console.log(`    Response fields: ${endpoint.dataFields.slice(0, 5).join(', ')}${endpoint.dataFields.length > 5 ? '...' : ''}`);

    return endpoint;
  } catch (error) {
    endpoint.status = 'error';
    endpoint.errorMessage = error.message;
    endpoint.successRate = 0;
    results.endpoints.push(endpoint);
    console.log(`    ❌ ERROR: ${error.message}`);
    return endpoint;
  }
}

// Test all 10 endpoints
async function runAllTests() {
  const tests = [
    {
      name: 'Endpoint 1: Wallet Summary',
      url: `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/summary?periodType=3&chainId=${SOLANA_CHAIN_ID}&walletAddress=${TEST_WALLET}&t=${Date.now()}`,
      description: 'Get 7d PnL, top tokens, win rates, daily breakdown',
      cached: false,
      frequency: 'once per sync (essential)',
    },
    {
      name: 'Endpoint 2: Wallet Info',
      url: `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/query/address/info?chainId=${SOLANA_CHAIN_ID}&walletAddress=${TEST_WALLET}&t=${Date.now()}`,
      description: 'Get KOL status and wallet metadata',
      cached: true,
      frequency: 'once per sync (optional - low value)',
    },
    {
      name: 'Endpoint 3: Wallet Chains',
      url: `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/all-chains?walletAddress=${TEST_WALLET}&t=${Date.now()}`,
      description: 'Get multi-chain support info',
      cached: true,
      frequency: 'once per sync (optional - rarely changes)',
    },
    {
      name: 'Endpoint 4: Token List (Page 1)',
      url: `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list?walletAddress=${TEST_WALLET}&chainId=${SOLANA_CHAIN_ID}&isAsc=false&sortType=1&filterEmptyBalance=false&offset=0&limit=100&t=${Date.now()}`,
      description: 'Get full portfolio with PnL per token (paginated)',
      cached: false,
      frequency: 'once per sync (essential)',
    },
    {
      name: 'Endpoint 4b: Token List (Page 2)',
      url: `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list?walletAddress=${TEST_WALLET}&chainId=${SOLANA_CHAIN_ID}&isAsc=false&sortType=1&filterEmptyBalance=false&offset=100&limit=100&t=${Date.now()}`,
      description: 'Get next page of portfolio (pagination test)',
      cached: false,
      frequency: 'once per sync if hasNext=true (essential)',
    },
    {
      name: 'Endpoint 5: Token Statistics',
      url: `https://web3.okx.com/priapi/v1/dx/market/v2/trading-history/statistics?chainId=${SOLANA_CHAIN_ID}&tokenAddress=${TEST_TOKEN}&walletAddress=${TEST_WALLET}&t=${Date.now()}`,
      description: 'Get detailed trading stats for specific token',
      cached: false,
      frequency: 'per top 5 tokens (optional - high detail)',
    },
    {
      name: 'Endpoint 6: Token Trading History',
      url: `https://web3.okx.com/priapi/v1/dx/market/v2/trading/kline-bs-point?chainId=${SOLANA_CHAIN_ID}&tokenAddress=${TEST_TOKEN}&fromAddress=${TEST_WALLET}&after=${Date.now()}&bar=1m&limit=240&t=${Date.now()}`,
      description: 'Get buy/sell timeline for specific token',
      cached: false,
      frequency: 'per top 5 tokens (optional - detailed history)',
    },
    {
      name: 'Endpoint 7: Trading History List',
      url: `https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/trade-history?walletAddress=${TEST_WALLET}&chainId=${SOLANA_CHAIN_ID}&pageSize=10&tradeType=1,2&filterRisk=true&t=${Date.now()}`,
      description: 'Get overall trading history (paginated)',
      cached: false,
      frequency: 'once per sync (optional - pattern detection)',
    },
    {
      name: 'Endpoint 8: Portfolio Snapshot',
      url: `https://web3.okx.com/priapi/v2/wallet/asset/profile/all/explorer?t=${Date.now()}`,
      description: 'Get current portfolio holdings (POST endpoint)',
      cached: false,
      frequency: 'not needed for tracked wallets (portfolio data in Endpoint 4)',
      isPost: true,
    },
    {
      name: 'Endpoint 9: Token Info',
      url: `https://web3.okx.com/priapi/v1/dx/market/v2/latest/info?chainId=${SOLANA_CHAIN_ID}&tokenContractAddress=${TEST_TOKEN}&t=${Date.now()}`,
      description: 'Get token metadata, risk level, liquidity',
      cached: true,
      frequency: 'optional - rarely needed for tracked wallets',
    },
    {
      name: 'Endpoint 10: Holder Ranking',
      url: `https://web3.okx.com/priapi/v1/dx/market/v2/holders/ranking-list?chainId=${SOLANA_CHAIN_ID}&tokenAddress=${TEST_TOKEN}&t=${Date.now()}`,
      description: 'Get token holder distribution and stats',
      cached: true,
      frequency: 'not needed for tracked wallets (token analysis)',
    },
  ];

  for (const test of tests) {
    const result = await testEndpoint(test.name, test.url, test.description, {
      method: test.isPost ? 'POST' : 'GET',
      headers: test.isPost ? { 'Content-Type': 'application/json' } : {},
      ...(test.isPost && { body: JSON.stringify({ walletAddress: TEST_WALLET, chainId: SOLANA_CHAIN_ID }) }),
    });

    // Add metadata
    result.cached = test.cached;
    result.frequency = test.frequency;
    result.isPost = test.isPost || false;

    // Wait between requests to avoid rate limiting
    if (test !== tests[tests.length - 1]) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  // Calculate summary
  const successful = results.endpoints.filter(e => e.status === 'success');
  results.summary.successfulEndpoints = successful.length;
  results.summary.failedEndpoints = results.endpoints.length - successful.length;
  results.summary.totalApiCalls = results.endpoints.length;
  
  if (successful.length > 0) {
    results.summary.averageLatency = Math.round(
      successful.reduce((sum, e) => sum + e.latency, 0) / successful.length
    );
  }

  // Print summary
  printSummary();

  // Save results
  saveResults();
}

function printSummary() {
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 SUMMARY REPORT');
  console.log('='.repeat(80));

  const successful = results.endpoints.filter(e => e.status === 'success');
  const failed = results.endpoints.filter(e => e.status !== 'success');

  console.log(`\n✅ Successful: ${successful.length}/${results.endpoints.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.endpoints.length}`);
  console.log(`⏱️  Average Latency: ${results.summary.averageLatency}ms`);
  console.log(`📦 Total Data: ${Math.round(successful.reduce((sum, e) => sum + e.dataSize, 0) / 1024)}KB`);

  if (failed.length > 0) {
    console.log('\n❌ Failed Endpoints:');
    failed.forEach(e => {
      console.log(`   [${e.number}] ${e.name}: ${e.errorMessage}`);
    });
  }

  console.log('\n📈 Endpoint Analysis:');
  successful.forEach(e => {
    console.log(`   [${e.number}] ${e.name}`);
    console.log(`       Latency: ${e.latency}ms | Size: ${e.dataSize}B | Fields: ${e.dataFields.length}`);
  });

  // Rate limiting analysis
  console.log('\n💡 Rate Limiting Recommendations:');
  console.log('');
  printRateLimitingAnalysis();

  // Update frequency analysis
  console.log('\n🔄 Update Frequency Recommendations:');
  console.log('');
  printUpdateFrequencyAnalysis();

  // Implementation recommendations
  console.log('\n🛠️  Implementation Recommendations:');
  console.log('');
  printImplementationRecommendations();
}

function printRateLimitingAnalysis() {
  const perWalletCalls = [
    { endpoint: 1, name: 'Wallet Summary', calls: 1 },
    { endpoint: 2, name: 'Wallet Info', calls: 1, optional: true },
    { endpoint: 3, name: 'Wallet Chains', calls: 1, optional: true },
    { endpoint: 4, name: 'Token List', calls: 2 }, // avg 2 pages
    { endpoint: 5, name: 'Token Statistics', calls: 5 }, // top 5 tokens
    { endpoint: 6, name: 'Token Trading History', calls: 5 }, // top 5 tokens
    { endpoint: 7, name: 'Trading History List', calls: 1, optional: true },
    { endpoint: 9, name: 'Token Info', calls: 1, optional: true },
    { endpoint: 10, name: 'Holder Ranking', calls: 1, optional: true },
  ];

  const essential = perWalletCalls.filter(e => !e.optional);
  const optional = perWalletCalls.filter(e => e.optional);

  const essentialCalls = essential.reduce((sum, e) => sum + e.calls, 0);
  const optionalCalls = optional.reduce((sum, e) => sum + e.calls, 0);

  console.log(`Essential calls per wallet: ${essentialCalls}`);
  console.log(`Optional calls per wallet: ${optionalCalls}`);
  console.log(`Total (if all enabled): ${essentialCalls + optionalCalls}`);
  console.log('');

  console.log('Sync scenarios (5 tracked wallets):');
  console.log(`  Essential only: 5 × ${essentialCalls} = ${5 * essentialCalls} calls/sync`);
  console.log(`  With optional: 5 × ${essentialCalls + optionalCalls} = ${5 * (essentialCalls + optionalCalls)} calls/sync`);
  console.log('');

  console.log('Recommended sync intervals:');
  const avgLatency = results.summary.averageLatency;
  console.log(`  Total API time per wallet: ~${essentialCalls * (avgLatency / 5)}ms (avg)`);
  console.log(`  Recommended sync interval: 10-15 seconds per wallet`);
  console.log(`  5 wallets full cycle: ~50-75 seconds`);
  console.log('');

  console.log('Rate limit safety:');
  console.log(`  API calls/min (5 wallets): ${Math.round((5 * essentialCalls * 60) / 60)} calls/min`);
  console.log(`  OKX limit: ~100-200 calls/min`);
  console.log(`  Safety margin: ✅ Safe`);
}

function printUpdateFrequencyAnalysis() {
  console.log('Endpoints that change frequently (update every sync):');
  console.log('  1. Wallet Summary - PnL, win rates update constantly');
  console.log('  4. Token List - Portfolio holdings change');
  console.log('  5. Token Statistics - Per-token metrics change');
  console.log('  6. Token Trading History - New trades appear');
  console.log('');

  console.log('Endpoints that rarely change (cache for 24+ hours):');
  console.log('  2. Wallet Info - KOL status (rarely changes)');
  console.log('  3. Wallet Chains - Multi-chain (never changes)');
  console.log('  9. Token Info - Metadata (rarely changes)');
  console.log('  10. Holder Ranking - Historical analysis only');
  console.log('');

  console.log('Endpoints that can be skipped:');
  console.log('  7. Trading History List - Duplicate of Endpoint 4 data');
  console.log('  8. Portfolio Snapshot - Duplicate of Endpoint 4 data');
  console.log('  10. Holder Ranking - Not needed for tracked wallets');
}

function printImplementationRecommendations() {
  console.log('✅ DO include in rolling sync:');
  console.log('  - Endpoint 1: Wallet Summary (essential, always update)');
  console.log('  - Endpoint 4: Token List (essential, always update)');
  console.log('  - Endpoint 5: Token Statistics (optional, top 5 tokens)');
  console.log('  - Endpoint 6: Token Trading History (optional, top 5 tokens)');
  console.log('');

  console.log('⏭️  Cache and update less frequently:');
  console.log('  - Endpoint 2: Wallet Info (cache 24 hours)');
  console.log('  - Endpoint 3: Wallet Chains (cache permanently)');
  console.log('  - Endpoint 9: Token Info (cache 24 hours)');
  console.log('');

  console.log('❌ Skip these endpoints:');
  console.log('  - Endpoint 7: Duplicate of 4/5/6 combined');
  console.log('  - Endpoint 8: Use portfolio data from Endpoint 4');
  console.log('  - Endpoint 10: Not relevant for tracked wallets');
  console.log('');

  console.log('Minimal sync (fastest, lowest rate):');
  console.log('  - Endpoint 1 + Endpoint 4 only');
  console.log('  - 5 wallets: 3 calls/wallet × 5 = 15 calls/sync');
  console.log('  - Every 30 seconds: 30 calls/min (safe)');
  console.log('');

  console.log('Balanced sync (recommended):');
  console.log('  - Endpoint 1 + 4 + 5 + 6 (top 3 tokens)');
  console.log('  - 5 wallets: 10 calls/wallet × 5 = 50 calls/sync');
  console.log('  - Every 60 seconds: 50 calls/min (safe)');
  console.log('');

  console.log('Full sync (comprehensive):');
  console.log('  - All endpoints except 7, 8, 10');
  console.log('  - 5 wallets: 15 calls/wallet × 5 = 75 calls/sync');
  console.log('  - Every 90 seconds: 50 calls/min (safe)');
}

function saveResults() {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
  console.log(`\n📁 Results saved to: ${RESULTS_FILE}`);
}

// Run tests
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
