/**
 * TMDB API Rate Limiter
 * 
 * Protects against hitting TMDB rate limits (40 req/10s)
 * Uses safe buffer of 30 req/10s (75% capacity)
 * 
 * Features:
 * - Request queue with concurrency limit
 * - Sliding window rate limiting
 * - Auto-retry on 429 errors
 * - Exponential backoff
 */

interface QueueItem {
  fn: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
}

class TMDBRateLimiter {
  private queue: QueueItem[] = [];
  private requestTimestamps: number[] = [];
  private processing = false;
  
  // Rate limit config
  private readonly MAX_REQUESTS = 30; // Safe buffer (TMDB limit is 40)
  private readonly WINDOW_MS = 10_000; // 10 seconds
  private readonly CONCURRENT = 3; // Max 3 concurrent requests
  private activeRequests = 0;

  /**
   * Add request to queue and wait for execution
   */
  async request<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  /**
   * Process queued requests with rate limiting
   */
  private async processQueue() {
    if (this.processing) return;
    this.processing = true;

    while (this.queue.length > 0 && this.activeRequests < this.CONCURRENT) {
      const now = Date.now();

      // Clean up old timestamps (outside window)
      this.requestTimestamps = this.requestTimestamps.filter(
        ts => now - ts < this.WINDOW_MS
      );

      // Check if we're at the rate limit
      if (this.requestTimestamps.length >= this.MAX_REQUESTS) {
        const oldestRequest = this.requestTimestamps[0];
        const waitMs = this.WINDOW_MS - (now - oldestRequest);
        
        console.warn(`⏳ TMDB rate limit approaching, waiting ${waitMs}ms`);
        await this.sleep(waitMs);
        continue;
      }

      // Get next item from queue
      const item = this.queue.shift();
      if (!item) break;

      // Execute request
      this.activeRequests++;
      this.requestTimestamps.push(Date.now());

      this.executeRequest(item)
        .finally(() => {
          this.activeRequests--;
          this.processQueue(); // Process next item
        });
    }

    this.processing = false;
  }

  /**
   * Execute single request with retry logic
   */
  private async executeRequest(item: QueueItem) {
    try {
      const result = await this.executeWithRetry(item.fn);
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    }
  }

  /**
   * Execute function with exponential backoff on 429
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    attempt = 1,
    maxAttempts = 3
  ): Promise<T> {
    try {
      return await fn();
    } catch (error: any) {
      // TMDB rate limit exceeded (429)
      if (error.status === 429 && attempt < maxAttempts) {
        const retryAfter = parseInt(error.headers?.get?.('Retry-After') || '60', 10);
        const backoffMs = Math.min(retryAfter * 1000, 60000); // Max 60s
        
        console.warn(
          `⚠️  TMDB 429 (rate limit) - retrying after ${backoffMs}ms (attempt ${attempt}/${maxAttempts})`
        );
        
        await this.sleep(backoffMs);
        return this.executeWithRetry(fn, attempt + 1, maxAttempts);
      }

      // Other errors or max attempts reached
      throw error;
    }
  }

  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current queue status (for monitoring)
   */
  getStatus() {
    const now = Date.now();
    const recentRequests = this.requestTimestamps.filter(
      ts => now - ts < this.WINDOW_MS
    ).length;

    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      recentRequests,
      requestsRemaining: Math.max(0, this.MAX_REQUESTS - recentRequests),
      windowMs: this.WINDOW_MS,
    };
  }
}

// Singleton instance
export const tmdbRateLimiter = new TMDBRateLimiter();

/**
 * Fetch from TMDB with rate limiting
 */
export async function fetchFromTMDB<T>(url: string): Promise<T> {
  return tmdbRateLimiter.request(async () => {
    const response = await fetch(url);

    if (!response.ok) {
      const error: any = new Error(`TMDB API error: ${response.statusText}`);
      error.status = response.status;
      error.headers = response.headers;
      throw error;
    }

    return response.json() as Promise<T>;
  });
}
