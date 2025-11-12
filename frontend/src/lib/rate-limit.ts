/**
 * Simple in-memory rate limiter
 * Tracks requests per IP address
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (entry.resetTime < now) {
      rateLimitMap.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if request is within rate limit
 * @param ip - IP address (from headers)
 * @param limit - Max requests per window
 * @param windowMs - Time window in milliseconds
 * @returns { allowed: boolean, remaining: number, resetTime: number }
 */
export function checkRateLimit(
  ip: string,
  limit: number = 100,
  windowMs: number = 60 * 1000 // 1 minute default
) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || entry.resetTime < now) {
    // New window or expired
    rateLimitMap.set(ip, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime: now + windowMs,
    };
  }

  // Existing window
  entry.count++;
  const allowed = entry.count <= limit;

  return {
    allowed,
    remaining: Math.max(0, limit - entry.count),
    resetTime: entry.resetTime,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: any): string {
  // Try different header names (different proxies use different ones)
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    request.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}
