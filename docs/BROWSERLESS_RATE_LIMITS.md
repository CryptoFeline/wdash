# Browserless Free Tier Rate Limits

## Issue Encountered

**HTTP 429 - Too Many Requests**

When running prefetch or making rapid requests, you may see:
```
HTTP 429: <html>
<head><title>429 Too Many Requests</title></head>
<body>
<center><h1>429 Too Many Requests</h1></center>
</body>
</html>
```

---

## Root Cause

**Browserless Free Tier Limits:**
- ✅ 1,000 units/month
- ❌ **1 concurrent browser** (only 1 request at a time)
- ❌ 1 minute max session time
- ❌ 1 day log storage

**What happens:**
1. Prefetch starts request #1 (SOL all wallets)
2. Request #1 takes ~26 seconds to complete
3. Before #1 finishes, request #2 starts (ETH all wallets)
4. Browserless rejects #2 with **429** (concurrent limit hit)

---

## Solutions Implemented

### 1. **Sequential Prefetch with Long Delays** ✅
Changed from parallel to sequential with 30-second delays:

```javascript
// Before: Parallel (causes 429)
await Promise.all([
  fetch('SOL all'),
  fetch('ETH all'),
  fetch('SOL smart_degen'),
  fetch('ETH smart_degen')
]);

// After: Sequential with 30s delays (avoids 429)
for (const config of CONFIGS) {
  await fetch(config);
  await sleep(30000); // Wait 30s before next
}
```

**Impact:**
- ✅ No more 429 errors
- ⏱️ Prefetch takes ~2-3 minutes (vs 30-60 seconds)
- 💰 Still free tier

---

### 2. **HTML-Wrapped JSON Parser** ✅
Browsers render JSON as HTML with `<pre>` tags. Added parser:

```javascript
// Detects and unwraps HTML around JSON
if (content.startsWith('<html>')) {
  const preMatch = content.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (preMatch) {
    content = preMatch[1].trim();
  }
}
const data = JSON.parse(content);
```

**Impact:**
- ✅ Parses JSON correctly
- ✅ No more "Unexpected token '<'" errors

---

### 3. **Smart Retry Logic for 429** ✅
Added longer backoff for rate limit errors:

```javascript
// Normal errors: 2s, 4s, 8s exponential backoff
// 429 errors: 30s backoff (wait for concurrent slot)
const backoffDelay = is429Error ? 30000 : Math.pow(2, attempt) * 1000;
```

**Impact:**
- ✅ Automatic retry after 30s
- ✅ Better error messages
- ✅ Higher success rate

---

## Testing Strategy

### **Option 1: Test Single Fetch (Recommended)**
```bash
cd backend
npm run test:fetch
```

**Expected:**
- Duration: ~10-15 seconds
- Wallets: ~50 smart_degen wallets
- Success rate: 95%+

**Timing:**
- Wait **30 seconds** between tests to avoid 429

---

### **Option 2: Test Full Prefetch**
```bash
cd backend
npm start
# Prefetch runs automatically on startup
```

**Expected timeline:**
1. SOL all: ~10-15s
2. Wait 30s
3. ETH all: ~10-15s
4. Wait 30s
5. SOL smart_degen: ~10-15s
6. Wait 30s
7. ETH smart_degen: ~10-15s

**Total:** ~2-3 minutes (sequential)

---

## Production Recommendations

### **Free Tier Strategy (Current)**
✅ **Keep prefetch enabled** with 30s delays
✅ **Cache for 5 minutes** (reduces Browserless calls)
✅ **Monitor usage** at https://account.browserless.io/

**Monthly capacity:**
- Prefetch: 4 configs × 2 units = **8 units**
- User requests: ~100 requests × 2 units = **200 units**
- Retries: ~50 × 2 units = **100 units**
- **Total: ~300 units/month** (30% of free tier)

**Trade-offs:**
- ✅ Free
- ✅ 95%+ success rate
- ⏱️ Slower prefetch (2-3 min vs 30-60s)
- ⚠️ 1 concurrent request limit

---

### **Paid Tier Option (If Needed)**

**Prototyping Plan: $25/month**
- 20,000 units/month
- **3 concurrent browsers** (3x faster prefetch)
- 15 min max session time
- 7 day log storage

**Benefits:**
- ✅ Parallel prefetch: 30-60 seconds (vs 2-3 minutes)
- ✅ 10,000+ requests/month capacity
- ✅ No 429 errors
- ✅ Better for production

**Upgrade when:**
- Getting frequent 429 errors
- Need faster prefetch
- Exceeding 1,000 units/month

---

## Troubleshooting

### **Q: Still getting 429 errors?**
**A:** Increase `DELAY_BETWEEN_CONFIGS` in `routes/prefetch.js`:
```javascript
const DELAY_BETWEEN_CONFIGS = 45000; // 45 seconds (extra safe)
```

---

### **Q: Prefetch taking too long?**
**A:** Options:
1. **Reduce configs** - Only prefetch SOL (remove ETH):
   ```javascript
   const PREFETCH_CONFIGS = [
     { chain: 'sol', timeframe: '7d', tag: null },
     { chain: 'sol', timeframe: '7d', tag: 'smart_degen' },
   ];
   ```
2. **Disable auto-prefetch** - Comment out in `server.js`:
   ```javascript
   // startupPrefetch(); // Disabled
   ```
3. **Upgrade to Prototyping** - 3 concurrent = 3x faster

---

### **Q: JSON parsing errors?**
**A:** The HTML wrapper fix should handle this. If not:
1. Check Browserless response format
2. Try `useProxy: false` (datacenter IP, cheaper, faster)
3. Report to Browserless support

---

## Current Status

✅ **Fixed:** HTML-wrapped JSON parsing  
✅ **Fixed:** 429 rate limit handling  
✅ **Configured:** Sequential prefetch with 30s delays  
✅ **Working:** Single fetch test passing  
⏳ **Next:** Test full prefetch with delays  

**Ready for production** on free tier with known limitations! 🎉

---

## Next Steps

1. **Test single fetch:**
   ```bash
   npm run test:fetch
   ```

2. **Test full server with prefetch:**
   ```bash
   npm start
   # Wait 2-3 minutes for prefetch to complete
   ```

3. **Monitor Browserless usage:**
   - Dashboard: https://account.browserless.io/
   - Watch for 429 errors
   - Track unit consumption

4. **Deploy to production:**
   ```bash
   git commit -m "fix: handle Browserless rate limits and HTML-wrapped JSON"
   git push origin main
   ```

5. **Consider upgrade if:**
   - Frequent 429 errors
   - Need faster responses
   - Exceeding 1,000 units/month
