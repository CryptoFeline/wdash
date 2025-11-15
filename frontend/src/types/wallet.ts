// Copy shared types from backend
export interface DailyProfit {
  timestamp: number;
  profit: number;
}

export interface RiskMetrics {
  token_active: string;
  token_honeypot: string;
  token_honeypot_ratio: number;
  no_buy_hold: string;
  no_buy_hold_ratio: number;
  sell_pass_buy: string;
  sell_pass_buy_ratio: number;
  fast_tx: string;
  fast_tx_ratio: number;
}

export interface TagRank {
  [tag: string]: number;
}

export interface Wallet {
  wallet_address: string;
  address: string;
  ens: string | null;
  name: string | null;
  nickname: string | null;
  avatar: string | null;
  maker_avatar_color: string;
  realized_profit: number;
  realized_profit_1d: number;
  realized_profit_7d: number;
  realized_profit_30d: number;
  pnl_1d: number | null;
  pnl_7d: number;
  pnl_30d: number;
  buy: number;
  sell: number;
  txs: number;
  txs_30d: number;
  buy_30d: number;
  sell_30d: number;
  last_active: number;
  winrate_7d: number;
  avg_cost_7d: number;
  avg_hold_time: number;
  avg_holding_period_7d: number;
  token_num_7d: number;
  recent_buy_tokens: string[];
  pnl_lt_minus_dot5_num_7d: number;
  pnl_minus_dot5_0x_num_7d: number;
  pnl_lt_2x_num_7d: number;
  pnl_2x_5x_num_7d: number;
  pnl_gt_5x_num_7d: number;
  pnl_lt_minus_dot5_num_7d_ratio: number;
  pnl_minus_dot5_0x_num_7d_ratio: number;
  pnl_lt_2x_num_7d_ratio: number;
  pnl_2x_5x_num_7d_ratio: number;
  pnl_gt_5x_num_7d_ratio: number;
  daily_profit_7d: DailyProfit[];
  risk: RiskMetrics;
  balance: number;
  eth_balance: number;
  sol_balance: number;
  trx_balance: number;
  tag: string;
  tags: string[];
  tag_rank: TagRank;
  follow_count: number;
  remark_count: number;
  twitter_username: string | null;
  twitter_name: string | null;
  twitter_description: string | null;
  followers_count: number;
  is_blue_verified: boolean;
  twitch_channel_name: string | null;
  score?: number;
}

export interface PaginatedResponse {
  data: Wallet[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface StatsResponse {
  totalWallets: number;
  averagePnL: number;
  averageProfit: number;
  totalProfit: number;
  topPerformer: Wallet | null;
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

// Wallet Analysis Types (from TARGET_ANALYSIS.md)

export interface ReconstructedTrade {
  trade_id: string;                    // Unique identifier
  token_address: string;
  token_symbol: string;
  token_name: string;
  logoUrl: string;
  
  entry_timestamp: number;             // Unix ms
  exit_timestamp: number;              // Unix ms
  entry_price: number;                 // USD
  exit_price: number;                  // USD
  quantity: number;
  
  entry_value: number;                 // price * qty
  exit_value: number;                  // price * qty
  realized_pnl: number;                // USD
  realized_roi: number;                // % (e.g., 25.5)
  holding_seconds: number;
  holding_hours: number;               // Computed: seconds / 3600
  holding_days: number;                // Computed: seconds / 86400
  
  max_price_during_hold: number;       // Highest price in window
  max_potential_roi: number;           // % (e.g., 45.5)
  time_to_peak_seconds: number;        // Seconds to max price
  time_to_peak_hours: number;          // Computed
  
  win: boolean;                        // realized_pnl > 0
  early_exit: boolean;                 // realized_roi < max_potential_roi * 0.8
  
  mcap_bracket: number;                // 0-4 (from summary.mcapTxsBuyList)
  riskLevel: number;                   // 1-5 from tokenData
}

export interface WalletAnalysisMetrics {
  total_trades: number;
  win_count: number;
  loss_count: number;
  win_rate: number;                    // % (e.g., 73.5)
  
  total_realized_pnl: number;          // USD
  avg_realized_roi: number;            // % (e.g., 12.3)
  median_realized_roi: number;         // % (more robust)
  
  total_realized_pnl_wins: number;     // Sum of winning trades
  total_realized_pnl_losses: number;   // Sum of losing trades
  
  avg_holding_hours: number;           // All trades
  median_holding_hours: number;
  avg_holding_hours_winners: number;
  avg_holding_hours_losers: number;
  
  median_max_potential_roi: number;    // % - Shows entry skill
  
  entry_skill_score: number;           // 0-100 based on early entries
  exit_skill_score: number;            // 0-100 based on exit timing
  overall_skill_score: number;         // Composite
  
  copy_trade_rating: string;           // "Excellent" | "Good" | "Fair" | "Poor"
  
  market_cap_strategy: {
    favorite_bracket: number;          // 0-4
    success_by_bracket: Array<{
      bracket: string;                 // "<$100k", etc.
      win_rate: number;
      avg_roi: number;
      trade_count: number;
    }>;
  };
}
