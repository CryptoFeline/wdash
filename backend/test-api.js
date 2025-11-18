// Test script to validate advanced-analysis API response structure
// Run with: node test-api.js

const testWallet = '9fWDDz25JHsXqz1zDaXkYLYm7Qp4PqNGvRRbMHVL5Tjh';
const testChain = 'sol';
const apiUrl = `http://localhost:3001/api/advanced-analysis/${testWallet}/${testChain}?skipRugCheck=true`;

console.log(`\n🧪 Testing API: ${apiUrl}\n`);

async function testAPI() {
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'X-API-Key': '88c090fb868f171d322e9cea5a8484dd10c05975e789a28238f2bb2428b06e84'
      }
    });
    
    if (!response.ok) {
      console.error(`❌ API Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    console.log('✅ API Response received\n');
    
    // Test Overview Structure
    console.log('📊 OVERVIEW STRUCTURE:');
    console.log('  Capital Metrics:');
    console.log(`    starting_capital: ${data.overview.capital_metrics?.starting_capital} (${typeof data.overview.capital_metrics?.starting_capital})`);
    console.log(`    peak_deployed: ${data.overview.capital_metrics?.peak_deployed} (${typeof data.overview.capital_metrics?.peak_deployed})`);
    console.log(`    final_capital: ${data.overview.capital_metrics?.final_capital} (${typeof data.overview.capital_metrics?.final_capital})`);
    console.log(`    net_pnl: ${data.overview.capital_metrics?.net_pnl} (${typeof data.overview.capital_metrics?.net_pnl})`);
    console.log(`    wallet_growth_roi: ${data.overview.capital_metrics?.wallet_growth_roi} (${typeof data.overview.capital_metrics?.wallet_growth_roi})`);
    console.log(`    trading_performance_roi: ${data.overview.capital_metrics?.trading_performance_roi} (${typeof data.overview.capital_metrics?.trading_performance_roi})`);
    
    console.log('\n  Volume Metrics:');
    console.log(`    total_buy_volume: ${data.overview.volume_metrics?.total_buy_volume} (${typeof data.overview.volume_metrics?.total_buy_volume})`);
    console.log(`    total_sell_volume: ${data.overview.volume_metrics?.total_sell_volume} (${typeof data.overview.volume_metrics?.total_sell_volume})`);
    console.log(`    volume_ratio: ${data.overview.volume_metrics?.volume_ratio} (${typeof data.overview.volume_metrics?.volume_ratio})`);
    
    console.log('\n  Risk Metrics:');
    console.log(`    rugged_positions: ${data.overview.risk_metrics?.rugged_positions} (${typeof data.overview.risk_metrics?.rugged_positions})`);
    console.log(`    win_rate: ${data.overview.risk_metrics?.win_rate} (${typeof data.overview.risk_metrics?.win_rate})`);
    
    // Test for NaN/undefined values
    console.log('\n🔍 VALIDATION:');
    let hasIssues = false;
    
    const checkValue = (path, value, name) => {
      if (value === undefined) {
        console.log(`  ❌ ${name} is undefined`);
        hasIssues = true;
      } else if (typeof value === 'number' && isNaN(value)) {
        console.log(`  ❌ ${name} is NaN`);
        hasIssues = true;
      } else if (typeof value === 'number') {
        console.log(`  ✅ ${name} = ${value.toFixed(2)}`);
      }
    };
    
    checkValue('capital_metrics.starting_capital', data.overview.capital_metrics?.starting_capital, 'starting_capital');
    checkValue('capital_metrics.peak_deployed', data.overview.capital_metrics?.peak_deployed, 'peak_deployed');
    checkValue('capital_metrics.net_pnl', data.overview.capital_metrics?.net_pnl, 'net_pnl');
    checkValue('volume_metrics.total_buy_volume', data.overview.volume_metrics?.total_buy_volume, 'total_buy_volume');
    checkValue('volume_metrics.volume_ratio', data.overview.volume_metrics?.volume_ratio, 'volume_ratio');
    checkValue('risk_metrics.win_rate', data.overview.risk_metrics?.win_rate, 'win_rate');
    
    // Test Token Structure
    console.log('\n🪙 FIRST TOKEN SAMPLE:');
    if (data.tokens && data.tokens.length > 0) {
      const token = data.tokens[0];
      console.log(`  symbol: ${token.token_symbol}`);
      console.log(`  status: ${token.status} (${typeof token.status})`);
      console.log(`  first_trade_time: ${token.first_trade_time} (${typeof token.first_trade_time})`);
      console.log(`  last_trade_time: ${token.last_trade_time} (${typeof token.last_trade_time})`);
      console.log(`  trading_window_hours: ${token.trading_window_hours} (${typeof token.trading_window_hours})`);
      console.log(`  avg_holding_hours: ${token.avg_holding_hours} (${typeof token.avg_holding_hours})`);
      console.log(`  total_invested: ${token.total_invested} (${typeof token.total_invested})`);
      console.log(`  net_pnl: ${token.net_pnl} (${typeof token.net_pnl})`);
      
      if (!token.status || token.status === 'UNKNOWN') {
        console.log('  ❌ Token status is UNKNOWN or missing');
        hasIssues = true;
      } else {
        console.log(`  ✅ Token status: ${token.status}`);
      }
    }
    
    // Test Trade Structure
    console.log('\n📈 FIRST CLOSED TRADE SAMPLE:');
    if (data.trades?.closed && data.trades.closed.length > 0) {
      const trade = data.trades.closed[0];
      console.log(`  symbol: ${trade.token_symbol}`);
      console.log(`  entry_value_usd: ${trade.entry_value_usd} (${typeof trade.entry_value_usd})`);
      console.log(`  exit_value_usd: ${trade.exit_value_usd} (${typeof trade.exit_value_usd})`);
      console.log(`  realized_pnl: ${trade.realized_pnl} (${typeof trade.realized_pnl})`);
      console.log(`  realized_roi: ${trade.realized_roi} (${typeof trade.realized_roi})`);
      console.log(`  holding_time_seconds: ${trade.holding_time_seconds} (${typeof trade.holding_time_seconds})`);
      
      checkValue('trade.entry_value_usd', trade.entry_value_usd, 'trade entry_value');
      checkValue('trade.realized_pnl', trade.realized_pnl, 'trade realized_pnl');
    }
    
    console.log('\n📉 FIRST OPEN POSITION SAMPLE:');
    if (data.trades?.open && data.trades.open.length > 0) {
      const position = data.trades.open[0];
      console.log(`  symbol: ${position.token_symbol}`);
      console.log(`  entry_value_usd: ${position.entry_value_usd} (${typeof position.entry_value_usd})`);
      console.log(`  current_value_usd: ${position.current_value_usd} (${typeof position.current_value_usd})`);
      console.log(`  current_price: ${position.current_price} (${typeof position.current_price})`);
      console.log(`  unrealized_pnl: ${position.unrealized_pnl} (${typeof position.unrealized_pnl})`);
      console.log(`  unrealized_roi: ${position.unrealized_roi} (${typeof position.unrealized_roi})`);
      
      checkValue('position.current_value_usd', position.current_value_usd, 'position current_value');
      checkValue('position.unrealized_pnl', position.unrealized_pnl, 'position unrealized_pnl');
    }
    
    console.log('\n' + '='.repeat(60));
    if (hasIssues) {
      console.log('❌ VALIDATION FAILED - Issues found above');
    } else {
      console.log('✅ ALL VALIDATIONS PASSED');
    }
    console.log('='.repeat(60) + '\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testAPI();
