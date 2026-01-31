import test from "node:test";
import assert from "node:assert/strict";
import { buildCsp, getSecurityHeaders } from "../../src/lib/security-headers";

test("buildCsp adds dev allowances", () => {
  const csp = buildCsp({ isDev: true });
  assert.match(csp, /unsafe-eval/);
  assert.match(csp, /connect-src[^;]*ws:/);
});

test("buildCsp omits dev allowances in production", () => {
  const csp = buildCsp({ isDev: false });
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.doesNotMatch(csp, /connect-src[^;]*ws:/);
});

test("getSecurityHeaders includes required keys", () => {
  const headers = getSecurityHeaders({ isDev: true });
  const keys = headers.map((header) => header.key);
  assert.ok(keys.includes("Content-Security-Policy"));
  assert.ok(keys.includes("X-Content-Type-Options"));
  assert.ok(keys.includes("Referrer-Policy"));
});
