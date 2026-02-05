import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter for API endpoints
const rateLimit = new Map();

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export function rateLimitMiddleware(
  request: NextRequest,
  limit: number = 100,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): { success: boolean; response?: NextResponse } {
  const clientIP = 
    request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    'unknown';

  const now = Date.now();
  const entry = rateLimit.get(clientIP) as RateLimitEntry;

  if (!entry || now > entry.resetTime) {
    // Reset or create new entry
    rateLimit.set(clientIP, {
      count: 1,
      resetTime: now + windowMs
    });
    return { success: true };
  }

  if (entry.count >= limit) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
            'Retry-After': Math.ceil((entry.resetTime - now) / 1000).toString()
          }
        }
      )
    };
  }

  entry.count++;
  return { success: true };
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimit.entries()) {
    if (now > entry.resetTime) {
      rateLimit.delete(key);
    }
  }
}, 5 * 60 * 1000); // Cleanup every 5 minutes
