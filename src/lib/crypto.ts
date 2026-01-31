import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const DEFAULT_IV_LENGTH = 12;
const DEFAULT_TAG_LENGTH = 16;
const DEFAULT_BCRYPT_COST = 12;
const DEFAULT_ARGON2_TIME_COST = 3;
const DEFAULT_ARGON2_MEMORY_KB = 65536;
const DEFAULT_ARGON2_PARALLELISM = 1;

export type PasswordHashAlgorithm = "argon2id" | "bcrypt";

export type PasswordHashConfig = {
  algorithm: PasswordHashAlgorithm;
  bcryptCost: number;
  argon2: {
    timeCost: number;
    memoryCost: number;
    parallelism: number;
  };
};

export type CryptoConfig = {
  encryptionKey: Buffer;
  encryptionAlgorithm: "aes-256-gcm";
  ivLength: number;
  tagLength: number;
  tokenHashSecret: Buffer;
  password: PasswordHashConfig;
};

export type PasswordHashConfigInput = {
  algorithm?: PasswordHashAlgorithm;
  bcryptCost?: number;
  argon2?: Partial<PasswordHashConfig["argon2"]>;
};

export type CryptoConfigInput = {
  encryptionKey: string | Buffer;
  tokenHashSecret: string | Buffer;
  encryptionAlgorithm?: "aes-256-gcm";
  ivLength?: number;
  tagLength?: number;
  password?: PasswordHashConfigInput;
};

export type EncryptionResult = {
  ciphertext: Buffer;
  iv: Buffer;
  tag: Buffer;
};

export type CryptoLogger = {
  info?: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
  error?: (message: string, meta?: Record<string, unknown>) => void;
};

export type CryptoErrorCode =
  | "CONFIG_ERROR"
  | "INVALID_KEY"
  | "INVALID_IV"
  | "INVALID_TAG"
  | "ENCRYPT_FAILED"
  | "DECRYPT_FAILED"
  | "HASH_FAILED"
  | "VERIFY_FAILED"
  | "UNSUPPORTED_PASSWORD_HASH";

export class CryptoError extends Error {
  code: CryptoErrorCode;

  constructor(code: CryptoErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "CryptoError";
    this.code = code;
    if (cause !== undefined) {
      (this as { cause?: unknown }).cause = cause;
    }
  }
}

const noop = () => {};
const defaultLogger: Required<CryptoLogger> = {
  info: noop,
  warn: noop,
  error: noop,
};

const resolveLogger = (logger?: CryptoLogger): Required<CryptoLogger> => ({
  info: logger?.info ?? defaultLogger.info,
  warn: logger?.warn ?? defaultLogger.warn,
  error: logger?.error ?? defaultLogger.error,
});

const isHex = (value: string) => /^[0-9a-f]+$/i.test(value);

const parseBuffer = (value: string): Buffer => {
  if (value.startsWith("base64:")) {
    return Buffer.from(value.slice("base64:".length), "base64");
  }
  if (value.startsWith("hex:")) {
    return Buffer.from(value.slice("hex:".length), "hex");
  }
  if (value.length % 2 === 0 && isHex(value)) {
    return Buffer.from(value, "hex");
  }
  return Buffer.from(value, "utf8");
};

const ensurePositiveInt = (value: number, name: string) => {
  if (!Number.isInteger(value) || value <= 0) {
    throw new CryptoError("CONFIG_ERROR", `${name} must be a positive integer`);
  }
  return value;
};

const parseEnvPositiveInt = (value: string | undefined, fallback: number, name: string) => {
  if (value === undefined || value === "") {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new CryptoError("CONFIG_ERROR", `${name} must be a positive integer`);
  }
  return parsed;
};

const requireEnv = (name: string) => {
  const value = process.env[name];
  if (!value) {
    throw new CryptoError("CONFIG_ERROR", `${name} is required`);
  }
  return value;
};

const parseKey = (value: string | Buffer, name: string, length: number) => {
  const buffer = Buffer.isBuffer(value) ? value : parseBuffer(value);
  if (buffer.length !== length) {
    throw new CryptoError(
      "INVALID_KEY",
      `${name} must be ${length} bytes after decoding`
    );
  }
  return buffer;
};

const parseSecret = (value: string | Buffer, name: string) => {
  const buffer = Buffer.isBuffer(value) ? value : parseBuffer(value);
  if (buffer.length < 16) {
    throw new CryptoError(
      "CONFIG_ERROR",
      `${name} must be at least 16 bytes after decoding`
    );
  }
  return buffer;
};

const normalizePasswordAlgorithm = (value?: string): PasswordHashAlgorithm => {
  const normalized = (value ?? "argon2id").toLowerCase();
  if (normalized === "argon2id" || normalized === "bcrypt") {
    return normalized;
  }
  throw new CryptoError(
    "CONFIG_ERROR",
    `Unsupported password hash algorithm: ${value}`
  );
};

/**
 * Build a validated crypto configuration from raw input values.
 *
 * @param input - Raw config values (string or Buffer for secrets).
 * @returns Validated crypto configuration.
 * @throws CryptoError when configuration values are invalid.
 */
export const createCryptoConfig = (input: CryptoConfigInput): CryptoConfig => {
  const encryptionAlgorithm = input.encryptionAlgorithm ?? "aes-256-gcm";
  if (encryptionAlgorithm !== "aes-256-gcm") {
    throw new CryptoError(
      "CONFIG_ERROR",
      `Unsupported encryption algorithm: ${encryptionAlgorithm}`
    );
  }

  const ivLength = ensurePositiveInt(
    input.ivLength ?? DEFAULT_IV_LENGTH,
    "ivLength"
  );
  if (ivLength < 12 || ivLength > 16) {
    throw new CryptoError(
      "CONFIG_ERROR",
      "ivLength must be between 12 and 16 bytes"
    );
  }

  const tagLength = ensurePositiveInt(
    input.tagLength ?? DEFAULT_TAG_LENGTH,
    "tagLength"
  );
  if (tagLength !== 16) {
    throw new CryptoError("CONFIG_ERROR", "tagLength must be 16 bytes");
  }

  const passwordAlgorithm = normalizePasswordAlgorithm(input.password?.algorithm);
  const bcryptCost = ensurePositiveInt(
    input.password?.bcryptCost ?? DEFAULT_BCRYPT_COST,
    "bcryptCost"
  );

  const argon2 = {
    timeCost: ensurePositiveInt(
      input.password?.argon2?.timeCost ?? DEFAULT_ARGON2_TIME_COST,
      "argon2.timeCost"
    ),
    memoryCost: ensurePositiveInt(
      input.password?.argon2?.memoryCost ?? DEFAULT_ARGON2_MEMORY_KB,
      "argon2.memoryCost"
    ),
    parallelism: ensurePositiveInt(
      input.password?.argon2?.parallelism ?? DEFAULT_ARGON2_PARALLELISM,
      "argon2.parallelism"
    ),
  };

  return {
    encryptionKey: parseKey(input.encryptionKey, "encryptionKey", 32),
    tokenHashSecret: parseSecret(input.tokenHashSecret, "tokenHashSecret"),
    encryptionAlgorithm,
    ivLength,
    tagLength,
    password: {
      algorithm: passwordAlgorithm,
      bcryptCost,
      argon2,
    },
  };
};

/**
 * Load crypto configuration from environment variables.
 *
 * @returns Validated crypto configuration.
 * @throws CryptoError when required environment variables are missing or invalid.
 */
export const loadCryptoConfig = (): CryptoConfig =>
  createCryptoConfig({
    encryptionKey: requireEnv("PASTE_ENCRYPTION_KEY"),
    tokenHashSecret: requireEnv("PASTE_TOKEN_HASH_SECRET"),
    encryptionAlgorithm: (process.env.PASTE_ENCRYPTION_ALGORITHM ??
      "aes-256-gcm") as "aes-256-gcm",
    ivLength: parseEnvPositiveInt(
      process.env.PASTE_ENCRYPTION_IV_BYTES,
      DEFAULT_IV_LENGTH,
      "PASTE_ENCRYPTION_IV_BYTES"
    ),
    tagLength: parseEnvPositiveInt(
      process.env.PASTE_ENCRYPTION_TAG_BYTES,
      DEFAULT_TAG_LENGTH,
      "PASTE_ENCRYPTION_TAG_BYTES"
    ),
    password: {
      algorithm: normalizePasswordAlgorithm(
        process.env.PASTE_PASSWORD_HASH_ALGORITHM
      ),
      bcryptCost: parseEnvPositiveInt(
        process.env.PASTE_BCRYPT_COST,
        DEFAULT_BCRYPT_COST,
        "PASTE_BCRYPT_COST"
      ),
      argon2: {
        timeCost: parseEnvPositiveInt(
          process.env.PASTE_ARGON2_TIME_COST,
          DEFAULT_ARGON2_TIME_COST,
          "PASTE_ARGON2_TIME_COST"
        ),
        memoryCost: parseEnvPositiveInt(
          process.env.PASTE_ARGON2_MEMORY_KB,
          DEFAULT_ARGON2_MEMORY_KB,
          "PASTE_ARGON2_MEMORY_KB"
        ),
        parallelism: parseEnvPositiveInt(
          process.env.PASTE_ARGON2_PARALLELISM,
          DEFAULT_ARGON2_PARALLELISM,
          "PASTE_ARGON2_PARALLELISM"
        ),
      },
    },
  });

/**
 * Encrypt plaintext using AES-256-GCM and return ciphertext, IV, and tag.
 *
 * @param plaintext - Plaintext buffer or UTF-8 string.
 * @param config - Crypto configuration (defaults to env config).
 * @param logger - Optional logger for error reporting.
 * @returns Encryption result with ciphertext, IV, and tag.
 * @throws CryptoError when encryption fails or configuration is invalid.
 */
export const encryptContent = (
  plaintext: Buffer | string,
  config: CryptoConfig = loadCryptoConfig(),
  logger?: CryptoLogger
): EncryptionResult => {
  const log = resolveLogger(logger);
  if (config.encryptionKey.length !== 32) {
    throw new CryptoError("INVALID_KEY", "encryptionKey must be 32 bytes");
  }
  const iv = randomBytes(config.ivLength);
  const input = Buffer.isBuffer(plaintext)
    ? plaintext
    : Buffer.from(plaintext, "utf8");

  try {
    const cipher = createCipheriv(
      config.encryptionAlgorithm,
      config.encryptionKey,
      iv,
      { authTagLength: config.tagLength }
    );
    const ciphertext = Buffer.concat([cipher.update(input), cipher.final()]);
    const tag = cipher.getAuthTag();
    return { ciphertext, iv, tag };
  } catch (error) {
    log.error("Encryption failed", { error });
    throw new CryptoError("ENCRYPT_FAILED", "Encryption failed", error);
  }
};

/**
 * Decrypt ciphertext using AES-256-GCM.
 *
 * @param input - Ciphertext, IV, and tag buffers.
 * @param config - Crypto configuration (defaults to env config).
 * @param logger - Optional logger for error reporting.
 * @returns Decrypted plaintext as a buffer.
 * @throws CryptoError when decryption fails or inputs are invalid.
 */
export const decryptContent = (
  input: EncryptionResult,
  config: CryptoConfig = loadCryptoConfig(),
  logger?: CryptoLogger
): Buffer => {
  const log = resolveLogger(logger);
  if (config.encryptionKey.length !== 32) {
    throw new CryptoError("INVALID_KEY", "encryptionKey must be 32 bytes");
  }
  if (input.iv.length !== config.ivLength) {
    throw new CryptoError(
      "INVALID_IV",
      `iv must be ${config.ivLength} bytes`
    );
  }
  if (input.tag.length !== config.tagLength) {
    throw new CryptoError(
      "INVALID_TAG",
      `tag must be ${config.tagLength} bytes`
    );
  }

  try {
    const decipher = createDecipheriv(
      config.encryptionAlgorithm,
      config.encryptionKey,
      input.iv,
      { authTagLength: config.tagLength }
    );
    decipher.setAuthTag(input.tag);
    return Buffer.concat([
      decipher.update(input.ciphertext),
      decipher.final(),
    ]);
  } catch (error) {
    log.warn("Decryption failed", { error });
    throw new CryptoError("DECRYPT_FAILED", "Decryption failed", error);
  }
};

const TOKEN_HASH_PREFIX = "hmac-sha256";

/**
 * Hash a token or management key using HMAC-SHA256.
 *
 * @param value - Token or key value.
 * @param config - Crypto configuration (defaults to env config).
 * @param logger - Optional logger for error reporting.
 * @returns Prefixed digest string.
 * @throws CryptoError when hashing fails.
 */
export const hashToken = (
  value: string,
  config: CryptoConfig = loadCryptoConfig(),
  logger?: CryptoLogger
): string => {
  const log = resolveLogger(logger);
  try {
    const digest = createHmac("sha256", config.tokenHashSecret)
      .update(value)
      .digest("hex");
    return `${TOKEN_HASH_PREFIX}:${digest}`;
  } catch (error) {
    log.error("Token hash failed", { error });
    throw new CryptoError("HASH_FAILED", "Token hash failed", error);
  }
};

const timingSafeEqualString = (a: string, b: string) => {
  const bufferA = Buffer.from(a, "utf8");
  const bufferB = Buffer.from(b, "utf8");
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  return timingSafeEqual(bufferA, bufferB);
};

/**
 * Verify a token or management key against a stored digest.
 *
 * @param value - Token or key value.
 * @param digest - Stored digest (prefixed or raw).
 * @param config - Crypto configuration (defaults to env config).
 * @param logger - Optional logger for error reporting.
 * @returns True when digest matches, otherwise false.
 * @throws CryptoError when verification fails unexpectedly.
 */
export const verifyToken = (
  value: string,
  digest: string,
  config: CryptoConfig = loadCryptoConfig(),
  logger?: CryptoLogger
): boolean => {
  const log = resolveLogger(logger);
  try {
    const rawDigest = createHmac("sha256", config.tokenHashSecret)
      .update(value)
      .digest("hex");
    if (digest.includes(":")) {
      const [prefix] = digest.split(":", 1);
      if (prefix !== TOKEN_HASH_PREFIX) {
        return false;
      }
      const expected = `${TOKEN_HASH_PREFIX}:${rawDigest}`;
      return timingSafeEqualString(expected, digest);
    }
    return timingSafeEqualString(rawDigest, digest);
  } catch (error) {
    log.warn("Token verify failed", { error });
    throw new CryptoError("VERIFY_FAILED", "Token verify failed", error);
  }
};

let cachedArgon2: typeof import("argon2") | null = null;
let cachedBcrypt: typeof import("bcrypt") | null = null;

const loadArgon2 = async () => {
  if (!cachedArgon2) {
    cachedArgon2 = await import("argon2");
  }
  return cachedArgon2;
};

const loadBcrypt = async () => {
  if (!cachedBcrypt) {
    cachedBcrypt = await import("bcrypt");
  }
  return cachedBcrypt;
};

const detectPasswordAlgorithm = (
  digest: string,
  fallback: PasswordHashAlgorithm
): PasswordHashAlgorithm => {
  if (digest.startsWith("$argon2")) {
    return "argon2id";
  }
  if (digest.startsWith("$2")) {
    return "bcrypt";
  }
  return fallback;
};

/**
 * Hash a password using argon2id or bcrypt.
 *
 * @param password - Plaintext password.
 * @param config - Crypto configuration (defaults to env config).
 * @param logger - Optional logger for error reporting.
 * @returns Hashed password string.
 * @throws CryptoError when hashing fails.
 */
export const hashPassword = async (
  password: string,
  config: CryptoConfig = loadCryptoConfig(),
  logger?: CryptoLogger
): Promise<string> => {
  const log = resolveLogger(logger);
  try {
    if (config.password.algorithm === "argon2id") {
      const argon2 = await loadArgon2();
      return await argon2.hash(password, {
        type: argon2.argon2id,
        timeCost: config.password.argon2.timeCost,
        memoryCost: config.password.argon2.memoryCost,
        parallelism: config.password.argon2.parallelism,
      });
    }
    if (config.password.algorithm === "bcrypt") {
      const bcrypt = await loadBcrypt();
      return await bcrypt.hash(password, config.password.bcryptCost);
    }
    throw new CryptoError(
      "UNSUPPORTED_PASSWORD_HASH",
      `Unsupported password hash algorithm: ${config.password.algorithm}`
    );
  } catch (error) {
    log.error("Password hash failed", { error });
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError("HASH_FAILED", "Password hash failed", error);
  }
};

/**
 * Verify a plaintext password against a stored digest.
 *
 * @param password - Plaintext password.
 * @param digest - Stored hash digest.
 * @param config - Crypto configuration (defaults to env config).
 * @param logger - Optional logger for error reporting.
 * @returns True when password matches, otherwise false.
 * @throws CryptoError when verification fails unexpectedly.
 */
export const verifyPassword = async (
  password: string,
  digest: string,
  config: CryptoConfig = loadCryptoConfig(),
  logger?: CryptoLogger
): Promise<boolean> => {
  const log = resolveLogger(logger);
  const algorithm = detectPasswordAlgorithm(digest, config.password.algorithm);
  try {
    if (algorithm === "argon2id") {
      const argon2 = await loadArgon2();
      return await argon2.verify(digest, password);
    }
    if (algorithm === "bcrypt") {
      const bcrypt = await loadBcrypt();
      return await bcrypt.compare(password, digest);
    }
    throw new CryptoError(
      "UNSUPPORTED_PASSWORD_HASH",
      `Unsupported password hash algorithm: ${algorithm}`
    );
  } catch (error) {
    log.warn("Password verify failed", { error });
    if (error instanceof CryptoError) {
      throw error;
    }
    throw new CryptoError("VERIFY_FAILED", "Password verify failed", error);
  }
};
