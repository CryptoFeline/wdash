import { Wallet } from '@/types/wallet';

/**
 * Export wallets to CSV format
 */
export function exportToCSV(wallets: Wallet[], filename: string = 'wallets.csv') {
  if (!wallets || wallets.length === 0) {
    alert('No wallets to export');
    return;
  }

  // Define CSV headers
  const headers = [
    'Wallet Address',
    'Tags',
    'PnL 7d (%)',
    'Profit 7d ($)',
    'Win Rate 7d (%)',
    'Unique Tokens',
    'Buy Count',
    'Sell Count',
    'Moonshots (>5x)',
    'Good Trades (2-5x)',
    'Risk Score',
    'Honeypot Ratio',
    'Failed Sells Ratio',
    'Fast TX Ratio',
    'Last Active',
    'Score'
  ];

  // Convert wallets to CSV rows
  const rows = wallets.map(w => {
    const riskScore = (
      (w.risk?.token_honeypot_ratio || 0) * 0.4 +
      (w.risk?.sell_pass_buy_ratio || 0) * 0.4 +
      (w.risk?.fast_tx_ratio || 0) * 0.2
    ).toFixed(4);

    return [
      w.wallet_address,
      `"${w.tags.join(', ')}"`,
      (w.pnl_7d * 100).toFixed(2),
      w.realized_profit_7d.toFixed(2),
      (w.winrate_7d * 100).toFixed(2),
      w.token_num_7d,
      w.buy,
      w.sell,
      w.pnl_gt_5x_num_7d,
      w.pnl_2x_5x_num_7d,
      riskScore,
      (w.risk?.token_honeypot_ratio || 0).toFixed(4),
      (w.risk?.sell_pass_buy_ratio || 0).toFixed(4),
      (w.risk?.fast_tx_ratio || 0).toFixed(4),
      new Date(w.last_active * 1000).toISOString(),
      (w.score || 0).toFixed(4)
    ].join(',');
  });

  // Combine headers and rows
  const csv = [headers.join(','), ...rows].join('\n');

  // Create download link
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export wallets to JSON format
 */
export function exportToJSON(wallets: Wallet[], filename: string = 'wallets.json') {
  if (!wallets || wallets.length === 0) {
    alert('No wallets to export');
    return;
  }

  const json = JSON.stringify(wallets, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Format large numbers with K/M suffixes
 */
export function formatNumber(num: number | null | undefined): string {
  // Convert to number if string, handle null/undefined
  const value = typeof num === 'string' ? parseFloat(num) : num;
  
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(2)}K`;
  }
  
  // Return as integer if whole number, otherwise 2 decimals
  return Number.isInteger(value) ? Math.floor(value).toString() : value.toFixed(2);
}

/**
 * Format percentage with shorthand notation for large values
 */
export function formatPercentage(value: number | null | undefined): string {
  // Convert to number if string, handle null/undefined
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === null || num === undefined || isNaN(num)) {
    return '0.00%';
  }
  
  const percentValue = num * 100;
  
  // Use shorthand for large percentages (>= 1000%)
  if (percentValue >= 1000) {
    return `${(percentValue / 1000).toFixed(2)}K%`;
  }
  
  return `${percentValue.toFixed(2)}%`;
}

/**
 * Format USD currency
 */
export function formatUSD(value: number | null | undefined): string {
  // Convert to number if string, handle null/undefined
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (num === null || num === undefined || isNaN(num)) {
    return '$0.00';
  }
  return `$${formatNumber(num)}`;
}

/**
 * Get color class based on PnL
 */
export function getPnLColor(pnl: number): string {
  if (pnl > 5.0) return 'text-green-600 font-bold';
  if (pnl > 2.0) return 'text-green-500';
  if (pnl > 1.0) return 'text-green-400';
  if (pnl > 0.5) return 'text-yellow-500';
  if (pnl > 0) return 'text-gray-400';
  return 'text-red-500';
}

/**
 * Get risk color and label
 */
export function getRiskInfo(risk: number): { color: string; label: string } {
  if (risk < 0.10) return { color: 'text-green-700 border-green-700', label: 'Low' };
  if (risk < 0.25) return { color: 'text-yellow-700 border-yellow-700', label: 'Medium' };
  return { color: 'border-red-700 text-red-700', label: 'High' };
}

/**
 * Truncate wallet address
 */
export function truncateAddress(address: string, chars: number = 6): string {
  return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

/**
 * Copy to clipboard
 */
export function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).then(() => {
    // Could show a toast notification here
    console.log('Copied to clipboard:', text);
  });
}
