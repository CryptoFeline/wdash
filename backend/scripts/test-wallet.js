#!/usr/bin/env node

/**
 * Test script to query specific wallet data from Supabase
 * 
 * Usage:
 *   cd backend
 *   node scripts/test-wallet.js <wallet_address>
 * 
 * Example:
 *   node scripts/test-wallet.js 3sZNDKVEU7BpU5GQNp3WdBMXbNhQPqSyiwD63aM1zGQz
 */

import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const walletAddress = process.argv[2];

if (!walletAddress) {
  console.error('❌ Missing wallet address argument');
  console.log('Usage: node scripts/test-wallet.js <wallet_address>');
  process.exit(1);
}

console.log(`🔍 Querying wallet: ${walletAddress}`);
console.log('='.repeat(80));

try {
  const { data, error } = await supabase
    .from('wallets')
    .select('*')
    .eq('wallet_address', walletAddress)
    .single();

  if (error) {
    console.error('❌ Error querying wallet:', error.message);
    process.exit(1);
  }

  if (!data) {
    console.error('❌ Wallet not found in database');
    process.exit(1);
  }

  console.log('\n✅ WALLET FOUND IN DATABASE\n');

  console.log('1️⃣  BASIC WALLET INFO');
  console.log('-'.repeat(80));
  console.log(`  wallet_address: ${data.wallet_address}`);
  console.log(`  chain: ${data.chain}`);
  console.log(`  last_synced: ${data.last_synced}`);
  console.log(`  created_at: ${data.created_at}`);
  console.log(`  updated_at: ${data.updated_at}`);

  console.log('\n2️⃣  DATA FIELD (wallet.data JSONB)');
  console.log('-'.repeat(80));
  
  if (!data.data) {
    console.warn('  ⚠️  wallet.data is NULL or missing!');
  } else {
    const dataObj = data.data;
    console.log(`  Total fields in wallet.data: ${Object.keys(dataObj).length}`);
    console.log(`  Field names: ${Object.keys(dataObj).sort().join(', ')}`);
  }

  console.log('\n3️⃣  RISK ANALYSIS (from wallet.data.risk)');
  console.log('-'.repeat(80));
  
  if (!data.data || !data.data.risk) {
    console.warn('  ❌ MISSING: wallet.data.risk is NULL or undefined!');
    console.log('\n  This explains the missing risk analysis in frontend.');
    
    if (data.data) {
      console.log('\n  wallet.data keys present:');
      Object.keys(data.data).forEach(key => {
        const val = data.data[key];
        const type = Array.isArray(val) ? 'array' : typeof val;
        console.log(`    - ${key}: ${type}`);
      });
    }
  } else {
    console.log('  ✅ risk object found:');
    Object.entries(data.data.risk).forEach(([key, value]) => {
      console.log(`    ${key}: ${value}`);
    });
  }

  console.log('\n4️⃣  KEY PnL FIELDS');
  console.log('-'.repeat(80));
  if (data.data) {
    console.log(`  pnl_7d: ${data.data.pnl_7d || 'MISSING'}`);
    console.log(`  pnl_30d: ${data.data.pnl_30d || 'MISSING'}`);
    console.log(`  realized_profit_7d: ${data.data.realized_profit_7d || 'MISSING'}`);
    console.log(`  winrate_7d: ${data.data.winrate_7d || 'MISSING'}`);
    console.log(`  token_num_7d: ${data.data.token_num_7d || 'MISSING'}`);
    console.log(`  avg_holding_period_7d: ${data.data.avg_holding_period_7d || 'MISSING'}`);
  }

  console.log('\n5️⃣  DAILY PROFIT ARRAY (wallet.data.daily_profit_7d)');
  console.log('-'.repeat(80));
  if (!data.data || !data.data.daily_profit_7d) {
    console.warn('  ❌ MISSING: wallet.data.daily_profit_7d');
  } else {
    console.log(`  ✅ Array length: ${data.data.daily_profit_7d.length}`);
    data.data.daily_profit_7d.forEach((entry, i) => {
      console.log(`    Day ${i + 1}: ${entry.profit} USD (${new Date(entry.timestamp * 1000).toLocaleDateString()})`);
    });
  }

  console.log('\n6️⃣  FULL wallet.data JSON');
  console.log('-'.repeat(80));
  console.log(JSON.stringify(data.data, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('✅ Wallet query complete');
  
  // Summary
  console.log('\n📊 SUMMARY');
  if (!data.data) {
    console.log('  ⚠️  wallet.data is NULL - wallet not properly synced');
  } else if (!data.data.risk) {
    console.log('  ❌ ISSUE FOUND: wallet.data.risk is missing');
    console.log('  This is the root cause of missing risk analysis in frontend');
  } else {
    console.log('  ✅ All data present and complete');
  }

  process.exit(0);

} catch (error) {
  console.error('\n❌ Error:', error.message);
  console.error(error);
  process.exit(1);
}
