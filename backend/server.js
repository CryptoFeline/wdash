import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables FIRST before any other imports that use them
dotenv.config();

import walletsRouter from './routes/wallets.js';
import healthRouter from './routes/health.js';
import prefetchRouter from './routes/prefetch.js';
import testStealthRouter from './routes/test-stealth.js';
import { requireApiKey } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  process.env.FRONTEND_URL, // Add your Netlify URL as environment variable
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
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

// API Key Authentication
app.use(requireApiKey);

// Routes
app.use('/api/wallets', walletsRouter);
app.use('/api/prefetch', prefetchRouter);
app.use('/api/test-stealth', testStealthRouter);
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
║   - GET /api/prefetch                    ║
║   - GET /api/prefetch/status             ║
║   - GET /api/test-stealth                ║
║   - GET /api/test-stealth/parallel       ║
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
