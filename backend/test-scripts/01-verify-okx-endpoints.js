/**
 * Test Script 1: Verify OKX Endpoints
 * 
 * Purpose: Test each OKX endpoint with real wallet data and capture response schemas
 * 
 * Usage: node test-scripts/01-verify-okx-endpoints.js
 */

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test wallet
const TEST_WALLET = '2gwiA6zaf2yRfBVDc5zbPPSq2fT9DSPybRyzvGCE3vYo';
const CHAIN_ID = '501'; // Solana

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Accept': 'application/json',
  'Accept-Language': 'en-US,en;q=0.9',
  'Referer': 'https://www.okx.com/',
  'Origin': 'https://www.okx.com'
};

/**
 * Test OKX endpoint and save response schema
 */
async function testEndpoint(name, url, params, description) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${name}`);
  console.log(`Description: ${description}`);
  console.log(`URL: ${url}`);
  console.log(`Params:`, params);
  console.log('='.repeat(80));
  
  try {
    const response = await axios.get(url, {
      params,
      headers: HEADERS,
      timeout: 30000
    });
    
    if (response.data?.code !== 0) {
      console.error(`❌ API Error: ${response.data?.msg || 'Unknown error'}`);
      return null;
    }
    
    console.log(`✅ Success!`);
    console.log(`Response structure:`, JSON.stringify(response.data, null, 2).slice(0, 500) + '...');
    
    // Save full response to schema file
    const schemaPath = path.join(__dirname, '..', 'schemas', `${name.replace(/\s+/g, '_').toLowerCase()}.json`);
    await fs.writeFile(schemaPath, JSON.stringify(response.data, null, 2));
    console.log(`📁 Schema saved to: ${schemaPath}`);
    
    return response.data;
  } catch (error) {
    console.error(`❌ Request failed:`, error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data:`, error.response.data);
    }
    return null;
  }
}

/**
 * Main test sequence
 */
async function runTests() {
  console.log('\n🚀 Starting OKX API Endpoint Verification');
  console.log(`Test Wallet: ${TEST_WALLET}`);
  console.log(`Chain: Solana (${CHAIN_ID})`);
  
  const results = {};
  
  // 1. WALLET PROFILE - SUMMARY
  results.profileSummary = await testEndpoint(
    'Wallet Profile Summary',
    'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/summary',
    {
      walletAddress: TEST_WALLET,
      chainId: CHAIN_ID,
      periodType: '3', // 7 days (1=1D, 2=3D, 3=7D, 4=1M, 5=3M)
      t: Date.now()
    },
    'Get 7-day wallet summary: total PnL, win rate, trades, etc.'
  );
  
  await new Promise(r => setTimeout(r, 1000)); // Rate limit delay
  
  // 2. WALLET PROFILE - ADDRESS INFO
  results.addressInfo = await testEndpoint(
    'Wallet Address Info',
    'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/query/address/info',
    {
      walletAddress: TEST_WALLET,
      chainId: CHAIN_ID,
      t: Date.now()
    },
    'Get wallet metadata: tags, labels, activity info'
  );
  
  await new Promise(r => setTimeout(r, 1000));
  
  // 3. TOKEN LIST - HELD POSITIONS
  results.tokenListHeld = await testEndpoint(
    'Token List Held',
    'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list',
    {
      walletAddress: TEST_WALLET,
      chainId: CHAIN_ID,
      filterEmptyBalance: 'true',
      sortType: '1', // 1=PnL
      isAsc: 'false', // descending
      offset: '0',
      limit: '100',
      t: Date.now()
    },
    'Get currently held tokens with PnL data'
  );
  
  await new Promise(r => setTimeout(r, 1000));
  
  // 4. TOKEN LIST - ALL TRADED
  results.tokenListAll = await testEndpoint(
    'Token List All Traded',
    'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/token-list',
    {
      walletAddress: TEST_WALLET,
      chainId: CHAIN_ID,
      filterEmptyBalance: 'false',
      sortType: '1',
      isAsc: 'false',
      offset: '0',
      limit: '100',
      t: Date.now()
    },
    'Get all traded tokens (including sold positions)'
  );
  
  await new Promise(r => setTimeout(r, 1000));
  
  // 5. TRADE HISTORY
  results.tradeHistory = await testEndpoint(
    'Trade History',
    'https://web3.okx.com/priapi/v1/dx/market/v2/pnl/wallet-profile/trade-history',
    {
      walletAddress: TEST_WALLET,
      chainId: CHAIN_ID,
      limit: '100',
      page: '1',
      t: Date.now()
    },
    'Get individual buy/sell transactions for FIFO analysis'
  );
  
  await new Promise(r => setTimeout(r, 1000));
  
  // 6. TOKEN INFO (using first token from trade history)
  if (results.tradeHistory?.data?.data?.[0]?.tokenContractAddress) {
    const firstToken = results.tradeHistory.data.data[0].tokenContractAddress;
    
    results.tokenInfo = await testEndpoint(
      'Token Info',
      'https://web3.okx.com/priapi/v1/dx/market/v2/latest/info',
      {
        chainId: CHAIN_ID,
        tokenContractAddress: firstToken,
        t: Date.now()
      },
      'Get token details: supply, holders, liquidity, market cap, price'
    );
    
    await new Promise(r => setTimeout(r, 1000));
    
    // 7. TOKEN OHLC CANDLES (1 hour bars)
    results.ohlcCandles = await testEndpoint(
      'Token OHLC Candles',
      'https://web3.okx.com/priapi/v5/dex/token/market/dex-token-hlc-candles',
      {
        chainId: CHAIN_ID,
        tokenContractAddress: firstToken,
        bar: '1H',
        limit: '1000',
        t: Date.now()
      },
      'Get price candles for max potential ROI calculation'
    );
    
    await new Promise(r => setTimeout(r, 1000));
    
    // 8. TOKEN OVERVIEW (for rug/honeypot detection)
    results.tokenOverview = await testEndpoint(
      'Token Overview',
      'https://web3.okx.com/priapi/v1/dx/market/v2/token/overview',
      {
        chainId: CHAIN_ID,
        tokenContractAddress: firstToken,
        t: Date.now()
      },
      'Get token overview: liquidity, trading activity, risk indicators'
    );
  }
  
  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(80));
  
  const successful = Object.entries(results).filter(([_, v]) => v !== null).length;
  const total = Object.keys(results).length;
  
  console.log(`\n✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  
  console.log('\n📁 Schema files saved to: backend/schemas/');
  console.log('\nNext steps:');
  console.log('1. Review schema files to understand data structure');
  console.log('2. Create TypeScript interfaces based on schemas');
  console.log('3. Build data fetchers for each endpoint');
  console.log('4. Implement FIFO algorithm with OHLC enrichment');
  console.log('5. Create aggregation logic for tabs (Overview, Tokens, Trades)');
}

// Run tests
runTests().catch(console.error);
