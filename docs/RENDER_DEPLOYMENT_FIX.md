# RENDER DEPLOYMENT FIX - IMPORTANT

**Issue:** Render is still using old build command from dashboard UI, ignoring render.yaml

**Error Path:** `/opt/render/project/src/backend/backend/package.json` (double backend)

**Root Cause:** Render dashboard settings override render.yaml. The dashboard has:
- Build Command: `npm install --prefix backend`
- (Other old settings)

**Solution:** Update directly in Render Dashboard

---

## Steps to Fix

1. **Go to Render Dashboard**
   - https://dashboard.render.com

2. **Select Your Backend Service**
   - Click on `dashboard-backend`

3. **Go to Settings**
   - Settings tab at the top

4. **Update Build Command**
   - Find "Build Command" field
   - Replace with: `./render-build.sh`
   - Click Save

5. **Update Start Command**
   - Find "Start Command" field
   - Replace with: `npm --prefix backend start`
   - Click Save

6. **Verify Environment Variables**
   - Ensure these are set:
     - `API_KEY` = your API key value
     - `SUPABASE_URL` = https://gpfijalaxeuqbpeuetna.supabase.co
     - `SUPABASE_SERVICE_ROLE_KEY` = from backend/.env
     - `BROWSERLESS_API_TOKEN` = from backend/.env
     - `NODE_ENV` = production
     - `NODE_VERSION` = 22.16.0

7. **Clear Build Cache (Optional)**
   - Settings → Environment
   - Click "Rebuild"

8. **Re-deploy**
   - Go to Deployments tab
   - Click "Deploy" on latest commit
   - Watch logs - should now find backend/package.json correctly

---

## Expected Success

After changes, the build log should show:

```
==> Running build command './render-build.sh'...
🏠 Root directory: /opt/render/project
📁 Working directory: /opt/render/project/backend
⬇️ Installing dependencies...
npm install --verbose
🌐 Installing Chrome for Puppeteer...
npx puppeteer browsers install chrome
✅ Build complete
```

NOT:

```
npm error path /opt/render/project/src/backend/backend/package.json
```

---

## Why This Happens

- render.yaml is used as configuration guidance
- But Render Dashboard UI settings take priority
- When you created the service, you set Build Command manually
- Dashboard remembers this setting
- Dashboard doesn't auto-update from render.yaml
- Need to change it manually in dashboard

---

## After Fixing

Once build succeeds:

1. Backend service will be running on `https://your-service-name.onrender.com`
2. Test with:
   ```bash
   curl https://your-service-name.onrender.com/api/wallets?chain=sol&timeframe=7d&tag=all&page=1&limit=1 \
     -H "X-API-Key: your_api_key"
   ```
3. Should return wallet data

---

## Code is Ready

All the code pushed to GitHub (commit 06505e6) is correct:
- ✅ render.yaml has correct configuration
- ✅ render-build.sh is correct
- ✅ All backend code is ready
- ✅ All frontend code is ready

Just need to update Render Dashboard UI and re-deploy.
