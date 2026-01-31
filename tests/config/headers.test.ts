import test from "node:test";
import assert from "node:assert/strict";
import nextConfig from "../../next.config";

test("security headers apply to all routes", async () => {
  assert.ok(nextConfig.headers);
  const rules = await nextConfig.headers?.();
  assert.ok(rules);

  const allRoutes = rules?.find((rule) => rule.source === "/:path*");
  assert.ok(allRoutes);

  const keys = allRoutes?.headers.map((header) => header.key) ?? [];
  assert.ok(keys.includes("Content-Security-Policy"));
  assert.ok(keys.includes("X-Content-Type-Options"));
  assert.ok(keys.includes("Referrer-Policy"));
});
