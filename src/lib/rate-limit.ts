import {
  RateLimiterMemory,
  type RateLimiterRes,
} from "rate-limiter-flexible";

export type RateLimitScope = "ip" | "account" | "ip_account";

export type RateLimitConfig = {
  points: number;
  durationSec: number;
  blockDurationSec?: number;
  keyPrefix?: string;
  scope: RateLimitScope;
};

export type RateLimitIdentity = {
  ip?: string;
  accountId?: string;
};

export type RateLimiterInstance = {
  limiter: RateLimiterMemory;
  config: RateLimitConfig;
};

export type RateLimitDecision = {
  allowed: boolean;
  key: string;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterMs?: number;
  consumedPoints: number;
};

export type RateLimitErrorBody = {
  error: {
    code: "RATE_LIMITED";
    message: string;
    status: 429;
    limit: number;
    remaining: number;
    resetAt: number;
    retryAfterMs?: number;
  };
};

const DEFAULT_KEY_PREFIX = "rl";

export const createRateLimiter = (
  config: RateLimitConfig
): RateLimiterInstance => ({
  limiter: new RateLimiterMemory({
    points: config.points,
    duration: config.durationSec,
    blockDuration: config.blockDurationSec,
    keyPrefix: config.keyPrefix ?? DEFAULT_KEY_PREFIX,
  }),
  config,
});

export const buildRateLimitKey = (
  config: RateLimitConfig,
  identity: RateLimitIdentity
): string => {
  const prefix = config.keyPrefix ?? DEFAULT_KEY_PREFIX;
  switch (config.scope) {
    case "ip":
      return `${prefix}:ip:${identity.ip ?? "unknown"}`;
    case "account":
      return `${prefix}:account:${identity.accountId ?? "unknown"}`;
    case "ip_account":
      return `${prefix}:ip_account:${identity.ip ?? "unknown"}:${
        identity.accountId ?? "unknown"
      }`;
    default:
      return `${prefix}:unknown`;
  }
};

const toDecision = (
  result: RateLimiterRes,
  allowed: boolean,
  key: string,
  limit: number
): RateLimitDecision => ({
  allowed,
  key,
  limit,
  remaining: result.remainingPoints,
  resetAt: Date.now() + result.msBeforeNext,
  retryAfterMs: allowed ? undefined : Math.max(0, result.msBeforeNext),
  consumedPoints: result.consumedPoints,
});

const isRateLimiterRes = (value: unknown): value is RateLimiterRes => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as RateLimiterRes;
  return (
    typeof candidate.msBeforeNext === "number" &&
    typeof candidate.remainingPoints === "number" &&
    typeof candidate.consumedPoints === "number"
  );
};

export const consumeRateLimit = async (
  instance: RateLimiterInstance,
  key: string,
  points = 1
): Promise<RateLimitDecision> => {
  try {
    const result = await instance.limiter.consume(key, points);
    return toDecision(result, true, key, instance.config.points);
  } catch (error) {
    if (!isRateLimiterRes(error)) {
      throw error;
    }
    return toDecision(error, false, key, instance.config.points);
  }
};

export const createRateLimitError = (
  decision: RateLimitDecision
): RateLimitErrorBody => ({
  error: {
    code: "RATE_LIMITED",
    message: "Too many requests",
    status: 429,
    limit: decision.limit,
    remaining: decision.remaining,
    resetAt: decision.resetAt,
    retryAfterMs: decision.retryAfterMs,
  },
});
