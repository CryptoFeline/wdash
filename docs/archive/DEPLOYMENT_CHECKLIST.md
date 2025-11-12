# Complete Implementation & Deployment Checklist

## Phase 1: Preparation (Before Implementation)

### 1.1 Review Documentation
- [ ] Read `ARCHITECTURE_PLAN.md` - understand the three tasks
- [ ] Review `SUPABASE_SCHEMA.sql` - understand database structure
- [ ] Check `SUPABASE_SETUP.md` - Supabase setup process

### 1.2 Test SQL Schema Locally
- [ ] Install PostgreSQL locally or use Docker
- [ ] Copy `SUPABASE_SCHEMA.sql` content
- [ ] Run schema on local database
- [ ] Run test queries
- [ ] Verify all tables and indexes created
- [ ] Cleanup local test database

---

## Phase 2: Supabase Setup (15 minutes)

### 2.1 Create Supabase Project
- [ ] Go to https://supabase.com/dashboard
- [ ] Create new project named `gmgn-dashboard`
- [ ] Save database password securely
- [ ] Wait for provisioning (~2-3 minutes)

### 2.2 Deploy Schema
- [ ] Open Supabase SQL Editor
- [ ] Copy and paste SQL from `SUPABASE_SCHEMA.sql` (Schema section only)
- [ ] Run SQL
- [ ] Verify tables in Table Editor: `wallets`, `wallet_snapshots`
- [ ] Verify views created (optional)

### 2.3 Configure RLS Policies
- [ ] Open Supabase SQL Editor
- [ ] Create RLS policies (see `SUPABASE_SETUP.md` Step 4)
- [ ] Run SQL
- [ ] Verify policies in Authentication → Policies

### 2.4 Get API Keys
- [ ] Go to Settings → API
- [ ] Copy `Project URL`
- [ ] Copy `anon public key` (for frontend)
- [ ] Copy `service_role key` (for backend - keep secret!)
- [ ] Save to `docs/SUPABASE_CREDENTIALS.txt` (don't commit!)

### 2.5 Test Supabase Connection
- [ ] Insert test data via SQL Editor
- [ ] Run query to verify data exists
- [ ] Delete test data

---

## Phase 3: Backend Implementation (Task 1 + 2)

### 3.1 Backend API Security (Task 1)

**Update Routes**:
- [ ] `frontend/src/app/api/wallets/route.ts` - Add API key header
- [ ] `frontend/src/app/api/wallets/stats/route.ts` - Add API key header
- [ ] `frontend/src/app/api/chains/route.ts` - Update if needed
- [ ] `frontend/src/app/api/tags/route.ts` - Update if needed

**Update Middleware**:
- [ ] `frontend/src/middleware.ts` - Add API route protection comment

**Verify Locally**:
- [ ] Set `API_KEY` env var locally
- [ ] Run frontend: `npm run dev`
- [ ] Run backend: `npm run dev` (in backend folder)
- [ ] Test: `curl http://localhost:3000/api/wallets`
- [ ] Should work (backend running locally)
- [ ] Test: `curl http://localhost:3001/api/wallets` (no key)
- [ ] Should fail: 401 Unauthorized

### 3.2 Backend Supabase Integration (Task 2)

**Create Backend Modules**:
- [ ] Create `backend/db/supabase.js` - Supabase client + CRUD operations
- [ ] Add imports: `@supabase/supabase-js`
- [ ] Implement: `upsertWallet()`, `createSnapshot()`, `getWalletsByChain()`, etc.

**Create Sync Endpoint**:
- [ ] Create `backend/routes/sync.js` - Manual sync endpoint
- [ ] `POST /api/sync` - Sync specific wallets
- [ ] `POST /api/sync/full` - Full refresh of all wallets

**Update Helper Functions**:
- [ ] `backend/scraper/fetcher.js` - Add `extractMetadata()`, `extractMetrics()`

**Update Main Routes**:
- [ ] `backend/routes/wallets.js` - Use Supabase for loading
- [ ] Remove localStorage references (keep node-cache for backend performance)
- [ ] Add forceRefresh query parameter support

**Update Server**:
- [ ] `backend/server.js` - Add sync route: `app.use('/api/sync', syncRouter)`

**Test Locally**:
- [ ] Run backend: `npm run dev`
- [ ] Test GET /api/wallets
- [ ] Test POST /api/sync/full
- [ ] Verify data in Supabase (SQL Editor)

### 3.3 Backend Environment Variables (Render)

On Render dashboard:
- [ ] Add `SUPABASE_URL` = https://your-project.supabase.co
- [ ] Add `SUPABASE_SERVICE_KEY` = <service-role-key>
- [ ] Save (will auto-redeploy)

---

## Phase 4: Frontend Implementation (Task 2 + 3)

### 4.1 Frontend Supabase Client (Task 2)

**Create Supabase Client**:
- [ ] Create `frontend/src/lib/supabase-client.ts`
- [ ] `loadWalletsFromDB()` - Load from Supabase
- [ ] `getLastSyncTime()` - Check staleness
- [ ] `isDataStale()` - Determine if refresh needed
- [ ] `triggerBackendSync()` - Trigger backend refresh
- [ ] `waitForNewData()` - Poll for updated data

**Update Page Component**:
- [ ] Update `frontend/src/app/page.tsx` - Use new data loading pattern
- [ ] Load from Supabase on mount
- [ ] Check staleness
- [ ] Show loading indicators

**Test Locally**:
- [ ] Run frontend: `npm run dev`
- [ ] Run backend: `npm run dev`
- [ ] Go to http://localhost:3000
- [ ] Verify data loads from Supabase
- [ ] Trigger refresh
- [ ] Check backend is called

### 4.2 Frontend Analytics (Task 3)

**Create Analytics Client Functions**:
- [ ] Add to `frontend/src/lib/supabase-client.ts`:
  - [ ] `getWalletTrend()` - Wallet performance over time
  - [ ] `getTopGainers()` - Best performers
  - [ ] `getAverageMetricsTrend()` - Portfolio average trend

**Create Chart Components** (optional):
- [ ] Create `frontend/src/components/DeepDiveChart.tsx`
- [ ] `WalletTrendChart` component
- [ ] `AverageMetricsTrendChart` component

**Add to Page** (optional):
- [ ] Import and use chart components
- [ ] Show historical trends

### 4.3 Frontend Environment Variables (Netlify)

On Netlify dashboard:
- [ ] Add `API_KEY` = <from-backend>
- [ ] Add `NEXT_PUBLIC_SUPABASE_URL` = https://your-project.supabase.co
- [ ] Add `NEXT_PUBLIC_SUPABASE_ANON_KEY` = <anon-public-key>
- [ ] Save (will trigger redeploy)

---

## Phase 5: Backend Dependencies

### 5.1 Install Supabase Package
```bash
cd backend
npm install @supabase/supabase-js
```

### 5.2 Verify Installation
```bash
npm list @supabase/supabase-js
```

---

## Phase 6: Frontend Dependencies

### 6.1 Install Supabase Package
```bash
cd frontend
npm install @supabase/supabase-js
```

### 6.2 Install Chart Dependencies (for Task 3)
```bash
npm install recharts
```

### 6.3 Verify Installation
```bash
npm list @supabase/supabase-js recharts
```

---

## Phase 7: Local Testing

### 7.1 Start Backend
```bash
cd backend
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_KEY=<service-role-key>
export API_KEY=test-key-123
npm run dev
```

### 7.2 Start Frontend
```bash
cd frontend
export API_KEY=test-key-123
export NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
export NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
npm run dev
```

### 7.3 Test Workflows

**Test 1: Load from Supabase**
- [ ] Go to http://localhost:3000
- [ ] Open browser console (F12)
- [ ] Should see "Loading from database..."
- [ ] Data should load from Supabase
- [ ] Check Network tab: calls /api/wallets

**Test 2: Refresh Trigger**
- [ ] Manually trigger refresh button
- [ ] Should see "Updating..."
- [ ] Backend should fetch from GMGN
- [ ] Backend should upsert to Supabase
- [ ] Frontend should show updated data
- [ ] Check Supabase: last_synced timestamp updated

**Test 3: API Security**
```bash
# Direct backend call without key should fail
curl http://localhost:3001/api/wallets
# → 401 Unauthorized

# Frontend call should work
curl http://localhost:3000/api/wallets
# → 200 OK

# Direct backend call with key should work
curl -H "X-API-Key: test-key-123" http://localhost:3001/api/wallets
# → 200 OK
```

**Test 4: Historical Data**
- [ ] Do multiple refreshes
- [ ] Check Supabase wallet_snapshots table
- [ ] Should have multiple rows per wallet
- [ ] Each with timestamp

---

## Phase 8: Production Deployment

### 8.1 Commit Code Changes
```bash
git add .
git commit -m "feat: Add Supabase integration with API security, full JSON storage, and historical tracking"
git push origin main
```

### 8.2 Verify Netlify Deployment
- [ ] Go to https://app.netlify.com
- [ ] Select your site
- [ ] Check deployment status
- [ ] Should show recent deployment with new code
- [ ] Check build logs for errors
- [ ] Wait for "Published" status

### 8.3 Verify Render Deployment
- [ ] Go to https://dashboard.render.com
- [ ] Select backend service
- [ ] Check recent deployments
- [ ] Should show recent redeploy with new env vars
- [ ] Wait for "Live" status

### 8.4 Test Production

**Test Frontend Security**:
- [ ] Go to https://wdashboard.netlify.app
- [ ] Open browser console
- [ ] Go to Network tab
- [ ] Load page
- [ ] Check API calls go through /api/* routes
- [ ] API key should NOT be visible in Network tab
- [ ] Browser should NOT see direct backend calls

**Test Backend Security**:
- [ ] Try direct backend access (should fail or be CORS blocked)
  ```bash
  curl https://dashboard-backend-mo1j.onrender.com/api/wallets
  # → 401 Unauthorized or CORS error
  ```
- [ ] Frontend should work (has API key in env)

**Test Data Loading**:
- [ ] Go to https://wdashboard.netlify.app
- [ ] Should load data from Supabase
- [ ] Should show wallet list
- [ ] Click refresh
- [ ] Should fetch new data from backend
- [ ] Data should update in UI

**Test Historical Data**:
- [ ] Go to Supabase Dashboard
- [ ] SQL Editor
- [ ] Query wallet_snapshots table
- [ ] Should have multiple snapshots

---

## Phase 9: Cleanup

### 9.1 Remove Test Files
- [ ] Delete test credentials from local environment
- [ ] Clean up any debug logging

### 9.2 Update Documentation
- [ ] [ ] Create `DEPLOYMENT_GUIDE.md` - Step-by-step deployment
- [ ] [ ] Update `README.md` - Add Supabase architecture diagram
- [ ] [ ] Update `.env.example` files - Include Supabase variables
- [ ] [ ] Archive old documentation in `docs/archive/`

### 9.3 Commit Documentation
```bash
git add docs/
git commit -m "docs: Add comprehensive deployment and architecture guides"
git push
```

---

## Phase 10: Verification Checklist (Final)

### Security
- [ ] API key not visible in browser
- [ ] Backend API requires X-API-Key header
- [ ] Supabase service key only on backend
- [ ] Supabase anon key only for public reads

### Functionality
- [ ] Data loads from Supabase instantly
- [ ] Refresh triggers backend fetch
- [ ] Historical snapshots created on each sync
- [ ] Analytics queries work

### Performance
- [ ] Frontend loads < 2 seconds
- [ ] No network waterfall (parallel requests)
- [ ] Supabase queries use indexes

### Monitoring
- [ ] Backend logs show sync activity
- [ ] Frontend console shows load flow
- [ ] Supabase shows sync timestamps updating

---

## Troubleshooting

### "401 Unauthorized" on /api/wallets
- [ ] Check API_KEY set in Netlify env vars
- [ ] Verify frontend route adds X-API-Key header
- [ ] Check backend requireApiKey middleware working

### "Cannot GET /api/wallets" from browser
- [ ] Normal! API routes are server-side only
- [ ] Browser should call them via JavaScript
- [ ] Check Network tab for fetch requests

### No data showing in frontend
- [ ] Check Supabase has data: SQL Editor → SELECT * FROM wallets
- [ ] Check browser console for errors
- [ ] Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY set
- [ ] Check RLS policies allow public read

### Snapshot not created on sync
- [ ] Check backend calls createSnapshot()
- [ ] Check metrics extracted correctly
- [ ] Check Supabase for insert errors in logs

---

## Next Steps After Deployment

1. Monitor Render logs for sync errors
2. Monitor Netlify for frontend errors
3. Use Supabase Analytics dashboard to track usage
4. Set up Render log alerts (optional)
5. Configure automated backups (Supabase free tier includes daily backups)

---

## File Summary

**Created**:
- `frontend/src/lib/supabase-client.ts` - Supabase integration
- `frontend/src/components/DeepDiveChart.tsx` - Chart components
- `backend/db/supabase.js` - Backend Supabase module
- `backend/routes/sync.js` - Sync endpoint

**Updated**:
- `frontend/src/app/page.tsx` - Load from Supabase
- `frontend/src/app/api/wallets/route.ts` - Add API key
- `frontend/src/app/api/wallets/stats/route.ts` - Add API key
- `frontend/src/app/api/chains/route.ts` - Add API key
- `frontend/src/app/api/tags/route.ts` - Add API key
- `frontend/src/middleware.ts` - API protection comment
- `backend/routes/wallets.js` - Load from Supabase
- `backend/scraper/fetcher.js` - Add metadata/metrics extraction
- `backend/server.js` - Add sync route
- `backend/package.json` - Add @supabase/supabase-js
- `frontend/package.json` - Add @supabase/supabase-js and recharts

**Documentation**:
- `docs/ARCHITECTURE_PLAN.md` - Complete architecture
- `docs/SUPABASE_SCHEMA.sql` - Database schema with tests
- `docs/SUPABASE_SETUP.md` - Supabase setup guide
- `docs/IMPLEMENTATION_TASK_1.md` - API security
- `docs/IMPLEMENTATION_TASK_2.md` - Full JSON storage & sync
- `docs/IMPLEMENTATION_TASK_3.md` - Historical tracking & analytics

---

## Estimated Time

- Phase 1 (Prep): 30 minutes
- Phase 2 (Supabase): 15 minutes
- Phase 3 (Backend): 1 hour
- Phase 4 (Frontend): 1 hour
- Phase 5-6 (Dependencies): 10 minutes
- Phase 7 (Testing): 30 minutes
- Phase 8 (Deploy): 20 minutes
- Phase 9-10 (Cleanup): 20 minutes

**Total: ~4-5 hours** for complete implementation and deployment

