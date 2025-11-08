// Shared TypeScript types for GMGN.ai wallet data

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
  // Identification
  wallet_address: string;
  address: string;
  ens: string | null;
  name: string | null;
  nickname: string | null;
  avatar: string | null;
  maker_avatar_color: string;

  // Profit metrics
  realized_profit: number;
  realized_profit_1d: number;
  realized_profit_7d: number;
  realized_profit_30d: number;
  pnl_1d: number | null;
  pnl_7d: number;
  pnl_30d: number;

  // Trading activity
  buy: number;
  sell: number;
  txs: number;
  txs_30d: number;
  buy_30d: number;
  sell_30d: number;
  last_active: number;

  // Performance metrics
  winrate_7d: number;
  avg_cost_7d: number;
  avg_hold_time: number;
  avg_holding_period_7d: number;
  token_num_7d: number;
  recent_buy_tokens: string[];

  // PnL distribution
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

  // Daily breakdown
  daily_profit_7d: DailyProfit[];

  // Risk
  risk: RiskMetrics;

  // Balance
  balance: number;
  eth_balance: number;
  sol_balance: number;
  trx_balance: number;

  // Tags & classification
  tag: string;
  tags: string[];
  tag_rank: TagRank;

  // Social
  follow_count: number;
  remark_count: number;
  twitter_username: string | null;
  twitter_name: string | null;
  twitter_description: string | null;
  followers_count: number;
  is_blue_verified: boolean;
  twitch_channel_name: string | null;
}

export interface ApiResponse {
  code: number;
  msg: string;
  data: {
    rank: Wallet[];
  };
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
