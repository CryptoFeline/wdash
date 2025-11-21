import NodeCache from 'node-cache';

// Cache TTL from environment or default 5 minutes
const CACHE_TTL = parseInt(process.env.CACHE_TTL || '300');

// Initialize cache
const cache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: 60,
  useClones: false // Performance optimization
});

// Mutex for preventing concurrent fetch requests (ETXTBSY prevention)
const fetchLocks = new Map();

/**
 * Acquire lock for a cache key to prevent concurrent fetches
 * @param {string} key - Cache key
 * @returns {Promise<boolean>} True if lock acquired, false if already locked
 */
export async function acquireLock(key) {
  if (fetchLocks.has(key)) {
    // Lock exists, return the existing promise
    console.log(`[Lock] WAIT: ${key} - Another fetch in progress`);
    return fetchLocks.get(key);
  }
  
  // Create new lock promise
  let resolver;
  const promise = new Promise((resolve) => {
    resolver = resolve;
  });
  promise.resolve = resolver;
  fetchLocks.set(key, promise);
  console.log(`[Lock] ACQUIRED: ${key}`);
  return null; // Null means we acquired the lock
}

/**
 * Release lock for a cache key
 * @param {string} key - Cache key
 */
export function releaseLock(key) {
  const promise = fetchLocks.get(key);
  if (promise) {
    fetchLocks.delete(key);
    promise.resolve?.(); // Resolve waiting promises
    console.log(`[Lock] RELEASED: ${key}`);
  }
}

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
 * Delete data from cache
 * @param {string} key - Cache key
 */
export function deleteCache(key) {
  cache.del(key);
  console.log(`[Cache] DELETED: ${key}`);
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
