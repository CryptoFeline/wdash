/**
 * API Key Authentication Middleware
 */

export function requireApiKey(req, res, next) {
  // Load API key here, not at module level
  const API_KEY = process.env.API_KEY;
  
  // Skip auth for health check
  if (req.path === '/api/health' || req.path === '/api/chains' || req.path === '/api/tags') {
    return next();
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required. Please provide X-API-Key header.'
    });
  }

  if (apiKey !== API_KEY) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Invalid API key'
    });
  }

  next();
}
