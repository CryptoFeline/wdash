# Render Environment Variables Setup

## Required Environment Variables

Add these in Render Dashboard → Environment:

### 1. AUTO_PREFETCH (DISABLE FOR TESTING)
```
AUTO_PREFETCH=false
```

**Why**: Disables automatic cache warming on server startup. This prevents the old fetcher from running alongside the stealth test, which causes mixed logs and confusion.

**When to re-enable**: After stealth tests pass, change to `true` to restore background prefetch.

### 2. API_KEY (Already Set)
```
API_KEY=88c090fb868f171d322e9cea5a8484dd10c05975e789a28238f2bb2428b06e84
```

### 3. FRONTEND_URL (Already Set)
```
FRONTEND_URL=https://your-netlify-site.netlify.app
```

## Test-Only Dependencies

The following packages are ONLY used for testing stealth plugin:

- `puppeteer` (full bundled Chromium) - 300MB download, ~3-4 min build time
- `puppeteer-extra` + `puppeteer-extra-plugin-stealth`

**Production uses**: `puppeteer-core` + `@sparticuz/chromium` (fast, 2-3 min builds)

## Two Solver Files

| File | Purpose | Uses |
|------|---------|------|
| `solver-turnstile.js` | Production (future) | puppeteer-core + @sparticuz/chromium |
| `solver-turnstile-test.js` | Testing ONLY | puppeteer (full bundle) - 100% identical to /test folder |

## Why Two Files?

The `/test` folder scripts use **full puppeteer** with bundled Chromium. We need to test if the stealth plugin works on Render with the SAME setup that works locally (95% success).

If tests pass, we'll later adapt `solver-turnstile.js` to work with serverless Chromium.

## How to Set Environment Variable

1. Go to Render Dashboard
2. Select `dashboard-backend-mo1j` service
3. Click **Environment** tab
4. Add new variable:
   - Key: `AUTO_PREFETCH`
   - Value: `false`
5. Click **Save Changes**
6. Render will auto-redeploy

## After Testing

Once stealth tests complete:
- If **successful**: Integrate stealth into production fetcher, re-enable prefetch
- If **failed**: Consider residential proxy or other solutions
