# 🚀 Deployment Guide

This guide walks through deploying your GMGN Wallet Dashboard to production with Netlify (frontend) and Render (backend).

## 📋 Pre-Deployment Checklist

- [ ] Browserless.io API token obtained (https://account.browserless.io/)
- [ ] GitHub account ready
- [ ] Netlify account ready (https://netlify.com)
- [ ] Render account ready (https://render.com)

## 🏗️ Architecture Overview

```
User Browser
    ↓
Netlify (Next.js Frontend)
    ↓ (API calls)
Render (Express Backend)
    ↓ (Browserless.io API)
GMGN.ai Data (via residential proxies)
```

## 📝 Step 1: Prepare Repository

### 1.1 Remove docs folder from .gitignore

The docs folder is currently ignored. If you want to include documentation:

```bash
# Edit .gitignore and remove or comment out: 
# docs/
```

### 1.2 Initialize Git Repository

```bash
cd gmgn-scraper/dashboard

# Initialize git
git init
git add .
git commit -m "Initial commit: GMGN Wallet Dashboard"
git branch -M main
```

### 1.3 Create GitHub Repository

1. Go to https://github.com/new
2. Name: `gmgn-dashboard` (or your choice)
3. **DO NOT** initialize with README, .gitignore, or license
4. Create repository
5. Push your code:

```bash
git remote add origin https://github.com/YOUR_USERNAME/gmgn-dashboard.git
git push -u origin main
```

## 🖥️ Step 2: Deploy Backend (Render)

### 2.1 Create Web Service

1. Go to https://render.com/dashboard
2. Click **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure service:
   - **Name:** `dashboard-backend` (or your choice)
   - **Region:** Choose closest to you
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

### 2.2 Set Environment Variables

Click **Advanced** → **Add Environment Variable**:

```bash
NODE_ENV=production
PORT=3001
CACHE_TTL=300
FRONTEND_URL=https://wdashboard.netlify.app
BROWSERLESS_API_TOKEN=your-browserless-token-here
API_KEY=your-generated-api-key-here
```

**Generate API Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Optional - Backup Browserless Tokens:**
```bash
BROWSERLESS_API_TOKEN_2=your-backup-token-1
BROWSERLESS_API_TOKEN_3=your-backup-token-2
```

### 2.3 Deploy

1. Click **Create Web Service**
2. Wait for deployment (3-5 minutes)
3. Copy your backend URL: `https://dashboard-backend-mo1j.onrender.com`

**⚠️ Note:** Update `FRONTEND_URL` after Step 3!

## 🌐 Step 3: Deploy Frontend (Netlify)

### 3.1 Create New Site

1. Go to https://app.netlify.com
2. Click **Add new site** → **Import an existing project**
3. Choose **Deploy with GitHub**
4. Select your repository
5. Configure build settings:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/.next`

### 3.2 Set Environment Variables

Go to **Site settings** → **Environment variables** → **Add a variable**:

```bash
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
API_KEY=same-backend-api-key-from-step-2
NEXT_PUBLIC_FRONTEND_API_KEY=your-generated-frontend-key
```

**Generate Frontend API Key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important:**
- `API_KEY`: Same as backend (for server-to-server communication)
- `NEXT_PUBLIC_FRONTEND_API_KEY`: New key to protect your Next.js API routes
- Both are required for security

Replace `your-backend.onrender.com` with your actual Render URL from Step 2.3.

### 3.3 Deploy

1. Click **Deploy site**
2. Wait for deployment (2-3 minutes)
3. Copy your frontend URL: `https://wdashboard.netlify.app`

### 3.4 Update Backend CORS

1. Go back to Render dashboard
2. Open your backend service
3. Go to **Environment** tab
4. Update `FRONTEND_URL` with your Netlify URL
5. Save (will trigger redeploy)

## ✅ Step 4: Verify Deployment

### 4.1 Test Backend

```bash
# Health check
curl https://dashboard-backend-mo1j.onrender.com/api/health

# Expected response:
# {"status":"ok","timestamp":"2025-11-11T...","cacheStatus":"..."}
```

### 4.2 Test Frontend

1. Visit your Netlify URL
2. Wait 30 seconds on first load (backend waking up from free tier sleep)
3. Dashboard should load with wallet data
4. Test filters (chain, timeframe, tag)
5. Test advanced filters (PnL%, Profit $, etc.)
6. Check browser DevTools:
   - No CORS errors
   - API calls going to your backend
   - No exposed API keys in Network tab

## 🔧 Configuration

### Netlify Configuration

Your `netlify.toml` is already configured:

```toml
[build]
  base = "frontend"
  publish = ".next"
  command = "npm ci && npm run build"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NODE_VERSION = "20"
```

### Backend Configuration

Express server listens on `PORT` environment variable (Render provides this).

## 💰 Costs

### Free Tier Limits

**Render (Backend):**
- ✅ Free tier: 750 hours/month
- ⚠️ Sleeps after 15 min inactivity
- ⚠️ 30s wake-up time on first request
- **Upgrade to paid ($7/mo) for:**
  - Always-on service
  - No sleep delays
  - Better performance

**Netlify (Frontend):**
- ✅ Free tier: 100GB bandwidth/month
- ✅ 300 build minutes/month
- ✅ Automatic SSL
- ✅ CDN included

**Browserless.io (API):**
- ✅ Free tier: 1,000 units/month
- Each request: ~2 units (with residential proxy)
- **≈ 500 requests/month on free tier**
- Paid plans start at $29/mo (10,000 units)

**Total Free Tier:** $0/month for ~500 wallet lookups

## 🔐 Security Best Practices

### Environment Variables

✅ **Never commit:**
- `.env` files
- API keys
- Browserless tokens

✅ **Always use:**
- `.env.example` for documentation
- Environment variables in hosting platforms
- Server-side API calls (not browser)

### API Key Rotation

Rotate keys periodically:

```bash
# Generate new key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update in:
# 1. Render backend environment
# 2. Netlify frontend environment
```

### CORS Configuration

Backend only accepts requests from your Netlify domain (configured via `FRONTEND_URL`).

## 🐛 Troubleshooting

### Backend Issues

**502/503 Errors:**
- Backend is waking up from free tier sleep
- Wait 30 seconds and retry
- **Solution:** Upgrade to paid tier for always-on

**Browserless API Errors:**
- Check token is set: `BROWSERLESS_API_TOKEN`
- Check usage: https://account.browserless.io/
- Out of units? Add backup tokens or upgrade plan

**Cache Issues:**
- Default TTL: 5 minutes
- Clear cache: Restart backend service
- Adjust: Change `CACHE_TTL` env var (in seconds)

### Frontend Issues

**CORS Errors:**
- Verify `FRONTEND_URL` in backend matches Netlify URL exactly
- Include protocol: `https://` not `http://`
- No trailing slash

**API Calls Failing:**
- Check `NEXT_PUBLIC_API_URL` points to backend
- Format: `https://your-backend.onrender.com/api`
- Check backend is running (health endpoint)

**Build Failures:**
- Check build logs in Netlify dashboard
- Ensure Node version matches (20.x)
- Verify dependencies in `package.json`

### Performance Issues

**Slow Initial Load:**
- Backend cold start (30s) on free tier
- **Solution:** Upgrade to paid tier or use cron job to keep-alive

**Slow Data Fetching:**
- Browserless API is slow (8-10s per request)
- Cache is working (5 min TTL)
- Consider prefetch on startup for common queries

## 📊 Monitoring

### Backend Logs

View in Render dashboard → Logs tab:
- Request logs with timestamps
- Cache hit/miss info
- Browserless API calls
- Errors and warnings

### Frontend Logs

View in Netlify dashboard → Functions/Logs:
- Build logs
- Runtime errors
- Deploy status

### Browserless Usage

Check usage at https://account.browserless.io/:
- Units consumed
- Success rate
- Response times
- Errors

## 🚀 Post-Deployment

### Custom Domain (Optional)

**Netlify:**
1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS records
4. Update `FRONTEND_URL` in backend

**Render:**
1. Upgrade to paid tier
2. Add custom domain
3. Configure DNS
4. Update SSL certificate

### Monitoring & Alerts

Set up monitoring:
- **UptimeRobot:** Free uptime monitoring
- **Sentry:** Error tracking
- **LogRocket:** Session replay

### Backup Browserless Tokens

For production reliability:
1. Create multiple Browserless accounts (free tier each)
2. Add tokens to backend:
   ```bash
   BROWSERLESS_API_TOKEN=primary-token
   BROWSERLESS_API_TOKEN_2=backup-token-1
   BROWSERLESS_API_TOKEN_3=backup-token-2
   ```
3. System automatically rotates between tokens

## 📚 Additional Resources

- **Render Docs:** https://render.com/docs
- **Netlify Docs:** https://docs.netlify.com
- **Browserless Docs:** https://docs.browserless.io
- **Next.js Deployment:** https://nextjs.org/docs/deployment

## ✅ Deployment Checklist

- [ ] Git repository created and pushed
- [ ] Backend deployed to Render
- [ ] Backend environment variables set
- [ ] Browserless API token configured
- [ ] Frontend deployed to Netlify
- [ ] Frontend environment variables set
- [ ] Backend CORS updated with Netlify URL
- [ ] Health check successful
- [ ] Dashboard loads and displays data
- [ ] Filters working correctly
- [ ] No console errors
- [ ] Custom domain configured (optional)

---

**Need help?** Check troubleshooting section or open an issue on GitHub.
