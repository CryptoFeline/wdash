CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL,
    chain TEXT NOT NULL DEFAULT 'eth',
    data JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    last_synced TIMESTAMPTZ DEFAULT NOW(),
    sync_count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_wallet_per_chain UNIQUE (wallet_address, chain)
);

CREATE INDEX IF NOT EXISTS idx_wallets_wallet_address 
    ON wallets(wallet_address);

CREATE INDEX IF NOT EXISTS idx_wallets_chain 
    ON wallets(chain);

CREATE INDEX IF NOT EXISTS idx_wallets_last_synced 
    ON wallets(last_synced DESC);

CREATE INDEX IF NOT EXISTS idx_wallets_created_at 
    ON wallets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wallets_metadata_gin 
    ON wallets USING GIN(metadata);

CREATE INDEX IF NOT EXISTS idx_wallets_data_gin 
    ON wallets USING GIN(data);

CREATE INDEX IF NOT EXISTS idx_wallets_chain_synced 
    ON wallets(chain, last_synced DESC);

CREATE TABLE IF NOT EXISTS wallet_snapshots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT NOT NULL,
    chain TEXT NOT NULL DEFAULT 'eth',
    snapshot_data JSONB NOT NULL,
    metrics JSONB DEFAULT '{}'::JSONB,
    snapped_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_wallet_address 
    ON wallet_snapshots(wallet_address);

CREATE INDEX IF NOT EXISTS idx_snapshots_wallet_date 
    ON wallet_snapshots(wallet_address, snapped_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_chain 
    ON wallet_snapshots(chain);

CREATE INDEX IF NOT EXISTS idx_snapshots_snapped_at 
    ON wallet_snapshots(snapped_at DESC);

CREATE INDEX IF NOT EXISTS idx_snapshots_metrics_gin 
    ON wallet_snapshots USING GIN(metrics);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wallets are publicly readable" ON wallets
    FOR SELECT
    USING (true);

CREATE POLICY "Snapshots are publicly readable" ON wallet_snapshots
    FOR SELECT
    USING (true);

CREATE OR REPLACE VIEW latest_wallet_metrics AS
SELECT 
    wallet_address,
    chain,
    metadata->>'pnl_7d' as pnl_7d,
    metadata->>'realized_profit_7d' as realized_profit_7d,
    metadata->>'winrate_7d' as winrate_7d,
    metadata->>'token_num_7d' as token_num_7d,
    last_synced,
    created_at
FROM wallets
ORDER BY last_synced DESC;

CREATE OR REPLACE VIEW wallet_performance_trends AS
SELECT 
    wallet_address,
    chain,
    DATE(snapped_at) as date,
    COUNT(*) as snapshots_per_day,
    AVG(CAST(metrics->>'pnl_7d' AS NUMERIC)) as avg_pnl_7d,
    AVG(CAST(metrics->>'realized_profit_7d' AS NUMERIC)) as avg_profit_7d,
    MAX(CAST(metrics->>'pnl_7d' AS NUMERIC)) as max_pnl_7d,
    MIN(CAST(metrics->>'pnl_7d' AS NUMERIC)) as min_pnl_7d
FROM wallet_snapshots
WHERE snapped_at > NOW() - INTERVAL '7 days'
GROUP BY wallet_address, chain, DATE(snapped_at)
ORDER BY wallet_address, date DESC;
