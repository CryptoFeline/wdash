import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format large numbers with K, M, B, T abbreviations
 * Examples: 1234 → 1.2K, 1234567 → 1.2M, 1234567890 → 1.2B
 * 
 * @param num - Number to format
 * @param decimals - Number of decimal places (default 1)
 * @returns Formatted string
 */
export function formatNumber(num: number, decimals: number = 1): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  
  const absNum = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  
  // Under 1000, show exact number
  if (absNum < 1000) {
    return sign + absNum.toFixed(decimals > 0 ? decimals : 0);
  }
  
  // Define scale steps (up to Quadrillion)
  const scales = [
    { value: 1e15, suffix: 'Q' },   // Quadrillion
    { value: 1e12, suffix: 'T' },   // Trillion
    { value: 1e9, suffix: 'B' },    // Billion
    { value: 1e6, suffix: 'M' },    // Million
    { value: 1e3, suffix: 'K' }     // Thousand
  ];
  
  for (const scale of scales) {
    if (absNum >= scale.value) {
      const scaled = absNum / scale.value;
      return sign + scaled.toFixed(decimals) + scale.suffix;
    }
  }
  
  return sign + absNum.toFixed(decimals);
}

/**
 * Format percentage with abbreviations for large values
 * Examples: 132.5 → 132.5%, 1234 → 1.2K%, 1234567 → 1.2M%
 */
export function formatPercent(num: number, decimals: number = 1): string {
  if (num === null || num === undefined || isNaN(num)) return '0%';
  
  const absNum = Math.abs(num);
  
  // Under 1000%, show exact percentage
  if (absNum < 1000) {
    return num.toFixed(decimals) + '%';
  }
  
  // Use number formatting for large percentages
  return formatNumber(num, decimals) + '%';
}

