import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimiter, createRateLimiter } from '../rate-limit';

describe('RateLimiter', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start with max tokens', () => {
    const limiter = new RateLimiter({ maxTokens: 10, refillRate: 1, refillInterval: 1000 });
    const result = limiter.check('test-key');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(10);
  });

  it('should decrement tokens on consume', () => {
    const limiter = new RateLimiter({ maxTokens: 10, refillRate: 1, refillInterval: 1000 });
    const result = limiter.consume('test-key');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
  });

  it('should reject when tokens exhausted', () => {
    const limiter = new RateLimiter({ maxTokens: 2, refillRate: 1, refillInterval: 1000 });
    limiter.consume('test-key');
    limiter.consume('test-key');
    const result = limiter.consume('test-key');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should refill tokens after interval', () => {
    const limiter = new RateLimiter({ maxTokens: 10, refillRate: 2, refillInterval: 1000 });
    limiter.consume('test-key');
    limiter.consume('test-key');
    limiter.consume('test-key');
    expect(limiter.check('test-key').remaining).toBe(7);

    vi.advanceTimersByTime(1000);
    const result = limiter.check('test-key');
    expect(result.remaining).toBe(9);
  });

  it('should track different keys independently', () => {
    const limiter = new RateLimiter({ maxTokens: 5, refillRate: 1, refillInterval: 1000 });
    limiter.consume('key-a');
    limiter.consume('key-a');
    limiter.consume('key-b');

    expect(limiter.check('key-a').remaining).toBe(3);
    expect(limiter.check('key-b').remaining).toBe(4);
  });

  it('should not consume tokens on check', () => {
    const limiter = new RateLimiter({ maxTokens: 10, refillRate: 1, refillInterval: 1000 });
    limiter.check('test-key');
    limiter.check('test-key');
    limiter.check('test-key');
    expect(limiter.check('test-key').remaining).toBe(10);
  });

  it('should not exceed max tokens on refill', () => {
    const limiter = new RateLimiter({ maxTokens: 10, refillRate: 5, refillInterval: 1000 });
    vi.advanceTimersByTime(5000);
    const result = limiter.check('test-key');
    expect(result.remaining).toBe(10);
  });
});

describe('createRateLimiter', () => {
  it('should create a rate limiter with provided options', () => {
    const limiter = createRateLimiter({ maxTokens: 100, refillRate: 10, refillInterval: 60000 });
    expect(limiter).toBeInstanceOf(RateLimiter);
  });
});
