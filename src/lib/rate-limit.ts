export interface RateLimitOptions {
  maxTokens: number;
  refillRate: number;
  refillInterval: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

interface Bucket {
  tokens: number;
  lastRefill: number;
}

export class RateLimiter {
  private readonly maxTokens: number;
  private readonly refillRate: number;
  private readonly refillInterval: number;
  private readonly buckets: Map<string, Bucket> = new Map();

  constructor(options: RateLimitOptions) {
    this.maxTokens = options.maxTokens;
    this.refillRate = options.refillRate;
    this.refillInterval = options.refillInterval;
  }

  private getBucket(key: string): Bucket {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = { tokens: this.maxTokens, lastRefill: Date.now() };
      this.buckets.set(key, bucket);
    }
    return bucket;
  }

  private refill(bucket: Bucket): void {
    const now = Date.now();
    const elapsed = now - bucket.lastRefill;
    const intervals = Math.floor(elapsed / this.refillInterval);
    if (intervals > 0) {
      bucket.tokens = Math.min(this.maxTokens, bucket.tokens + intervals * this.refillRate);
      bucket.lastRefill = bucket.lastRefill + intervals * this.refillInterval;
    }
  }

  check(key: string): RateLimitResult {
    const bucket = this.getBucket(key);
    this.refill(bucket);
    const resetAt = bucket.lastRefill + this.refillInterval;
    return {
      allowed: bucket.tokens > 0,
      remaining: bucket.tokens,
      resetAt,
    };
  }

  consume(key: string): RateLimitResult {
    const bucket = this.getBucket(key);
    this.refill(bucket);
    const resetAt = bucket.lastRefill + this.refillInterval;
    if (bucket.tokens > 0) {
      bucket.tokens--;
      return { allowed: true, remaining: bucket.tokens, resetAt };
    }
    return { allowed: false, remaining: 0, resetAt };
  }
}

export function createRateLimiter(options: RateLimitOptions): RateLimiter {
  return new RateLimiter(options);
}

export default createRateLimiter({ maxTokens: 60, refillRate: 60, refillInterval: 60000 });
