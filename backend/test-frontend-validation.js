/**
 * Frontend Data Validation Test
 * 
 * This script mimics the frontend data fetching process and validates:
 * 1. API response structure matches TypeScript types
 * 2. No null/undefined/NaN values in critical fields
 * 3. Calculations are correct (ROI, capture efficiency, skill scores)
 * 4. Edge cases handled properly (open positions, extreme values)
 */

const BACKEND_URL = process.env.BACKEND_URL || 'https://gmgn-api.onrender.com/api';
const API_KEY = process.env.API_KEY || '88c090fb868f171d322e9cea5a8484dd10c05975e789a28238f2bb2428b06e84';

// Test wallet from user's report
const TEST_WALLET = 'FPAaobuJHi7bGKc2p1QLTuZ1KXLBLW9e63HiH28jmXL1';
const TEST_CHAIN = 'sol';

// Data validation rules
const VALIDATION_RULES = {
  skillScores: { min: 0, max: 100 },
  captureEfficiency: { min: -1000, max: 1000 }, // Cap extremes
  roiPercentage: { min: -100, max: 10000 }, // -100% loss to 10000% gain max
  entryQuality: ['excellent', 'good', 'fair', 'poor', 'bad', 'unknown'],
  riskLevel: [1, 2, 3, 4, 5],
  liquidityStatus: ['drained', 'low', 'warning', 'healthy', 'unknown'],
  rugType: ['hard_rug', 'soft_rug', null],
};

// Validation results tracker
const validationResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  errors: [],
  warnings: [],
};

// Utility functions
function validateRange(value, name, min, max) {
  if (value === null || value === undefined) {
    return { valid: false, error: `${name} is null/undefined` };
  }
  if (isNaN(value)) {
    return { valid: false, error: `${name} is NaN` };
  }
  if (value < min || value > max) {
    return { valid: false, error: `${name} (${value}) out of range [${min}, ${max}]` };
  }
  return { valid: true };
}

function validateEnum(value, name, allowedValues) {
  if (!allowedValues.includes(value)) {
    return { valid: false, error: `${name} (${value}) not in allowed values: ${allowedValues.join(', ')}` };
  }
  return { valid: true };
}

function logError(message, data) {
  console.error(`❌ ${message}`);
  if (data) console.error('   Data:', JSON.stringify(data, null, 2));
  validationResults.errors.push({ message, data });
  validationResults.failed++;
}

function logWarning(message, data) {
  console.warn(`⚠️  ${message}`);
  if (data) console.warn('   Data:', JSON.stringify(data, null, 2));
  validationResults.warnings.push({ message, data });
  validationResults.warnings++;
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
  validationResults.passed++;
}

// Fetch with error handling
async function fetchAPI(endpoint) {
  const url = `${BACKEND_URL}${endpoint}`;
  console.log(`\n🔍 Fetching: ${url}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
      },
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`   Response time: ${elapsed}ms`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Check for timeout
    if (elapsed > 10000) {
      logWarning(`Slow response (${elapsed}ms) - may timeout on Netlify (10s limit)`);
    } else if (elapsed < 5000) {
      logSuccess(`Fast response (${elapsed}ms)`);
    }
    
    return { data, elapsed };
  } catch (error) {
    logError(`API request failed: ${error.message}`, { url });
    throw error;
  }
}

// Validate trade object
function validateTrade(trade, index) {
  console.log(`\n  📊 Validating trade #${index + 1}: ${trade.token_symbol}`);
  
  let tradeErrors = 0;
  let tradeWarnings = 0;
  
  // Check required fields
  const requiredFields = ['trade_id', 'token_address', 'token_symbol', 'entry_price', 'quantity', 'realized_pnl', 'realized_roi'];
  for (const field of requiredFields) {
    if (trade[field] === null || trade[field] === undefined) {
      logError(`Trade #${index + 1}: Missing required field '${field}'`, { trade_id: trade.trade_id });
      tradeErrors++;
    }
  }
  
  // Validate ROI range
  if (trade.realized_roi !== undefined) {
    const result = validateRange(trade.realized_roi, 'realized_roi', VALIDATION_RULES.roiPercentage.min, VALIDATION_RULES.roiPercentage.max);
    if (!result.valid) {
      logError(`Trade #${index + 1} (${trade.token_symbol}): ${result.error}`, { realized_roi: trade.realized_roi });
      tradeErrors++;
    }
  }
  
  // Validate max_potential_roi (should always be >= 0 if present)
  if (trade.max_potential_roi !== undefined && trade.max_potential_roi !== null) {
    if (trade.max_potential_roi < 0) {
      logError(`Trade #${index + 1} (${trade.token_symbol}): max_potential_roi is negative (${trade.max_potential_roi})`, { trade_id: trade.trade_id });
      tradeErrors++;
    }
    
    // Check if it's an extreme value
    if (Math.abs(trade.max_potential_roi) > 10000) {
      logWarning(`Trade #${index + 1} (${trade.token_symbol}): max_potential_roi is extreme (${trade.max_potential_roi}%)`, { trade_id: trade.trade_id });
      tradeWarnings++;
    }
  }
  
  // Validate immediate_move_1h (can be extreme for memecoin pumps, but warn)
  if (trade.immediate_move_1h !== undefined && trade.immediate_move_1h !== null) {
    if (Math.abs(trade.immediate_move_1h) > 100000) {
      logWarning(`Trade #${index + 1} (${trade.token_symbol}): immediate_move_1h is extreme (${trade.immediate_move_1h}%) - likely calc error`, { 
        entry_price: trade.entry_price,
        immediate_move_1h: trade.immediate_move_1h 
      });
      tradeWarnings++;
    }
  }
  
  // Validate capture_efficiency
  if (trade.capture_efficiency !== undefined && trade.capture_efficiency !== null) {
    const result = validateRange(trade.capture_efficiency, 'capture_efficiency', VALIDATION_RULES.captureEfficiency.min, VALIDATION_RULES.captureEfficiency.max);
    if (!result.valid) {
      logError(`Trade #${index + 1} (${trade.token_symbol}): ${result.error}`, { 
        capture_efficiency: trade.capture_efficiency,
        realized_roi: trade.realized_roi,
        max_potential_roi: trade.max_potential_roi
      });
      tradeErrors++;
    }
  }
  
  // Validate entry_quality
  if (trade.entry_quality) {
    const result = validateEnum(trade.entry_quality, 'entry_quality', VALIDATION_RULES.entryQuality);
    if (!result.valid) {
      logError(`Trade #${index + 1} (${trade.token_symbol}): ${result.error}`, { entry_quality: trade.entry_quality });
      tradeErrors++;
    }
    
    // Warn if unknown
    if (trade.entry_quality === 'unknown') {
      tradeWarnings++;
    }
  } else {
    logWarning(`Trade #${index + 1} (${trade.token_symbol}): entry_quality is missing (OHLC enrichment failed?)`, { trade_id: trade.trade_id });
    tradeWarnings++;
  }
  
  // Validate riskLevel
  if (trade.riskLevel !== undefined && trade.riskLevel !== null) {
    const result = validateEnum(trade.riskLevel, 'riskLevel', VALIDATION_RULES.riskLevel);
    if (!result.valid) {
      logError(`Trade #${index + 1} (${trade.token_symbol}): ${result.error}`, { riskLevel: trade.riskLevel });
      tradeErrors++;
    }
  } else {
    logWarning(`Trade #${index + 1} (${trade.token_symbol}): riskLevel is null/undefined`, { trade_id: trade.trade_id });
    tradeWarnings++;
  }
  
  // Validate liquidity_status
  if (trade.liquidity_status) {
    const result = validateEnum(trade.liquidity_status, 'liquidity_status', VALIDATION_RULES.liquidityStatus);
    if (!result.valid) {
      logError(`Trade #${index + 1} (${trade.token_symbol}): ${result.error}`, { liquidity_status: trade.liquidity_status });
      tradeErrors++;
    }
  }
  
  // Validate rug detection
  if (trade.is_rug) {
    if (trade.rug_type) {
      const result = validateEnum(trade.rug_type, 'rug_type', VALIDATION_RULES.rugType);
      if (!result.valid) {
        logError(`Trade #${index + 1} (${trade.token_symbol}): ${result.error}`, { rug_type: trade.rug_type });
        tradeErrors++;
      }
    }
    
    if (trade.rug_confidence !== undefined) {
      const result = validateRange(trade.rug_confidence, 'rug_confidence', 0, 100);
      if (!result.valid) {
        logError(`Trade #${index + 1} (${trade.token_symbol}): ${result.error}`, { rug_confidence: trade.rug_confidence });
        tradeErrors++;
      }
    }
  }
  
  return { errors: tradeErrors, warnings: tradeWarnings };
}

// Validate metrics object
function validateMetrics(metrics) {
  console.log('\n📈 Validating wallet metrics...');
  
  let metricErrors = 0;
  
  // Validate skill scores (0-100 range)
  const skillScores = ['entry_skill_score', 'exit_skill_score', 'overall_skill_score'];
  for (const scoreField of skillScores) {
    if (metrics[scoreField] !== undefined && metrics[scoreField] !== null) {
      const result = validateRange(metrics[scoreField], scoreField, VALIDATION_RULES.skillScores.min, VALIDATION_RULES.skillScores.max);
      if (!result.valid) {
        logError(`Metrics: ${result.error}`, { [scoreField]: metrics[scoreField] });
        metricErrors++;
      }
    } else {
      logWarning(`Metrics: ${scoreField} is null/undefined`);
    }
  }
  
  // Validate win rate (0-100%)
  if (metrics.win_rate !== undefined) {
    const result = validateRange(metrics.win_rate, 'win_rate', 0, 100);
    if (!result.valid) {
      logError(`Metrics: ${result.error}`, { win_rate: metrics.win_rate });
      metricErrors++;
    }
  }
  
  // Validate trade counts match
  if (metrics.total_trades !== undefined && metrics.win_count !== undefined && metrics.loss_count !== undefined) {
    const calculatedTotal = metrics.win_count + metrics.loss_count;
    if (calculatedTotal !== metrics.total_trades) {
      logError(`Metrics: win_count + loss_count (${calculatedTotal}) != total_trades (${metrics.total_trades})`, { 
        win_count: metrics.win_count,
        loss_count: metrics.loss_count,
        total_trades: metrics.total_trades
      });
      metricErrors++;
    } else {
      logSuccess(`Trade counts match: ${metrics.win_count} wins + ${metrics.loss_count} losses = ${metrics.total_trades} total`);
    }
  }
  
  return { errors: metricErrors };
}

// Main validation function
async function runValidation() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║      Frontend Data Validation Test                        ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  console.log(`Test Wallet: ${TEST_WALLET}`);
  console.log(`Test Chain: ${TEST_CHAIN}\n`);
  
  try {
    // Step 1: Fetch trades (mimics useWalletAnalysis hook)
    const { data: tradesData, elapsed: tradesTime } = await fetchAPI(`/analysis/trades/${TEST_WALLET}?chain=${TEST_CHAIN}&enableTokenOverview=true&enableOHLC=true`);
    
    const trades = tradesData.trades || tradesData.data || [];
    console.log(`\n📦 Received ${trades.length} trades`);
    
    if (trades.length === 0) {
      logError('No trades returned from API');
      return;
    }
    
    // Step 2: Validate each trade
    let totalTradeErrors = 0;
    let totalTradeWarnings = 0;
    let unknownEntryQualityCount = 0;
    let missingRiskLevelCount = 0;
    
    for (let i = 0; i < trades.length; i++) {
      const { errors, warnings } = validateTrade(trades[i], i);
      totalTradeErrors += errors;
      totalTradeWarnings += warnings;
      
      if (trades[i].entry_quality === 'unknown' || !trades[i].entry_quality) {
        unknownEntryQualityCount++;
      }
      if (trades[i].riskLevel === null || trades[i].riskLevel === undefined) {
        missingRiskLevelCount++;
      }
    }
    
    // Step 3: Calculate aggregations (mimic frontend calculations)
    console.log('\n\n📊 Calculating aggregations (mimic frontend)...\n');
    
    const entryQualityCounts = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0,
      bad: 0,
      unknown: 0,
    };
    
    let totalCaptureEfficiency = 0;
    let captureEfficiencyCount = 0;
    let ruggedCount = 0;
    let liquidityIssuesCount = 0;
    let cannotExitCount = 0;
    
    for (const trade of trades) {
      // Entry quality
      const quality = trade.entry_quality || 'unknown';
      entryQualityCounts[quality] = (entryQualityCounts[quality] || 0) + 1;
      
      // Capture efficiency
      if (trade.capture_efficiency !== undefined && trade.capture_efficiency !== null && !isNaN(trade.capture_efficiency)) {
        totalCaptureEfficiency += trade.capture_efficiency;
        captureEfficiencyCount++;
      }
      
      // Rug detection
      if (trade.is_rug) {
        ruggedCount++;
      }
      
      // Liquidity
      if (trade.liquidity_status && ['drained', 'low', 'warning'].includes(trade.liquidity_status)) {
        liquidityIssuesCount++;
      }
      
      if (trade.can_exit === false) {
        cannotExitCount++;
      }
    }
    
    const avgCaptureEfficiency = captureEfficiencyCount > 0 ? totalCaptureEfficiency / captureEfficiencyCount : 0;
    
    console.log('Entry Quality Distribution:');
    for (const [quality, count] of Object.entries(entryQualityCounts)) {
      console.log(`  ${quality}: ${count} (${((count / trades.length) * 100).toFixed(1)}%)`);
    }
    
    console.log(`\nAvg Capture Efficiency: ${avgCaptureEfficiency.toFixed(2)}%`);
    console.log(`Rugged Tokens: ${ruggedCount} (${((ruggedCount / trades.length) * 100).toFixed(1)}%)`);
    console.log(`Liquidity Issues: ${liquidityIssuesCount} / ${trades.length} (${((liquidityIssuesCount / trades.length) * 100).toFixed(1)}%)`);
    console.log(`Cannot Exit: ${cannotExitCount} / ${trades.length}`);
    
    // Step 4: Fetch metrics
    const { data: metricsData } = await fetchAPI(`/analysis/metrics/${TEST_WALLET}?chain=${TEST_CHAIN}`);
    
    const metrics = metricsData.metrics || metricsData;
    console.log(`\n📈 Received metrics`);
    
    if (metrics) {
      const { errors: metricErrors } = validateMetrics(metrics);
      totalTradeErrors += metricErrors;
    } else {
      logError('No metrics returned from API');
    }
    
    // Step 5: Summary
    console.log('\n\n╔════════════════════════════════════════════════════════════╗');
    console.log('║                   VALIDATION SUMMARY                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    
    console.log(`Total Trades Validated: ${trades.length}`);
    console.log(`✅ Passed: ${validationResults.passed}`);
    console.log(`❌ Failed: ${validationResults.failed}`);
    console.log(`⚠️  Warnings: ${validationResults.warnings}`);
    
    console.log('\n📊 Key Issues:');
    console.log(`  - Unknown entry quality: ${unknownEntryQualityCount} / ${trades.length} (${((unknownEntryQualityCount / trades.length) * 100).toFixed(1)}%)`);
    console.log(`  - Missing risk level: ${missingRiskLevelCount} / ${trades.length} (${((missingRiskLevelCount / trades.length) * 100).toFixed(1)}%)`);
    
    if (unknownEntryQualityCount > trades.length * 0.1) {
      logError(`High percentage of unknown entry quality (${((unknownEntryQualityCount / trades.length) * 100).toFixed(1)}%) - OHLC enrichment failing`);
    }
    
    if (missingRiskLevelCount === trades.length) {
      logError('All trades missing riskLevel - field not being populated');
    }
    
    // Print top errors
    if (validationResults.errors.length > 0) {
      console.log('\n🔴 Top Errors:');
      validationResults.errors.slice(0, 10).forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.message}`);
      });
    }
    
    // Exit with error code if critical failures
    if (validationResults.failed > 0) {
      console.log('\n❌ VALIDATION FAILED - Fix critical errors above\n');
      process.exit(1);
    } else if (validationResults.warnings > trades.length * 0.3) {
      console.log('\n⚠️  VALIDATION PASSED WITH WARNINGS - Review warnings above\n');
      process.exit(0);
    } else {
      console.log('\n✅ VALIDATION PASSED - All checks successful!\n');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('\n❌ Validation failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run validation
runValidation();
