# 🔒 Security Implementation

## Issue Fixed: Unprotected API Routes

**Problem:** The Next.js API routes (`/api/wallets`, `/api/wallets/stats`) were publicly accessible without authentication, allowing anyone to use your backend and consume Browserless credits.

**Solution:** Implemented multi-layer authentication with middleware and environment variables.

---

## 🛡️ Security Architecture

### Layer 1: Next.js Middleware (Production Only)
- **File:** `frontend/src/middleware.ts`
- **Protection:** All `/api/*` routes require `x-api-key` header in production
- **Bypass:** Development mode allows unauthenticated access for testing

### Layer 2: API Route Validation
- **Files:** 
  - `frontend/src/app/api/wallets/route.ts`
  - `frontend/src/app/api/wallets/stats/route.ts`
- **Fallback:** Each route validates API key independently
- **Response:** Returns 401 Unauthorized if key missing/invalid

### Layer 3: Backend CORS
- **File:** `backend/server.js`
- **Protection:** Only allows requests from `FRONTEND_URL` domain
- **Validation:** Checks `X-API-Key` header for backend API access

---

## 🔑 Environment Variables

### Backend (`.env`)
```bash
# Backend API key (validates requests from frontend)
API_KEY=your-backend-api-key

# Allowed frontend domain (CORS)
FRONTEND_URL=https://your-app.netlify.app
```

### Frontend (`.env` or Netlify env vars)
```bash
# Backend URL (server-side only, not exposed to browser)
NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api

# Backend API key (server-side only, for calling backend)
API_KEY=same-as-backend-api-key

# Frontend API key (public, protects Next.js routes)
NEXT_PUBLIC_FRONTEND_API_KEY=your-frontend-api-key
```

---

## 🔐 Key Types

| Key Type | Purpose | Exposed to Browser? | Used For |
|----------|---------|---------------------|----------|
| `API_KEY` | Backend auth | ❌ No (server-side) | Next.js → Backend |
| `NEXT_PUBLIC_FRONTEND_API_KEY` | Frontend route protection | ✅ Yes (public) | Browser → Next.js |
| `BROWSERLESS_API_TOKEN` | Browserless.io | ❌ No (backend only) | Backend → Browserless |

---

## 📝 Generate API Keys

```bash
# Generate backend API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate frontend API key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Important:** Use different keys for backend and frontend!

---

## 🚀 Deployment Steps

### Netlify (Frontend)

1. Go to **Site settings** → **Environment variables**
2. Add variables:
   ```
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com/api
   API_KEY=your-backend-api-key
   NEXT_PUBLIC_FRONTEND_API_KEY=your-frontend-api-key
   ```
3. Trigger redeploy

### Render (Backend)

1. Go to **Environment** tab
2. Verify variables:
   ```
   API_KEY=your-backend-api-key
   FRONTEND_URL=https://your-app.netlify.app
   ```
3. Save (auto-redeploys)

---

## 🧪 Testing

### Development (No Auth Required)
```bash
# Local testing - no key needed
curl http://localhost:3000/api/wallets?chain=sol&timeframe=7d&tag=all
```

### Production (Auth Required)
```bash
# Production - requires key
curl -H "x-api-key: your-frontend-api-key" \
  https://your-app.netlify.app/api/wallets?chain=sol&timeframe=7d&tag=all

# Without key - should return 401
curl https://your-app.netlify.app/api/wallets?chain=sol&timeframe=7d&tag=all
# Response: {"error":"Unauthorized - Invalid or missing API key"}
```

---

## ⚠️ Security Best Practices

### ✅ DO:
- Rotate keys periodically (monthly recommended)
- Use different keys for backend and frontend
- Keep backend API key server-side only
- Monitor usage in Browserless dashboard
- Use HTTPS in production (Netlify provides SSL)

### ❌ DON'T:
- Commit `.env` files to git (use `.env.example`)
- Share API keys publicly or in screenshots
- Use same key for multiple environments
- Hard-code keys in source code
- Reuse keys across projects

---

## 🔄 Key Rotation

When rotating keys:

1. **Generate new keys:**
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Update Netlify:**
   - Site settings → Environment variables
   - Update `API_KEY` and `NEXT_PUBLIC_FRONTEND_API_KEY`
   - Trigger redeploy

3. **Update Render:**
   - Environment tab
   - Update `API_KEY`
   - Save (auto-redeploys)

4. **Wait for both deploys to complete** before removing old keys

---

## 📊 Security Checklist

- [x] Frontend API routes protected with middleware
- [x] API key validation in route handlers
- [x] CORS configured on backend
- [x] Backend API key not exposed to browser
- [x] Frontend API key can be rotated independently
- [x] `.env` files in `.gitignore`
- [x] `.env.example` files documented
- [x] Production-only authentication (dev mode unrestricted)

---

## 🐛 Troubleshooting

### "Unauthorized" errors in production

**Check:**
1. `NEXT_PUBLIC_FRONTEND_API_KEY` set in Netlify?
2. Key matches between API client and middleware?
3. Redeploy triggered after setting env vars?

**Solution:**
```bash
# Verify key is set (in Netlify dashboard)
# Trigger manual redeploy
# Clear browser cache
```

### Backend API calls failing

**Check:**
1. `API_KEY` matches between Netlify and Render?
2. `NEXT_PUBLIC_API_URL` points to correct backend?
3. CORS allows your Netlify domain?

**Solution:**
```bash
# Check Render logs for "Invalid API key" errors
# Verify FRONTEND_URL in Render matches Netlify domain exactly
```

### Development mode issues

**Remember:**
- Development bypasses auth checks
- Both `npm run dev` modes don't require keys
- Production builds enforce authentication

---

## 📚 Additional Resources

- **Netlify Env Vars:** https://docs.netlify.com/environment-variables/overview/
- **Next.js Middleware:** https://nextjs.org/docs/app/building-your-application/routing/middleware
- **Render Env Vars:** https://render.com/docs/environment-variables

---

**Security implemented! Your API routes are now protected.** 🎉
