# Browserless.io Architecture Plan

## Overview

Replace the current Puppeteer + @sparticuz/chromium approach with **Browserless.io `/unblock` REST API**, eliminating local browser automation while achieving 95%+ success rates with residential proxies.

---

## Current Architecture (Before)

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Netlify)                      │
│  Next.js App → /api/wallets route → Proxy to Backend        │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS (API_KEY auth)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Render)                         │
│  Express.js → routes/wallets.js → fetcher.js                │
│                          ↓                                    │
│  Puppeteer-core + @sparticuz/chromium (~50MB)                │
│  + puppeteer-extra-plugin-stealth                            │
│                          ↓                                    │
│  1. Launch browser (15-30s startup)                          │
│  2. Navigate to gmgn.ai                                      │
│  3. Wait 8s for Cloudflare                                   │
│  4. page.evaluate(fetch API)                                 │
│  5. Close browser                                            │
│                          ↓                                    │
│  Cache results (5 min TTL)                                   │
└─────────────────────────────────────────────────────────────┘

Problems:
- 50% success rate (datacenter IP gets blocked by Cloudflare)
- 60-90s per request (browser startup + Cloudflare wait)
- 50MB Chromium binary on serverless
- Complex puppeteer-extra bundling
- ETXTBSY errors with concurrent requests
```

---

## New Architecture (Browserless.io)

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND (Netlify)                      │
│  Next.js App → /api/wallets route → Proxy to Backend        │
│  (No changes needed, same API interface)                     │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS (API_KEY auth)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (Render)                         │
│  Express.js → routes/wallets.js → fetcher.js                │
│                          ↓                                    │
│  NEW: solver-browserless.js (lightweight HTTP client)        │
│                          ↓                                    │
│  POST https://production-sfo.browserless.io/unblock          │
│  ?token=BROWSERLESS_API_TOKEN&proxy=residential              │
│                                                               │
│  Request Body:                                               │
│  {                                                            │
│    "url": "https://gmgn.ai/defi/quotation/v1/rank/...",     │
│    "content": true,          // Get HTML response            │
│    "cookies": false,         // Don't need cookies           │
│    "screenshot": false,      // Don't need screenshot        │
│    "browserWSEndpoint": false, // Don't need WebSocket       │
│    "ttl": 0,                 // Don't keep browser alive     │
│    "waitForTimeout": 8000,   // Wait for Cloudflare          │
│    "gotoOptions": {                                           │
│      "waitUntil": "networkidle2"                             │
│    }                                                          │
│  }                                                            │
│                          ↓                                    │
│  Response (JSON):                                            │
│  {                                                            │
│    "content": "{\"code\":0,\"msg\":\"success\",\"data\":...}", │
│    "cookies": [],                                            │
│    "screenshot": null,                                       │
│    "browserWSEndpoint": null                                 │
│  }                                                            │
│                          ↓                                    │
│  Parse response.content as JSON                              │
│  Cache results (5 min TTL)                                   │
└─────────────────────────────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│              Browserless.io Cloud Infrastructure             │
│                                                               │
│  - Managed browser pool (Chrome with stealth)                │
│  - Residential proxy rotation (6 units/MB)                   │
│  - Built-in Cloudflare bypass                                │
│  - Auto CAPTCHA solving                                      │
│  - Global endpoints (SFO, London, Amsterdam)                 │
│  - 95%+ success rate                                         │
│  - 3-5 second responses (vs 60-90s)                          │
└─────────────────────────────────────────────────────────────┘

Benefits:
✅ 95%+ success rate (residential IPs + stealth)
✅ 3-5 second responses (managed browser pool)
✅ No Chromium binary (pure HTTP client)
✅ No bundling issues
✅ No concurrent request issues
✅ Minimal backend code (~50 lines)
✅ Free tier: 1,000 units/month (~30-50 requests)
```

---

## Data Flow

### 1. Frontend Request
```typescript
// frontend/src/lib/api.ts (NO CHANGES)
const response = await fetch('/api/wallets?chain=sol&timeframe=7d&tag=smart_degen');
```

### 2. Next.js API Route Proxy
```typescript
// frontend/src/app/api/wallets/route.ts (NO CHANGES)
const response = await fetch(`${API_BASE_URL}/wallets?...`, {
  headers: { 'X-API-Key': API_KEY }
});
```

### 3. Backend Endpoint
```javascript
// backend/routes/wallets.js (MINIMAL CHANGES)
router.get('/', async (req, res) => {
  // Same logic, but uses new solver-browserless.js
  const { fetchGMGNData } = await import('../scraper/fetcher.js');
  const response = await fetchGMGNData({ chain, timeframe, tag, limit });
  // ... filter, rank, cache, paginate
});
```

### 4. New Browserless Fetcher
```javascript
// backend/scraper/fetcher.js (REPLACE PUPPETEER CODE)
import { fetchWithBrowserless } from './solver-browserless.js';

export async function fetchGMGNData({ chain, timeframe, tag, limit }) {
  const tagParam = tag ? `?tag=${tag}&limit=${limit}` : `?limit=${limit}`;
  const apiUrl = `https://gmgn.ai/defi/quotation/v1/rank/${chain}/wallets/${timeframe}${tagParam}`;
  
  // Call Browserless /unblock API
  const result = await fetchWithBrowserless(apiUrl);
  
  if (!result.success) {
    throw new Error(result.error || 'Browserless fetch failed');
  }
  
  // Parse JSON response from content
  const data = JSON.parse(result.content);
  
  console.log(`[Fetcher] Successfully fetched ${data.data?.rank?.length || 0} wallets`);
  return data;
}
```

### 5. Browserless Solver (NEW FILE)
```javascript
// backend/scraper/solver-browserless.js (NEW)
const BROWSERLESS_API_TOKEN = process.env.BROWSERLESS_API_TOKEN;
const BROWSERLESS_ENDPOINT = 'https://production-sfo.browserless.io/unblock';

export async function fetchWithBrowserless(url, options = {}) {
  const {
    waitForTimeout = 8000,
    waitUntil = 'networkidle2',
    useProxy = true
  } = options;

  const browserlessUrl = useProxy 
    ? `${BROWSERLESS_ENDPOINT}?token=${BROWSERLESS_API_TOKEN}&proxy=residential`
    : `${BROWSERLESS_ENDPOINT}?token=${BROWSERLESS_API_TOKEN}`;

  const requestBody = {
    url: url,
    content: true,
    cookies: false,
    screenshot: false,
    browserWSEndpoint: false,
    ttl: 0,
    waitForTimeout: waitForTimeout,
    gotoOptions: {
      waitUntil: waitUntil
    }
  };

  try {
    const response = await fetch(browserlessUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Browserless API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      content: data.content,
      cookies: data.cookies,
      error: null
    };
  } catch (error) {
    console.error('[Browserless] Error:', error);
    return {
      success: false,
      content: null,
      cookies: [],
      error: error.message
    };
  }
}
```

---

## Cost Analysis

### Free Tier Limits
- **1,000 units/month**
- **1 concurrent browser**
- **1 min max session time**
- **1 day log storage**
- **Cloudflare verify: FREE (no unit cost)**
- **Residential proxy: 6 units/MB**

### Unit Consumption Per Request

**Without Proxy (Datacenter IP):**
- Browser time: 8-10 seconds = **1 unit**
- Data transfer: ~100KB JSON = **0 units** (negligible)
- **Total: ~1 unit per request**
- **Capacity: ~1,000 requests/month**

**With Residential Proxy (Recommended):**
- Browser time: 8-10 seconds = **1 unit**
- Data transfer: ~100KB JSON = **0.6 units** (100KB ÷ 1MB × 6 units)
- **Total: ~1-2 units per request**
- **Capacity: ~500-1,000 requests/month**

### Usage Estimate
- **Prefetch (startup)**: 4 configs × 2 units = **8 units**
- **User requests**: 50 requests/month × 2 units = **100 units**
- **Retry budget**: 50 retries × 2 units = **100 units**
- **Total monthly**: ~**200-250 units** (well within free tier)

### Paid Tiers (If Needed)
- **Prototyping**: $25/mo (20k units, 3 concurrent) = ~10,000 requests
- **Starter**: $140/mo (180k units, 20 concurrent) = ~90,000 requests
- **Overage**: $0.0020 per unit on Prototyping plan

---

## Implementation Steps

### 1. **Create solver-browserless.js** ✅
- Lightweight HTTP client using fetch/axios
- POST to `/unblock` endpoint
- Parse JSON response from `content` field
- Add retry logic (3 attempts)
- Add error handling and logging

### 2. **Update fetcher.js** ✅
- Replace puppeteer code with Browserless call
- Remove browser launch/close logic
- Keep same return structure (data.rank array)
- Maintain cache integration
- Remove ETXTBSY locks (no longer needed)

### 3. **Environment Variables** ✅
```bash
# backend/.env (Render)
BROWSERLESS_API_TOKEN=your_token_here

# frontend/.env.local (Netlify)
API_URL=https://your-render-backend.onrender.com/api
API_KEY=your_secure_key
```

### 4. **Remove Dependencies** ✅
```bash
# backend/package.json
npm uninstall puppeteer-core @sparticuz/chromium puppeteer-extra puppeteer-extra-plugin-stealth
# Dependencies reduced from ~580 to ~50 packages
```

### 5. **Update prefetch.js** ✅
- Same 4 configs (SOL/ETH 7d all + smart_degen)
- Same retry logic (3 attempts, exponential backoff)
- Faster execution (3-5s per request vs 60-90s)
- Total prefetch time: ~30-60s vs 6-12 minutes

### 6. **Clean Up Netlify Functions** ✅
```bash
# Remove failed migration attempt
rm -rf frontend/netlify/functions/
rm -rf frontend/lib/scraper/
# Remove puppeteer dependencies from frontend/package.json
```

### 7. **Testing** ✅
- Local: Test with Browserless API token
- Verify 95%+ success rate with residential proxy
- Check response times (3-5s target)
- Validate JSON parsing
- Test cache integration
- Test prefetch on startup

### 8. **Deploy** ✅
- Push to GitHub
- Render auto-deploys backend
- Netlify auto-deploys frontend
- Verify production endpoints
- Monitor Browserless dashboard for unit usage

---

## Alternative: WebSocket Approach

If we need more control (custom JavaScript injection, multiple page interactions), we can use the **WebSocket endpoint** approach:

```javascript
// 1. Call /unblock to get WebSocket endpoint
const { browserWSEndpoint, cookies } = await fetch(
  `${BROWSERLESS_ENDPOINT}?token=${TOKEN}&proxy=residential`,
  {
    method: 'POST',
    body: JSON.stringify({
      url: 'https://gmgn.ai/rank?chain=sol',
      browserWSEndpoint: true,
      cookies: true,
      ttl: 30000  // Keep browser alive for 30s
    })
  }
);

// 2. Connect with puppeteer-core
import puppeteer from 'puppeteer-core';
const browser = await puppeteer.connect({
  browserWSEndpoint: `${browserWSEndpoint}?token=${TOKEN}`
});

// 3. Use existing solver-turnstile.js logic
const page = (await browser.pages())[0];
await page.setCookie(...cookies);
// ... rest of turnstile solving logic

// 4. Close when done
await browser.close();
```

**Trade-offs:**
- ✅ More control (custom JS, screenshots, etc.)
- ✅ Can reuse existing solver-turnstile.js code
- ❌ Slightly more complex (2-step process)
- ❌ Higher unit cost (TTL duration counts)
- ❌ Still need puppeteer-core dependency

**Recommendation:** Start with **simple content mode** (no WebSocket), only switch to WebSocket if content mode fails.

---

## Success Metrics

### Target KPIs
- **Success Rate**: 95%+ (vs current 50%)
- **Response Time**: 3-5 seconds (vs current 60-90s)
- **Prefetch Time**: 30-60 seconds (vs current 6-12 minutes)
- **Code Complexity**: ~50 lines (vs current 300+ lines)
- **Dependencies**: ~50 packages (vs current 580)
- **Unit Usage**: ~200-250/month (vs 1,000 limit)
- **Cost**: $0/month (free tier)

### Monitoring
- Browserless dashboard: Track unit usage, success rate, errors
- Backend logs: Response times, error rates
- Frontend: User experience (page load times)

---

## Rollback Plan

If Browserless.io doesn't work:

1. **Git revert** to previous puppeteer-core commit
2. **Redeploy** Render backend with @sparticuz/chromium
3. **Keep** current 50% success + retries = 87% effective
4. **Consider** paid alternatives:
   - Railway Hobby ($5/mo) for full puppeteer
   - ScraperAPI ($49/mo) for 99% success
   - Browserless Prototyping ($25/mo) for higher limits

---

## Files to Create/Modify

### New Files
- ✅ `backend/scraper/solver-browserless.js` (~100 lines)
- ✅ `docs/BROWSERLESS_ARCHITECTURE.md` (this file)
- ✅ `backend/.env.example` (add BROWSERLESS_API_TOKEN)

### Modified Files
- ✅ `backend/scraper/fetcher.js` (replace puppeteer code)
- ✅ `backend/routes/prefetch.js` (remove sequential delays, speeds up)
- ✅ `backend/package.json` (remove puppeteer dependencies)
- ✅ `backend/.env` (add BROWSERLESS_API_TOKEN)
- ✅ `README.md` (update architecture section)

### Files to Delete
- ✅ `backend/scraper/solver-turnstile.js` (replaced by solver-browserless.js)
- ✅ `frontend/netlify/functions/` (failed migration)
- ✅ `frontend/lib/scraper/` (failed migration)
- ✅ `docs/NETLIFY_MIGRATION.md` (obsolete)

---

## Timeline

- **Step 1-2**: Create solver-browserless.js, update fetcher.js (~30 min)
- **Step 3-4**: Environment variables, remove dependencies (~15 min)
- **Step 5-6**: Update prefetch, clean up Netlify files (~15 min)
- **Step 7**: Local testing (~30 min)
- **Step 8**: Deploy to production (~15 min)
- **Total**: ~2 hours to complete migration

---

## Next Steps

1. ✅ Sign up for Browserless.io free tier
2. ✅ Get API token from dashboard
3. ✅ Create `solver-browserless.js`
4. ✅ Update `fetcher.js`
5. ✅ Test locally with `.env` token
6. ✅ Remove puppeteer dependencies
7. ✅ Deploy to Render
8. ✅ Monitor success rate and unit usage

---

**Ready to implement?** This will give us the 95% success rate from your local tests without any browser bundling complexity! 🚀
