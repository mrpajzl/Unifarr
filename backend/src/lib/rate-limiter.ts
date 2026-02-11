/**
 * Simple rate limiter for API calls
 * Ensures we don't exceed rate limits
 */

export class RateLimiter {
  private requests: number[] = [];
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number, windowMs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Wait if needed to respect rate limit
   */
  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    // If we've hit the limit, wait
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.windowMs - (now - oldestRequest) + 100; // +100ms buffer
      
      if (waitTime > 0) {
        console.log(`  ⏱️ Rate limit: waiting ${Math.round(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        // Clear old requests after waiting
        this.requests = [];
      }
    }
    
    // Record this request
    this.requests.push(Date.now());
  }

  /**
   * Reset the limiter
   */
  reset() {
    this.requests = [];
  }
}

/**
 * Create rate limiter for TMDB API
 * TMDB limit: 40 requests per 10 seconds
 * We use 30/10s to be safe
 */
export function createTMDBRateLimiter(): RateLimiter {
  return new RateLimiter(30, 10000);
}
