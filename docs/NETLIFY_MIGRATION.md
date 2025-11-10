# Netlify Serverless Migration Summary

## What We Did

Migrated from **Express backend on Render/Railway** → **Netlify Serverless Functions**

### Architecture Change

**Before:**
```
Frontend (Netlify) → API calls → Backend (Render/Railway) → Puppeteer scraping
```

**After:**
```
Frontend (Netlify) → Netlify Functions (same server) → Puppeteer scraping
```

### Key Benefits

1. **No external backend needed** - Everything on Netlify
2. **No build timeouts** - Netlify has optimized Chromium layers
3. **Faster response** - Functions run on same CDN edge as frontend
4. **Simpler deployment** - One repo, one platform
5. **Free tier** - 125k function invocations/month

## Files Created

### 1. Scraper Module (TypeScript)
- `frontend/lib/scraper/solver-turnstile.ts` - Cloudflare Turnstile solver with stealth plugin
- Uses `@sparticuz/chromium-min` (optimized for serverless, ~30MB vs 300MB full Chromium)
- Exact same configuration as local 95% success test

### 2. Netlify Function
- `frontend/netlify/functions/test-stealth.ts` - Test endpoint
- Endpoint: `GET /api/test-stealth`
- Returns: success, duration, walletsFound, logs

### 3. Configuration
- Updated `frontend/package.json` with dependencies:
  - `@netlify/functions`
  - `@sparticuz/chromium-min`
  - `puppeteer-core`
  - `puppeteer-extra`
  - `puppeteer-extra-plugin-stealth`

- Updated `netlify.toml`:
  - Functions directory: `netlify/functions`
  - Node bundler: `esbuild`
  - Included files for function access

### 4. Test Script
- `test-netlify-function.sh` - Automated test script
- Tests deployed function endpoint
- Shows success rate, duration, wallets found

## Testing Instructions

### Wait for Netlify Build

1. Check build status: https://app.netlify.com/sites/gmgn-dashboard/deploys
2. Look for latest deploy (commit c4a1485)
3. Wait for "Published" status (~2-3 minutes)

### Run Test

Once deployed, run:

```bash
./test-netlify-function.sh
```

**Expected Output:**
- HTTP 200 OK
- Success: true
- Wallets Found: 200
- Duration: 50-90s

### Success Criteria

✅ **Pass**: walletsFound >= 100, success = true
⚠️  **Partial**: walletsFound > 0 but < 100 (retry needed)
❌ **Fail**: walletsFound = 0 or error

## What's Different from Backend Version

| Feature | Backend (Render/Railway) | Netlify Functions |
|---------|-------------------------|-------------------|
| Chromium | @sparticuz/chromium (~50MB) | @sparticuz/chromium-min (~30MB) |
| Language | JavaScript (ES modules) | TypeScript |
| Timeout | 10-15 min build, 60s function | No build timeout, 26s function* |
| Success Rate | 50% (datacenter IP) | Expected 50% (same IPs) |
| Cost | Free (but build fails) | Free tier (125k calls/mo) |

*Note: Netlify Functions have 26s timeout on free tier. We may need to upgrade to Pro ($19/mo) for 300s timeout if stealth solver takes >26s.

## Next Steps

### If Test Passes (50%+ success):

1. Migrate remaining routes to Netlify Functions:
   - `wallets.ts` - Main wallet data endpoint
   - `chains.ts` - Available chains
   - `tags.ts` - Wallet tags
   - `stats.ts` - Dashboard statistics

2. Update frontend API calls to use Netlify Functions:
   - Change from `process.env.API_URL` to relative paths `/api/*`
   - Remove API_KEY requirement (same-origin requests)

3. Enable prefetch/caching in Functions:
   - Port cache.js to TypeScript
   - Add background warming on function cold starts

4. Decommission old backend:
   - Delete backend/ folder
   - Remove Render deployment
   - Remove Railway deployment
   - Clean up nixpacks.toml, render-build.sh, render.yaml

### If Test Fails:

1. Check Netlify function logs for errors
2. Verify @sparticuz/chromium-min compatibility
3. Consider alternatives:
   - Netlify Pro ($19/mo) for 300s timeout
   - AWS Lambda with custom Chromium layer
   - ScraperAPI ($49/mo) - professional solution

## Chromium Version Comparison

| Package | Size | Platform | Speed |
|---------|------|----------|-------|
| Full Puppeteer | ~300MB | Any | 95% (local residential IP) |
| @sparticuz/chromium | ~50MB | Serverless | 50% (datacenter IP) |
| @sparticuz/chromium-min | ~30MB | Serverless | Expected 50% (datacenter IP) |

**Note**: Success rate depends more on IP reputation than Chromium version. Datacenter IPs (used by Render/Railway/Netlify) are flagged by Cloudflare more than residential IPs.

## Current Status

- ✅ Code migrated to Netlify Functions
- ✅ Dependencies installed
- ✅ Pushed to GitHub (commit c4a1485)
- ⏳ Netlify building...
- ⏳ Test pending

## Rollback Plan

If Netlify Functions don't work:

```bash
# Revert to backend approach
git revert c4a1485

# Or just don't delete backend folder yet
# Keep both approaches until Netlify proven
```

## Repository State

**Active:**
- frontend/ - Next.js + Netlify Functions
- backend/ - Express backend (keep until Netlify proven)
- test/ - Local test scripts with 95% success

**Deprecated (once Netlify works):**
- nixpacks.toml - Railway config
- render-build.sh - Render build script
- render.yaml - Render infrastructure config

**Deployment URLs:**
- Frontend: https://gmgn-dashboard.netlify.app
- Backend (old): https://dashboard-backend-mo1j.onrender.com
- Railway (old): [building/failing]

---

**Last Updated**: Nov 10, 2025 22:40 UTC
**Commit**: c4a1485
**Status**: Waiting for Netlify deployment
