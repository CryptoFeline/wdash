import NodeCache from 'node-cache';

// Cache TTL from environment or default 5 minutes
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300');

// Initialize cache
const cache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: 60,
  useClones: false // Performance optimization
});

/**
 * Generate cache key
 * @param {string} chain - Blockchain
 * @param {string} timeframe - Time period
 * @param {string} tag - Tag filter
 * @returns {string} Cache key
 */
export function getCacheKey(chain, timeframe, tag = 'all') {
  return `${chain}:${timeframe}:${tag}`;
}

/**
 * Get data from cache
 * @param {string} key - Cache key
 * @returns {any} Cached data or undefined
 */
export function getCache(key) {
  const data = cache.get(key);
  if (data) {
    console.log(`[Cache] HIT: ${key}`);
  } else {
    console.log(`[Cache] MISS: ${key}`);
  }
  return data;
}

/**
 * Set data in cache
 * @param {string} key - Cache key
 * @param {any} value - Data to cache
 * @param {number} ttl - Optional custom TTL in seconds
 */
export function setCache(key, value, ttl = CACHE_TTL) {
  cache.set(key, value, ttl);
  console.log(`[Cache] SET: ${key} (TTL: ${ttl}s)`);
}

/**
 * Clear all cache
 */
export function clearCache() {
  cache.flushAll();
  console.log('[Cache] CLEARED');
}

/**
 * Get cache stats
 * @returns {Object} Cache statistics
 */
export function getCacheStats() {
  return cache.getStats();
}

export default cache;
