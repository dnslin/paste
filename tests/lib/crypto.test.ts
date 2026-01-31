import test from "node:test";
import assert from "node:assert/strict";
import {
  CryptoError,
  createCryptoConfig,
  decryptContent,
  encryptContent,
  hashPassword,
  hashToken,
  verifyPassword,
  verifyToken,
} from "../../src/lib/crypto";

const baseConfig = createCryptoConfig({
  encryptionKey: Buffer.alloc(32, 7),
  tokenHashSecret: Buffer.from("super-secret-token-hash", "utf8"),
  password: {
    algorithm: "bcrypt",
    bcryptCost: 4,
  },
});

test("encrypt/decrypt roundtrip", () => {
  const plaintext = "hello crypto";
  const encrypted = encryptContent(plaintext, baseConfig);
  const decrypted = decryptContent(encrypted, baseConfig);
  assert.equal(decrypted.toString("utf8"), plaintext);
});

test("token hash verify supports prefixed and raw digests", () => {
  const token = "token-value";
  const digest = hashToken(token, baseConfig);
  const raw = digest.split(":")[1];

  assert.equal(verifyToken(token, digest, baseConfig), true);
  assert.equal(verifyToken(token, raw, baseConfig), true);
  assert.equal(verifyToken("other", digest, baseConfig), false);
});

test("password hash verify (bcrypt)", async () => {
  const password = "super-secret";
  const digest = await hashPassword(password, baseConfig);
  assert.equal(await verifyPassword(password, digest, baseConfig), true);
  assert.equal(await verifyPassword("wrong", digest, baseConfig), false);
});

test("encrypt fails with invalid key length", () => {
  const badConfig = {
    ...baseConfig,
    encryptionKey: Buffer.alloc(31, 1),
  };
  assert.throws(
    () => encryptContent("oops", badConfig),
    (err) => err instanceof CryptoError && err.code === "INVALID_KEY"
  );
});

test("decrypt fails with invalid iv length", () => {
  const encrypted = encryptContent("payload", baseConfig);
  const badInput = {
    ...encrypted,
    iv: Buffer.alloc(baseConfig.ivLength - 1, 0),
  };
  assert.throws(
    () => decryptContent(badInput, baseConfig),
    (err) => err instanceof CryptoError && err.code === "INVALID_IV"
  );
});
