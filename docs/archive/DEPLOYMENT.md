# Deployment Guide

## Quick Summary

1. **Push to GitHub**: `git init` → `git push`
2. **Deploy Backend to Render.com**: 
   - Root: `backend`
   - Build: `npm install`
   - Start: `npm start`
   - Add env vars (see below)
3. **Deploy Frontend to Netlify**:
   - Root: `frontend`
   - Build: `npm run build`
   - Publish: `frontend/.next`
   - Add env vars (see below)
4. **Update CORS**: Add Netlify URL to Render's `FRONTEND_URL` env var

---

## Prerequisites
- GitHub account
- Netlify account (free)
- Render account (free)

## Step 1: Push to GitHub

```bash
cd /gmgn-scraper/gmgn-dashboard
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/gmgn-dashboard.git
git push -u origin main
```

## Step 2: Deploy Backend to Render

1. Go to https://render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `gmgn-dashboard-backend`
   - **Region:** Choose closest to you
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** `Free`

5. Add Environment Variables:
   ```
   NODE_ENV=production
   PORT=3001
   API_KEY=88c090fb868f171d322e9cea5a8484dd10c05975e789a28238f2bb2428b06e84
   CACHE_TTL=300
   FRONTEND_URL=https://your-app-name.netlify.app
   ```
   
   **Important:** Replace `your-app-name.netlify.app` with your actual Netlify URL after Step 3

6. Click "Create Web Service"
7. Copy the backend URL (e.g., `https://gmgn-dashboard-backend.onrender.com`)

## Step 3: Deploy Frontend to Netlify

1. Go to https://netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect to GitHub and select your repository
4. Configure:
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/.next`
   - **Build settings:** Leave as default (Next.js detected automatically)

5. Add Environment Variables:
   ```
   API_URL=https://gmgn-dashboard-backend.onrender.com/api
   API_KEY=88c090fb868f171d322e9cea5a8484dd10c05975e789a28238f2bb2428b06e84
   ```

6. Click "Deploy site"

## Step 4: Update CORS on Backend

After getting your Netlify URL, update the backend environment variable:

1. Go to Render dashboard → Your service → Environment
2. Update `FRONTEND_URL` to your Netlify URL (e.g., `https://your-app-name.netlify.app`)
3. Save changes - Render will auto-redeploy

## Important Notes

### Render Free Tier
- Backend will sleep after 15 minutes of inactivity
- First request after sleep takes ~30 seconds to wake up
- Consider adding a ping service or upgrade to paid tier for always-on

### Netlify Configuration
- Automatic HTTPS
- Custom domain support
- Automatic deployments on git push

### Security
- Never commit `.env` files
- Rotate API keys regularly
- Use Render's environment variables dashboard for updates

## Testing

After deployment:
1. Visit your Netlify URL (e.g., `https://your-app-name.netlify.app`)
2. First load may be slow (backend waking up)
3. Check browser DevTools Network tab - API key should NOT be visible
4. Test wallet data loading

## Troubleshooting

### Backend 502/503 Errors
- Backend is waking up from sleep (wait 30s)
- Check Render logs for errors

### Frontend API Errors
- Verify `API_URL` environment variable is correct
- Check CORS configuration in backend
- Verify API_KEY matches on both services

### Build Failures
- Check build logs in Netlify/Render dashboards
- Ensure all dependencies are in package.json
- Verify Node version compatibility
