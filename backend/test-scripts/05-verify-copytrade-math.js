
import { calculateCopyTradeMetrics } from '../services/analysis/copy-trade.js';
import { findNextTradePrice } from '../services/cmc/swaps.js';

console.log('\n🧪 Verifying Copy Trade Math & Logic...\n');

// --- TEST CASE 1: Finding Next Trade Price ---
console.log('--- Test Case 1: Finding Next Trade Price ---');

const targetTrade = {
  entry_timestamp: 1000000,
  tokenContractAddress: 'TOKEN_A'
};

const swaps = [
  { ts: 900000, t0a: 'TOKEN_A', t0pu: 0.5, t1a: 'USDT' },  // Before
  { ts: 1000000, t0a: 'TOKEN_A', t0pu: 1.0, t1a: 'USDT' }, // Exact match
  { ts: 1000100, t0a: 'TOKEN_A', t0pu: 1.1, t1a: 'USDT' }, // Next trade! (Target)
  { ts: 1000200, t0a: 'TOKEN_A', t0pu: 1.2, t1a: 'USDT' }  // Later
];

const nextPrice = findNextTradePrice(targetTrade, swaps);
console.log(`Target Timestamp: ${targetTrade.entry_timestamp}`);
console.log(`Swaps:`, swaps.map(s => `[${s.ts}] $${s.t0pu}`));
console.log(`Found Next Price: $${nextPrice}`);

if (nextPrice === 1.1) {
  console.log('✅ PASSED: Correctly identified next trade price.');
} else {
  console.log('❌ FAILED: Expected 1.1');
}

// --- TEST CASE 2: Calculating Metrics (Uptrend) ---
console.log('\n--- Test Case 2: Calculating Metrics (Uptrend) ---');

// Mock Candles (1h bars)
// Timestamp, Open, High, Low, Close
// We simulate a price that goes from 1.0 -> 2.0 -> 1.5
const candlesUptrend = [
  { timestamp: 1000000, open: 1.0, high: 1.2, low: 0.9, close: 1.1 }, // Entry candle
  { timestamp: 1003600, open: 1.1, high: 1.5, low: 1.1, close: 1.4 }, // +1h
  { timestamp: 1007200, open: 1.4, high: 2.0, low: 1.3, close: 1.8 }, // +2h (Peak)
  { timestamp: 1010800, open: 1.8, high: 1.9, low: 1.5, close: 1.6 }, // +3h
];

const copyEntryPrice = 1.0;
const entryTime = 1000000;

const metricsUptrend = calculateCopyTradeMetrics(candlesUptrend, copyEntryPrice, entryTime);

console.log(`Copy Entry: $${copyEntryPrice}`);
console.log(`Max Price in Candles: $2.0`);
console.log(`Expected Gain: 100% ((2.0 - 1.0)/1.0)`);
console.log(`Actual Result:`, metricsUptrend);

if (metricsUptrend.possible_gain_full > 99 && metricsUptrend.possible_gain_full < 101) {
  console.log('✅ PASSED: Calculated ~100% max gain.');
} else {
  console.log('❌ FAILED: Gain calculation incorrect.');
}

// --- TEST CASE 3: Calculating Metrics (Downtrend/Loss) ---
console.log('\n--- Test Case 3: Calculating Metrics (Downtrend) ---');

const candlesDowntrend = [
  { timestamp: 1000000, open: 1.0, high: 1.05, low: 0.9, close: 0.95 },
  { timestamp: 1003600, open: 0.95, high: 0.95, low: 0.8, close: 0.85 },
  { timestamp: 1007200, open: 0.85, high: 0.85, low: 0.5, close: 0.6 }, // Low of 0.5
];

const metricsDowntrend = calculateCopyTradeMetrics(candlesDowntrend, 1.0, 1000000);

console.log(`Copy Entry: $1.0`);
console.log(`Min Price in Candles: $0.5`);
console.log(`Expected Loss: -50% ((0.5 - 1.0)/1.0)`);
console.log(`Actual Result:`, metricsDowntrend);

if (metricsDowntrend.possible_loss_full > -51 && metricsDowntrend.possible_loss_full < -49) {
  console.log('✅ PASSED: Calculated ~-50% max loss.');
} else {
  console.log('❌ FAILED: Loss calculation incorrect.');
}

// --- TEST CASE 4: Time to Profit ---
console.log('\n--- Test Case 4: Time to Profit ---');

// Entry at 1.0. Target 25% = 1.25. Target 50% = 1.5.
// Candle 1: High 1.2 (No)
// Candle 2: High 1.5 (Yes, hits both)
const candlesTime = [
  { timestamp: 1000000, open: 1.0, high: 1.2, low: 1.0, close: 1.1 }, // 0h
  { timestamp: 1003600, open: 1.1, high: 1.6, low: 1.1, close: 1.5 }, // +1h (3600s)
];

const metricsTime = calculateCopyTradeMetrics(candlesTime, 1.0, 1000000);
console.log(`Actual Result:`, metricsTime);

// Time to 25% should be roughly the difference between candle 2 timestamp and entry?
// Actually, the logic uses the timestamp of the candle that *first* hits the target.
// Candle 2 hits it. So time should be 1003600 - 1000000 = 3600ms (simulated).

if (metricsTime.time_to_25_percent > 0) {
  console.log('✅ PASSED: Time to 25% calculated.');
} else {
  console.log('❌ FAILED: Time to 25% not calculated.');
}
