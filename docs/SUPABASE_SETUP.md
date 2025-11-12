# Supabase Setup Guide: Step-by-Step

## Overview
This guide walks you through creating a Supabase project and deploying your database schema.

**Time required**: ~15 minutes
**Cost**: FREE tier (500MB storage, 500MB bandwidth)

---

## Step 1: Create Supabase Account & Project

### 1.1 Create Account
1. Go to https://supabase.com/dashboard
2. Sign up with:
   - GitHub account (recommended - auto-linked)
   - Email
   - Google
3. Verify email

### 1.2 Create Project
1. Click "New Project"
2. Fill in project details:
   - **Organization**: Create new or select existing
   - **Project Name**: `gmgn-dashboard`
   - **Database Password**: Save this securely! (you'll need it)
     - Example: Generate strong password: `Px8#kL2@9mQ$vW5xR`
   - **Region**: 
     - If US-based users: US East (us-east-1)
     - If EU-based: Europe (eu-west-1)
     - If Asia-based: Singapore (ap-southeast-1)
   - **Pricing Plan**: Free
3. Click "Create new project"

### 1.3 Wait for Provisioning
- Takes ~2-3 minutes
- You'll see a progress screen
- Keep the tab open
- Once ready, you'll see the project dashboard

---

## Step 2: Verify Schema (Test Locally First)

Before running schema on Supabase, test locally to ensure SQL is correct.

### 2.1 Option A: Local PostgreSQL (macOS)

```bash
# Install PostgreSQL (if not already installed)
brew install postgresql@15

# Start PostgreSQL
brew services start postgresql@15

# Create test database
createdb gmgn_test

# Connect and run schema
psql gmgn_test << 'EOF'
-- Paste entire SUPABASE_SCHEMA.sql content here
EOF
```

### 2.2 Option B: Docker PostgreSQL

```bash
# Start PostgreSQL in Docker
docker run --name gmgn-postgres \
  -e POSTGRES_PASSWORD=test123 \
  -e POSTGRES_DB=gmgn_test \
  -p 5432:5432 \
  -d postgres:15

# Wait for startup
sleep 5

# Connect and test
psql -h localhost -U postgres -W -d gmgn_test

# Inside psql, paste schema SQL
```

### 2.3 Run Test Queries

Once connected to your local database:

```sql
-- Test insert
INSERT INTO wallets (wallet_address, chain, data, metadata) 
VALUES (
  'test_wallet_001',
  'eth',
  '{"wallet_address": "test_wallet_001", "pnl_7d": 0.5}'::JSONB,
  '{"pnl_7d": 0.5}'::JSONB
);

-- Test select
SELECT wallet_address, chain FROM wallets;
-- Should return: test_wallet_001 | eth

-- Test upsert
INSERT INTO wallets (wallet_address, chain, data, metadata)
VALUES (
  'test_wallet_001',
  'eth',
  '{"wallet_address": "test_wallet_001", "pnl_7d": 0.75}'::JSONB,
  '{"pnl_7d": 0.75}'::JSONB
)
ON CONFLICT (wallet_address, chain) DO UPDATE SET
  data = EXCLUDED.data,
  metadata = EXCLUDED.metadata,
  sync_count = sync_count + 1;

-- Verify update
SELECT wallet_address, sync_count FROM wallets WHERE wallet_address = 'test_wallet_001';
-- Should return: test_wallet_001 | 2

-- Clean up
DROP TABLE IF EXISTS wallet_snapshots CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
```

✅ **If all tests pass**, proceed to Step 3

❌ **If tests fail**, check:
- PostgreSQL version (should be 14+)
- Schema file syntax
- UUID extension available

---

## Step 3: Deploy Schema to Supabase

### 3.1 Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your `gmgn-dashboard` project
3. Left sidebar → **SQL Editor**
4. Click "New Query"

### 3.2 Copy Schema SQL

1. Open file: `docs/SUPABASE_SCHEMA.sql`
2. Copy the entire **SQL Schema** section (from "Enable Required Extensions" to the last index creation)
3. **DO NOT** copy the Testing/Verification sections

### 3.3 Paste and Run SQL

1. In Supabase SQL Editor, paste the SQL
2. Click "Run" (or Cmd+Enter)
3. Wait for completion (should show ✅ "Success")

### 3.4 Verify Tables Created

1. Left sidebar → **Table Editor**
2. You should see:
   - `wallets` table
   - `wallet_snapshots` table
3. Click each table to verify columns

---

## Step 4: Configure Row Level Security (RLS)

### 4.1 Enable RLS and Create Policies

1. Go to **SQL Editor**
2. Click "New Query"
3. Paste this SQL:

```sql
-- Enable RLS
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_snapshots ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can SELECT)
CREATE POLICY "Wallets are publicly readable" ON wallets
  FOR SELECT
  USING (true);

CREATE POLICY "Snapshots are publicly readable" ON wallet_snapshots
  FOR SELECT
  USING (true);
```

4. Click "Run"

### 4.2 Verify RLS Policies

1. Go to **Authentication** → **Policies** in left sidebar
2. Select `wallets` table
3. You should see:
   - `Wallets are publicly readable` (SELECT policy)

---

## Step 5: Get API Keys

### 5.1 Find Your Keys

1. Left sidebar → **Settings** → **API**
2. You'll see:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: (starts with `eyJ...`)
   - **service_role key**: (starts with `eyJ...`) - **KEEP SECRET**

### 5.2 Save Keys

Create a file `docs/SUPABASE_CREDENTIALS.txt`:

```
=== SUPABASE CREDENTIALS ===

Project URL: https://your-project-id.supabase.co
Project ID: your-project-id

Anon Public Key (safe to share):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Service Role Key (KEEP SECRET):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

Database Password:
Px8#kL2@9mQ$vW5xR

DO NOT commit this file to git!
```

⚠️ **IMPORTANT**: Never commit service role key to git!

---

## Step 6: Test Supabase Connection

### 6.1 Test Insert Data

In Supabase SQL Editor:

```sql
INSERT INTO wallets (wallet_address, chain, data, metadata) 
VALUES (
  'test_wallet_ethereum_1',
  'eth',
  '{"wallet_address": "test_wallet_ethereum_1", "pnl_7d": 0.5, "realized_profit_7d": 12345.67}'::JSONB,
  '{"pnl_7d": 0.5, "realized_profit_7d": 12345.67, "winrate_7d": 0.65}'::JSONB
);

INSERT INTO wallets (wallet_address, chain, data, metadata) 
VALUES (
  'test_wallet_solana_1',
  'sol',
  '{"wallet_address": "test_wallet_solana_1", "pnl_7d": 2.5, "realized_profit_7d": 45678.90}'::JSONB,
  '{"pnl_7d": 2.5, "realized_profit_7d": 45678.90, "winrate_7d": 0.78}'::JSONB
);
```

### 6.2 Test Query

```sql
SELECT 
  wallet_address,
  chain,
  metadata->>'pnl_7d' as pnl_7d,
  last_synced
FROM wallets
ORDER BY created_at DESC;
```

Expected output:
```
wallet_address           | chain | pnl_7d | last_synced
-------------------------|-------|--------|------------------------
test_wallet_solana_1     | sol   | 2.5    | 2025-11-12 14:22:15...
test_wallet_ethereum_1   | eth   | 0.5    | 2025-11-12 14:22:10...
```

### 6.3 Test Snapshots

```sql
INSERT INTO wallet_snapshots (wallet_address, chain, snapshot_data, metrics)
VALUES (
  'test_wallet_ethereum_1',
  'eth',
  '{"wallet_address": "test_wallet_ethereum_1", "pnl_7d": 0.48}'::JSONB,
  '{"pnl_7d": 0.48, "realized_profit_7d": 12000.00}'::JSONB
);

SELECT 
  wallet_address,
  snapped_at,
  metrics->>'pnl_7d' as pnl_7d
FROM wallet_snapshots
ORDER BY snapped_at DESC;
```

---

## Step 7: Configure Environment Variables

### 7.1 Backend Environment (Render)

1. Go to https://dashboard.render.com
2. Select your backend service
3. Go to **Environment** tab
4. Add new variables:

```
SUPABASE_URL = https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY = <paste service role key>
```

5. Click "Save" (will auto-redeploy)

### 7.2 Frontend Environment (Netlify)

1. Go to https://app.netlify.com
2. Select your site
3. Go to **Site settings** → **Build & deploy** → **Environment**
4. Add new variables:

```
NEXT_PUBLIC_SUPABASE_URL = https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = <paste anon public key>
```

5. Click "Save"
6. Manually trigger deploy (or push to git)

---

## Step 8: Verify Security

### 8.1 Test Public Read Access (RLS Working)

Open browser console and run:

```javascript
// This should work (public read)
const response = await fetch(
  'https://your-project-id.supabase.co/rest/v1/wallets?select=*',
  {
    headers: {
      'apikey': '<anon-public-key>',
      'Content-Type': 'application/json'
    }
  }
);
const data = await response.json();
console.log(data); // Should return wallets
```

### 8.2 Test Service Role (Backend Only)

Service role key should only be used on backend - never in browser.

---

## Troubleshooting

### "Connection refused" error

- Supabase still provisioning (wait 5 min)
- Check project status in dashboard
- Verify internet connection

### "Invalid API key" error

- Check you copied key correctly
- No extra spaces at start/end
- Service role key ≠ anon key (don't mix them)

### "RLS policy error" when inserting

- Check you're using service role key (not anon)
- Service role bypasses RLS

### "Table doesn't exist"

- Verify schema ran without errors
- Check Table Editor shows table
- May need to refresh page

### Can't see data in Table Editor

- Check table has data: `SELECT COUNT(*) FROM wallets;`
- May need to refresh page
- Check data isn't in wrong schema

---

## Next Steps

Once verified:

1. ✅ Schema deployed and tested
2. ✅ RLS policies configured
3. ✅ API keys saved securely
4. ✅ Environment variables set
5. → Proceed to **Backend Integration** (docs/IMPLEMENTATION_TASK_1.md)

---

## Cleanup (if restarting)

To delete tables and start over:

1. Go to **SQL Editor**
2. Run:

```sql
DROP VIEW IF EXISTS wallet_performance_trends CASCADE;
DROP VIEW IF EXISTS latest_wallet_metrics CASCADE;
DROP TABLE IF EXISTS wallet_snapshots CASCADE;
DROP TABLE IF EXISTS wallets CASCADE;
```

