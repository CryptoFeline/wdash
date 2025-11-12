# 🚀 Ready for Deployment!

Your GMGN Dashboard is now configured for deployment. Here's what's been set up:

## ✅ Deployment Preparation Complete

### Security
- ✅ API keys are server-side only (never exposed to browser)
- ✅ CORS configured with environment-based origins
- ✅ `.gitignore` files prevent committing secrets
- ✅ `.env.example` files for documentation

### Configuration Files Added
- ✅ `.gitignore` (root, backend)
- ✅ `netlify.toml` (Netlify configuration)
- ✅ `.env.example` (backend, frontend)
- ✅ `DEPLOYMENT.md` (step-by-step guide)

## 📋 Deployment Checklist

### 1. Create GitHub Repository
```bash
cd /gmgn-scraper/dashboard
git init
git add .
git commit -m "Initial commit: Wallet Dashboard"
git branch -M main

# Create repo on GitHub, then:
git remote add origin https://github.com/0xCryptoCat/dashboard.git
git push -u origin main
```

### 2. Deploy Backend (Render.com)
- Go to https://render.com/dashboard
- New Web Service → Connect GitHub repo
- **Root Directory:** `backend`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

**Environment Variables:**
```
NODE_ENV=production
PORT=3001
API_KEY=88c090fb868f171d322e9cea5a8484dd10c05975e789a28238f2bb2428b06e84
CACHE_TTL=300
FRONTEND_URL=https://your-app-name.netlify.app
```
*(Update FRONTEND_URL after Step 3)*

### 3. Deploy Frontend (Netlify)
- Go to https://app.netlify.com
- New Site → Import from Git
- **Base Directory:** `frontend`
- **Build Command:** `npm run build`
- **Publish Directory:** `frontend/.next`

**Environment Variables:**
```
API_URL=https://your-backend-name.onrender.com/api
API_KEY=88c090fb868f171d322e9cea5a8484dd10c05975e789a28238f2bb2428b06e84
```
*(Replace your-backend-name with Render URL)*

### 4. Update CORS
- Copy your Netlify URL (e.g., `https://gmgn-dashboard-xyz.netlify.app`)
- Go to Render → Your service → Environment
- Update `FRONTEND_URL` with your Netlify URL
- Save (auto-redeploys)

## 🎯 What This Setup Does

### Architecture
```
Browser
   ↓
Netlify (Next.js)
   ↓ (with API key - server side)
Render (Express API)
   ↓
GMGN.ai API (via Puppeteer)
```

### Security Features
1. **API Key Protection**: Never exposed to browser
2. **Server-Side Rendering**: API calls happen on Next.js server
3. **CORS Protection**: Only your Netlify domain can access backend
4. **Environment Variables**: Secrets stored securely in hosting platforms

## ⚠️ Important Notes

### Render Free Tier
- Backend sleeps after 15 min inactivity
- First request takes ~30s to wake up
- Consider paid tier ($7/mo) for always-on

### API Key Security
- Current key: `88c090fb...b06e84`
- To rotate: Generate new key with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Update in both Render and Netlify env vars

### Costs
- ✅ Render: Free tier available
- ✅ Netlify: Free tier (100GB bandwidth/month)
- ✅ Total: **$0/month** (with free tiers)

## 📚 Documentation
- Full guide: `DEPLOYMENT.md`
- Quick start: `QUICKSTART.md`
- Build details: `BUILD_SUMMARY.md`

## 🧪 Testing After Deployment

1. Visit your Netlify URL
2. Wait ~30s on first load (backend waking up)
3. Check DevTools Network tab - API key should NOT be visible
4. Test switching chains (SOL, ETH, etc.)
5. Test row selection and export

## 🐛 Troubleshooting

**502/503 Errors?**
→ Backend is waking up from sleep (wait 30s)

**CORS Errors?**
→ Verify `FRONTEND_URL` in Render matches your Netlify URL exactly

**No Data Loading?**
→ Check `API_URL` in Netlify points to your Render URL

**Build Failures?**
→ Check build logs in respective dashboards

---

Ready to deploy? Follow the checklist above or see `DEPLOYMENT.md` for detailed instructions.
