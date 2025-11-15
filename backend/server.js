import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports that use them
dotenv.config();

import walletsRouter from './routes/wallets.js';
import dbRouter from './routes/db.js';
import healthRouter from './routes/health.js';
import prefetchRouter from './routes/prefetch.js';
import syncRouter from './routes/sync.js';
import okxRouter from './routes/okx.js';
import analysisRouter from './routes/analysis.js';
import { requireApiKey } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3002',
  process.env.FRONTEND_URL, // Add your Netlify URL as environment variable
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Allow if in allowedOrigins list, or if localhost (dev), or if Netlify URL
    if (allowedOrigins.indexOf(origin) !== -1 || 
        process.env.NODE_ENV === 'development' ||
        (origin && origin.includes('netlify.app'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

// Health check (no auth required - used for keep-alive ping)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Key Authentication
app.use(requireApiKey);

// Routes
app.use('/api/wallets', walletsRouter);
app.use('/api/wallets/db', dbRouter); // Supabase direct access (before /api/wallets, more specific route first)
app.use('/api/prefetch', prefetchRouter);
app.use('/api/sync', syncRouter);
app.use('/api/okx', okxRouter); // OKX wallet data
app.use('/api/analysis', analysisRouter); // Analysis endpoints (trade reconstruction, metrics)
app.use('/api', healthRouter);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Dashboard API',
    version: '1.0.0',
    endpoints: {
      wallets: '/api/wallets?chain=eth&timeframe=7d&tag=all&page=1&limit=50',
      stats: '/api/wallets/stats?chain=eth&timeframe=7d&tag=all',
      health: '/api/health',
      chains: '/api/chains',
      tags: '/api/tags'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   Dashboard API Server                   ║
║   Running on http://localhost:${PORT}    ║
║                                          ║
║   Endpoints:                             ║
║   - GET /api/wallets                     ║
║   - GET /api/wallets/stats               ║
║   - GET /api/health                      ║
║   - GET /api/chains                      ║
║   - GET /api/tags                        ║
║   - POST /api/sync                       ║
║   - GET /api/prefetch                    ║
║   - GET /api/prefetch/status             ║
║   - GET /api/okx/wallet/:address         ║
╚══════════════════════════════════════════╝
  `);
  
  // Auto-prefetch cache on startup (background)
  if (process.env.AUTO_PREFETCH !== 'false') {
    console.log('[Server] Triggering background cache warming...');
    fetch(`http://localhost:${PORT}/api/prefetch`, {
      headers: { 'x-api-key': process.env.API_KEY }
    }).catch(err => {
      console.error('[Server] Prefetch trigger failed:', err.message);
    });
  }
});
