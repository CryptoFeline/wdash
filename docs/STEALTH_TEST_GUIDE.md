# Stealth Plugin Test - Render Deployment

## What We Added

Added test endpoints to verify if `puppeteer-extra-plugin-stealth` works on Render with the same 95% success rate as local tests.

## Files Added (100% unchanged from /test folder)

1. **backend/scraper/solver-turnstile.js** - Core single-URL solver (13KB)
2. **backend/scraper/scraper-parallel.js** - Parallel multi-URL scraper (3.9KB)
3. **backend/routes/test-stealth.js** - Express routes for testing

## New Dependencies

```json
{
  "puppeteer-extra": "^3.3.6",
  "puppeteer-extra-plugin-stealth": "^2.11.2"
}
```

## Test Endpoints on Render

### 1. Single URL Test (SOL 7d)
```bash
curl "https://dashboard-backend-mo1j.onrender.com/api/test-stealth" \
  -H "x-api-key: 88c090fb868f171d322e9cea5a8484dd10c05975e789a28238f2bb2428b06e84"
```

**Expected Response (if successful):**
```json
{
  "test": "stealth-plugin",
  "environment": "production",
  "result": {
    "success": true,
    "walletsFound": 200,
    "statusCode": 200,
    "timing": { ... },
    "turnstileDetected": true,
    "logs": [...]
  }
}
```

**Expected Duration:** ~52-54 seconds

### 2. Custom URL Test (ETH 7d)
```bash
curl "https://dashboard-backend-mo1j.onrender.com/api/test-stealth?url=https://gmgn.ai/defi/quotation/v1/rank/eth/wallets/7d?orderby=pnl_7d&direction=desc&limit=200" \
  -H "x-api-key: 88c090fb868f171d322e9cea5a8484dd10c05975e789a28238f2bb2428b06e84"
```

### 3. Parallel Test (SOL + ETH)
```bash
curl "https://dashboard-backend-mo1j.onrender.com/api/test-stealth/parallel" \
  -H "x-api-key: 88c090fb868f171d322e9cea5a8484dd10c05975e789a28238f2bb2428b06e84"
```

**Expected Response:**
```json
{
  "test": "stealth-plugin-parallel",
  "environment": "production",
  "summary": {
    "total": 2,
    "successful": 2,
    "failed": 0,
    "successRate": "100.0%"
  },
  "results": [
    { "url": "...", "success": true, "wallets": 200 },
    { "url": "...", "success": true, "wallets": 200 }
  ]
}
```

**Expected Duration:** ~85-90 seconds (both URLs in parallel)

## Key Differences from Current fetcher.js

| Feature | Current (fetcher.js) | Test (solver-turnstile.js) |
|---------|---------------------|----------------------------|
| Puppeteer | puppeteer-core | puppeteer + puppeteer-extra |
| Stealth Plugin | ❌ No | ✅ Yes |
| Success Rate | ~25% (Cloudflare blocks) | 95%+ (local) |
| Module System | ES Modules | CommonJS |
| Chromium | @sparticuz/chromium | Bundled with puppeteer |

## What Success Means

If test endpoints return `success: true` with 200 wallets on Render:
- ✅ Stealth plugin works on Render
- ✅ We can replace current fetcher.js with stealth-enabled version
- ✅ Should solve the Cloudflare blocking issues (75% failure → 95% success)

## What Failure Means

If test endpoints fail with Cloudflare errors:
- ❌ Stealth plugin doesn't work on Render (possible reasons below)
- ❌ Need alternative solution (residential proxy, etc.)

### Possible Failure Reasons on Render

1. **@sparticuz/chromium incompatibility** - Stealth plugin might not work with this Chromium build
2. **Render IP flagged** - Cloud hosting IPs are in Cloudflare's blocklist
3. **Missing dependencies** - Render might not have required system libraries
4. **Headless detection** - Even with stealth, Cloudflare might detect headless Chrome

## Monitoring Render Logs

Watch for these log messages:

**Success indicators:**
```
[Test-Stealth] Starting test...
🚀 Starting Puppeteer with Stealth...
✅ Intercepted API response: code=0
[Test-Stealth] Result: { success: true, walletsCount: 200, statusCode: 200 }
```

**Failure indicators:**
```
⚠️ Response is not JSON (status=403): <!DOCTYPE html>
[Fetcher] Error: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
[Test-Stealth] Result: { success: false, statusCode: 403 }
```

## Next Steps After Testing

### If Successful (95%+ on Render)
1. Replace `backend/scraper/fetcher.js` with stealth-enabled version
2. Update prefetch system to use new solver
3. Remove old Puppeteer setup
4. Frontend should start working reliably

### If Failed (<50% on Render)
1. Consider residential proxy service (Zenrows/ScraperAPI ~$49/mo)
2. Try different Chromium builds
3. Use ngrok tunnel to local machine (free but requires 24/7 uptime)
4. Accept current solution and manually trigger prefetch when Cloudflare allows

## Current System (Unchanged)

The existing system continues to work as-is:
- `/api/wallets` - Uses current fetcher.js
- `/api/prefetch` - Uses current fetcher.js with retries
- Frontend - No changes

Test endpoints are completely separate and won't affect production.
