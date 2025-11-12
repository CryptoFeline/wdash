#!/usr/bin/env node

/**
 * Test Browserless.io Connection
 * 
 * This script loads environment variables from .env and tests the Browserless API connection.
 * 
 * Usage:
 *   node test-browserless.js
 * 
 * Expected output:
 *   ✅ Connection test passed in ~2-3 seconds
 */

import dotenv from 'dotenv';

// Load .env file FIRST
dotenv.config();

// Now import the solver (which reads BROWSERLESS_API_TOKEN)
import { testBrowserlessConnection } from './scraper/solver-browserless.js';

console.log('\n🔧 Testing Browserless.io Connection...\n');
console.log('Environment check:');
console.log('- NODE_ENV:', process.env.NODE_ENV || 'not set');
console.log('- BROWSERLESS_API_TOKEN:', process.env.BROWSERLESS_API_TOKEN ? `${process.env.BROWSERLESS_API_TOKEN.substring(0, 10)}...` : '❌ NOT SET');
console.log('\n' + '─'.repeat(60) + '\n');

// Run the test
testBrowserlessConnection()
  .then(result => {
    console.log('\n' + '─'.repeat(60));
    if (result.success) {
      console.log('\n✅ SUCCESS! Browserless.io is working correctly.');
      console.log(`   Response time: ${result.duration}s`);
      console.log(`   Content length: ${result.content.length} bytes`);
      console.log('\n🚀 You\'re ready to run the backend with Browserless!\n');
      process.exit(0);
    } else {
      console.log('\n❌ FAILED! Check the error above.');
      console.log(`   Error: ${result.error}\n`);
      
      // Helpful debugging
      if (result.error.includes('401') || result.error.includes('Invalid API key')) {
        console.log('💡 Troubleshooting:');
        console.log('   1. Verify your API token at: https://account.browserless.io/');
        console.log('   2. Make sure .env file exists in backend/ directory');
        console.log('   3. Check that BROWSERLESS_API_TOKEN is set correctly in .env');
        console.log('   4. Token should look like: 2TOklR37jJ4f3OK3e7c39b65e26bdde6925604479b0309098\n');
      }
      
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Unexpected error:', error);
    process.exit(1);
  });
