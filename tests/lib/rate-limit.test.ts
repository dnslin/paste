import test from "node:test";
import assert from "node:assert/strict";
import {
  buildRateLimitKey,
  createRateLimiter,
  consumeRateLimit,
  createRateLimitError,
} from "../../src/lib/rate-limit";

test("rate limit by ip blocks after points are consumed", async () => {
  const config = {
    points: 2,
    durationSec: 60,
    scope: "ip" as const,
    keyPrefix: "test",
  };
  const instance = createRateLimiter(config);
  const key = buildRateLimitKey(config, { ip: "127.0.0.1" });

  const first = await consumeRateLimit(instance, key);
  assert.equal(first.allowed, true);

  const second = await consumeRateLimit(instance, key);
  assert.equal(second.allowed, true);

  const third = await consumeRateLimit(instance, key);
  assert.equal(third.allowed, false);
  assert.equal(third.limit, 2);
  assert.equal(third.remaining, 0);
  assert.ok(third.retryAfterMs !== undefined);

  const error = createRateLimitError(third);
  assert.equal(error.error.code, "RATE_LIMITED");
  assert.equal(error.error.status, 429);
});

test("buildRateLimitKey supports account and ip_account scopes", () => {
  const accountConfig = {
    points: 1,
    durationSec: 30,
    scope: "account" as const,
    keyPrefix: "rl",
  };
  const ipAccountConfig = {
    points: 1,
    durationSec: 30,
    scope: "ip_account" as const,
    keyPrefix: "rl",
  };

  assert.equal(
    buildRateLimitKey(accountConfig, { accountId: "admin-1" }),
    "rl:account:admin-1"
  );
  assert.equal(
    buildRateLimitKey(ipAccountConfig, { ip: "1.2.3.4", accountId: "admin-2" }),
    "rl:ip_account:1.2.3.4:admin-2"
  );
});
