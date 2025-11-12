# Quick Reference: Commands & File Changes

## 📋 Environment Variables Checklist

### Supabase Credentials (Save Securely)
```
Project URL: https://your-project-id.supabase.co
Anon Key: eyJhbGci...
Service Role Key: eyJhbGci...
```

**Store in**: `docs/SUPABASE_CREDENTIALS.txt` (don't commit!)

---

## 🔧 Backend Changes Summary

### New Files to Create
```
backend/db/supabase.js
backend/routes/sync.js
```

### Files to Update
```
backend/routes/wallets.js        - Load from Supabase
backend/scraper/fetcher.js       - Add extractMetadata(), extractMetrics()
backend/server.js                - Add sync route import
backend/package.json             - Add @supabase/supabase-js
```

### Environment Variables (Render)
```
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=<service-role-key>
```

---

## 🎨 Frontend Changes Summary

### New Files to Create
```
frontend/src/lib/supabase-client.ts
frontend/src/components/DeepDiveChart.tsx
```

### Files to Update
```
frontend/src/app/api/wallets/route.ts           - Add X-API-Key header
frontend/src/app/api/wallets/stats/route.ts     - Add X-API-Key header
frontend/src/app/api/chains/route.ts            - Update if needed
frontend/src/app/api/tags/route.ts              - Update if needed
frontend/src/app/page.tsx                       - Load from Supabase
frontend/src/middleware.ts                      - Add comment about security
frontend/package.json                           - Add @supabase/supabase-js, recharts
```

### Environment Variables (Netlify)
```
API_KEY=<from-backend>
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

---

## 🗄️ Database Setup Commands

### Local PostgreSQL Test
```bash
# Install (macOS)
brew install postgresql@15
brew services start postgresql@15

# Create test database
createdb gmgn_test

# Run schema
psql gmgn_test < docs/SUPABASE_SCHEMA.sql

# Test queries
psql gmgn_test

# In psql:
SELECT COUNT(*) FROM wallets;
SELECT * FROM pg_indexes WHERE tablename IN ('wallets', 'wallet_snapshots');
\q
```

### Docker PostgreSQL Test
```bash
docker run --name gmgn-postgres \
  -e POSTGRES_PASSWORD=test123 \
  -e POSTGRES_DB=gmgn_test \
  -p 5432:5432 \
  -d postgres:15

psql -h localhost -U postgres -W -d gmgn_test < docs/SUPABASE_SCHEMA.sql
```

---

## 📦 NPM Package Installation

### Backend
```bash
cd backend
npm install @supabase/supabase-js
```

### Frontend
```bash
cd frontend
npm install @supabase/supabase-js recharts
```

---

## 🏃 Local Development Commands

### Start Backend
```bash
cd backend
export API_KEY=test-key-123
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=<service-role-key>
npm run dev
# Runs on http://localhost:3001
```

### Start Frontend
```bash
cd frontend
export API_KEY=test-key-123
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
npm run dev
# Runs on http://localhost:3000
```

---

## 🧪 Testing Commands

### Test API Security
```bash
# Should fail (no API key)
curl http://localhost:3001/api/wallets
# → 401 Unauthorized

# Should work (frontend server has key)
curl http://localhost:3000/api/wallets
# → 200 OK

# Should work (with API key)
curl -H "X-API-Key: test-key-123" http://localhost:3001/api/wallets
# → 200 OK
```

### Test Supabase Connection
```bash
# From psql or Supabase SQL Editor:

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Insert test data
INSERT INTO wallets (wallet_address, chain, data, metadata)
VALUES (
  'test_wallet_001',
  'eth',
  '{"wallet_address": "test_wallet_001", "pnl_7d": 0.5}'::JSONB,
  '{"pnl_7d": 0.5}'::JSONB
);

-- Query data
SELECT wallet_address, chain, data->>'pnl_7d' as pnl FROM wallets;

-- Check indexes
SELECT indexname FROM pg_indexes WHERE tablename = 'wallets';
```

### Test Sync Endpoint
```bash
curl -X POST http://localhost:3001/api/sync/full \
  -H "Content-Type: application/json" \
  -H "X-API-Key: test-key-123" \
  -d '{"chain": "eth", "timeframe": "7d", "tag": "all"}'
```

---

## 📡 API Endpoints Reference

### Frontend Routes (Netlify)
```
GET  /api/wallets           → Load wallets
GET  /api/wallets/stats     → Load statistics
GET  /api/chains            → Load available chains
GET  /api/tags              → Load available tags
POST /api/sync              → Trigger sync
```

### Backend Routes (Render)
```
GET  /api/wallets           → Get wallets from cache/DB
GET  /api/wallets/stats     → Get statistics
GET  /api/health            → Health check
GET  /api/chains            → Get chains
GET  /api/tags              → Get tags
POST /api/sync              → Sync specific wallets
POST /api/sync/full         → Full refresh
```

---

## 🔍 Supabase SQL Queries

### View All Wallets
```sql
SELECT wallet_address, chain, last_synced 
FROM wallets
ORDER BY last_synced DESC;
```

### Check Snapshots
```sql
SELECT wallet_address, snapped_at, metrics->>'pnl_7d' as pnl
FROM wallet_snapshots
WHERE wallet_address = 'wallet_address_here'
ORDER BY snapped_at DESC
LIMIT 10;
```

### Check Indexes
```sql
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('wallets', 'wallet_snapshots')
ORDER BY indexname;
```

### Count Records
```sql
SELECT 
  (SELECT COUNT(*) FROM wallets) as wallet_count,
  (SELECT COUNT(*) FROM wallet_snapshots) as snapshot_count;
```

---

## 🚀 Deployment Commands

### Git Operations
```bash
# Commit changes
git add .
git commit -m "feat: Add Supabase integration, API security, and historical tracking"
git push origin main

# View status
git status
git log --oneline -5
```

### Netlify Deployment
```bash
# Manual redeploy
# Go to: https://app.netlify.com → Select site → Deploys → Trigger deploy

# Or via CLI:
npm install -g netlify-cli
netlify deploy --prod
```

### Render Deployment
```bash
# Set env vars via dashboard
# Services → Backend service → Environment → Add variables → Save
# Auto-redeploys when env vars change
```

---

## 📊 Key Metrics to Monitor

### Backend Performance
```
- Sync duration (should be < 60s)
- API response time (should be < 500ms)
- Error rate in logs
- Render uptime
```

### Frontend Performance
```
- Page load time (should be < 2s)
- Data load time (should be < 1s)
- No 401 errors
- No 403 errors
```

### Supabase Usage
```
- Database size (free tier: 500MB)
- Active connections
- Query performance
- RLS policy effectiveness
```

---

## 🆘 Debugging Checklist

**Frontend not loading data?**
- [ ] Check NEXT_PUBLIC_SUPABASE_URL set
- [ ] Check NEXT_PUBLIC_SUPABASE_ANON_KEY set
- [ ] Check browser console for errors
- [ ] Check Network tab for failed requests
- [ ] Verify Supabase has data (SQL Editor)

**API returning 401?**
- [ ] Check API_KEY set in Netlify env
- [ ] Check route handler adds X-API-Key header
- [ ] Check backend has matching API_KEY

**Sync not creating snapshots?**
- [ ] Check backend calls createSnapshot()
- [ ] Check Supabase wallet_snapshots table
- [ ] Check backend logs for errors

**Render backend not responding?**
- [ ] May be asleep (normal on free tier)
- [ ] Check Render dashboard for logs
- [ ] Manual redeploy: Settings → Manual Deploy

**Supabase RLS errors?**
- [ ] Check policies exist in Authentication → Policies
- [ ] Check policy allows public read
- [ ] Service role key bypasses RLS (use for backend)

---

## 📝 File Locations

```
docs/
├── ARCHITECTURE_PLAN.md          ← Overview of all three tasks
├── SUPABASE_SCHEMA.sql           ← Database schema
├── SUPABASE_SETUP.md             ← Step-by-step Supabase setup
├── IMPLEMENTATION_TASK_1.md      ← Task 1: API security
├── IMPLEMENTATION_TASK_2.md      ← Task 2: Supabase sync
├── IMPLEMENTATION_TASK_3.md      ← Task 3: Historical tracking
├── DEPLOYMENT_CHECKLIST.md       ← 10-phase implementation guide
├── IMPLEMENTATION_SUMMARY.md     ← This quick overview
└── SUPABASE_CREDENTIALS.txt      ← (Local, don't commit!)

backend/
├── db/
│   └── supabase.js               ← NEW: Supabase client
├── routes/
│   ├── sync.js                   ← NEW: Sync endpoint
│   └── wallets.js                ← UPDATE: Load from Supabase
├── scraper/
│   └── fetcher.js                ← UPDATE: Add extractMetadata()
├── server.js                      ← UPDATE: Add sync route
└── package.json                   ← UPDATE: Add @supabase/supabase-js

frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── wallets/
│   │   │   │   ├── route.ts      ← UPDATE: Add API key
│   │   │   │   └── stats/
│   │   │   │       └── route.ts  ← UPDATE: Add API key
│   │   │   ├── chains/
│   │   │   │   └── route.ts      ← UPDATE: if needed
│   │   │   └── tags/
│   │   │       └── route.ts      ← UPDATE: if needed
│   │   ├── page.tsx              ← UPDATE: Load from Supabase
│   │   └── middleware.ts          ← UPDATE: Add comment
│   ├── lib/
│   │   └── supabase-client.ts    ← NEW: Supabase client
│   └── components/
│       └── DeepDiveChart.tsx     ← NEW: Chart components
└── package.json                   ← UPDATE: Add packages
```

---

## ✅ Pre-Deployment Checklist

```bash
# Backend
[ ] SUPABASE_URL set in Render env
[ ] SUPABASE_SERVICE_KEY set in Render env
[ ] @supabase/supabase-js installed
[ ] db/supabase.js created
[ ] routes/sync.js created
[ ] routes/wallets.js updated
[ ] server.js updated with sync route

# Frontend
[ ] NEXT_PUBLIC_SUPABASE_URL set in Netlify env
[ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set in Netlify env
[ ] API_KEY set in Netlify env
[ ] @supabase/supabase-js installed
[ ] recharts installed (for charts)
[ ] supabase-client.ts created
[ ] Route handlers updated with X-API-Key
[ ] page.tsx updated to load from Supabase

# Supabase
[ ] Project created
[ ] Schema deployed
[ ] RLS policies created
[ ] API keys saved

# Code
[ ] All files created
[ ] All files updated
[ ] No TypeScript errors
[ ] No linting errors
[ ] Tests pass locally
[ ] Git committed
```

---

## 🎯 Success Criteria

✅ **Task 1 Complete**: Can't access `/api/wallets` without browser auth
✅ **Task 2 Complete**: Data loads from Supabase in < 1 second
✅ **Task 2 Complete**: Refresh trigger syncs new data from GMGN
✅ **Task 3 Complete**: Snapshots created automatically on sync
✅ **Task 3 Complete**: Can query wallet trends using analytics functions

---

## 💾 Backup Before Starting

```bash
# Current state (before implementation)
git branch -b pre-supabase-backup

# If something goes wrong:
git checkout pre-supabase-backup
```

---

## 📞 Key Contacts

- **Supabase Issues**: https://supabase.com/docs or Discord
- **Render Issues**: https://render.com/docs
- **Netlify Issues**: https://docs.netlify.com
- **TypeScript Issues**: https://www.typescriptlang.org/docs

