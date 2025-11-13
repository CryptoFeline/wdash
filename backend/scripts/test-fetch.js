#!/usr/bin/env node

/**
 * Test script to fetch GMGN data and audit the full response schema
 * 
 * Usage:
 *   cd backend
 *   node scripts/test-fetch.js
 * 
 * This script:
 * 1. Fetches a sample wallet from GMGN API
 * 2. Logs the full wallet object (JSON)
 * 3. Extracts all available field names
 * 4. Shows data types for each field
 * 5. Identifies which fields are currently being saved vs missed
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import { fetchGMGNData } from '../scraper/fetcher.js';

console.log('🔍 GMGN API Response Schema Audit');
console.log('='.repeat(80));

try {
  console.log('\n📡 Fetching sample wallets from GMGN API...');
  console.log('   Chain: sol, Timeframe: 7d, Limit: 5\n');

  const result = await fetchGMGNData({ 
    chain: 'sol', 
    timeframe: '7d', 
    tag: null, 
    limit: 5 
  });

  if (!result.data || !result.data.rank || result.data.rank.length === 0) {
    console.error('❌ No wallet data in response');
    process.exit(1);
  }

  const wallet = result.data.rank[0];

  // 1. Full wallet object (pretty-printed JSON)
  console.log('1️⃣  FULL WALLET OBJECT (First wallet in response)');
  console.log('-'.repeat(80));
  console.log(JSON.stringify(wallet, null, 2));

  // 2. All field names (sorted alphabetically)
  console.log('\n2️⃣  ALL WALLET FIELD NAMES (Sorted)');
  console.log('-'.repeat(80));
  const fieldNames = Object.keys(wallet).sort();
  fieldNames.forEach((name, index) => {
    console.log(`${(index + 1).toString().padStart(3)}: ${name}`);
  });
  console.log(`\nTotal fields: ${fieldNames.length}`);

  // 3. Field types and structure
  console.log('\n3️⃣  FIELD TYPES & EXAMPLES');
  console.log('-'.repeat(80));
  console.log('Field Name'.padEnd(40) + 'Type'.padEnd(20) + 'Value/Example');
  console.log('-'.repeat(80));

  fieldNames.forEach(key => {
    const value = wallet[key];
    let type = typeof value;
    let example = '';

    if (Array.isArray(value)) {
      type = `array[${value.length}]`;
      if (value.length > 0) {
        example = typeof value[0] === 'object' 
          ? JSON.stringify(value[0]).substring(0, 40) + '...'
          : String(value[0]).substring(0, 40);
      }
    } else if (value === null) {
      type = 'null';
      example = 'null';
    } else if (typeof value === 'object') {
      type = 'object';
      const keys = Object.keys(value).slice(0, 3).join(', ');
      example = `{${keys}${Object.keys(value).length > 3 ? ', ...' : ''}}`;
    } else if (typeof value === 'string') {
      example = value.substring(0, 40) + (value.length > 40 ? '...' : '');
    } else {
      example = String(value);
    }

    console.log(
      key.padEnd(40) +
      type.padEnd(20) +
      example
    );
  });

  // 4. Currently saved vs missing fields
  console.log('\n4️⃣  FIELD SAVE STATUS');
  console.log('-'.repeat(80));

  // Fields that should always be saved
  const ALWAYS_SAVED = [
    'wallet_address',
    'pnl_7d',
    'pnl_30d',
    'realized_profit_7d',
    'token_num_7d',
    'avg_holding_period_7d',
    'risk',
    'chain',
  ];

  // Fields that are typically in GMGN but might be missing
  const POTENTIALLY_MISSING = [
    'daily_profit_7d',
    'daily_pnl_7d',
    'win_rate_7d',
    'sell_pass_buy_ratio',
    'token_honeypot_ratio',
    'top_tokens',
    'portfolio_chain',
  ];

  console.log('\n✅ FIELDS THAT SHOULD BE SAVED:');
  ALWAYS_SAVED.forEach(field => {
    const exists = field in wallet;
    const status = exists ? '✓' : '✗';
    console.log(`  ${status} ${field}`);
  });

  console.log('\n❓ FIELDS POTENTIALLY MISSING:');
  POTENTIALLY_MISSING.forEach(field => {
    const exists = fieldNames.some(name => 
      name.includes(field.toLowerCase()) || name === field
    );
    const status = exists ? '✓ Found' : '✗ Missing';
    const foundName = fieldNames.find(name => 
      name.includes(field.toLowerCase()) || name === field
    );
    console.log(`  ${status}${foundName ? ` (as: ${foundName})` : ''}`);
  });

  // 5. Schema summary
  console.log('\n5️⃣  SCHEMA SUMMARY');
  console.log('-'.repeat(80));

  const arrays = fieldNames.filter(k => Array.isArray(wallet[k])).length;
  const objects = fieldNames.filter(k => 
    wallet[k] !== null && typeof wallet[k] === 'object' && !Array.isArray(wallet[k])
  ).length;
  const primitives = fieldNames.length - arrays - objects;

  console.log(`📊 Total Fields: ${fieldNames.length}`);
  console.log(`  - Primitive types (string, number, boolean): ${primitives}`);
  console.log(`  - Objects: ${objects}`);
  console.log(`  - Arrays: ${arrays}`);

  // Deep inspection of nested objects
  console.log('\n6️⃣  NESTED OBJECT STRUCTURES');
  console.log('-'.repeat(80));

  fieldNames.forEach(key => {
    const value = wallet[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const nestedKeys = Object.keys(value).sort();
      console.log(`\n  ${key}:`);
      nestedKeys.slice(0, 10).forEach(nestedKey => {
        const nestedValue = value[nestedKey];
        const nestedType = Array.isArray(nestedValue) 
          ? `array[${nestedValue.length}]`
          : typeof nestedValue;
        console.log(`    - ${nestedKey}: ${nestedType}`);
      });
      if (nestedKeys.length > 10) {
        console.log(`    ... and ${nestedKeys.length - 10} more`);
      }
    }
  });

  console.log('\n' + '='.repeat(80));
  console.log('✅ Schema audit complete!');
  console.log('\nNext steps:');
  console.log('1. Review the fields above');
  console.log('2. Document in docs/GMGN_SCHEMA.md');
  console.log('3. Compare with what\'s saved in backend/routes/sync.js');
  console.log('4. Update sync.js if any fields are being missed');

  process.exit(0);

} catch (error) {
  console.error('\n❌ Error fetching GMGN data:');
  console.error(error.message);
  
  if (error.response) {
    console.error('\nAPI Response Status:', error.response.status);
    console.error('Response Headers:', error.response.headers);
  }
  
  console.error('\nTroubleshooting:');
  console.error('1. Check that .env has valid API_KEY');
  console.error('2. Check that BROWSERLESS_API_KEY is set');
  console.error('3. Check network connectivity');
  console.error('4. Try increasing timeout in fetcher.js');
  
  process.exit(1);
}
