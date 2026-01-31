import { and, eq, isNull } from "drizzle-orm";
import { db as defaultDb } from "../db/client";
import { shares } from "../db/schema";
import {
  createCryptoConfig,
  hashToken,
  type CryptoConfig,
  loadCryptoConfig,
} from "./crypto";
import { isValidShareToken } from "./share-token";

export type ShareAccessRecord = {
  id: string;
  pasteId: string;
  oneTime: boolean;
};

export type ShareAccessDeps = {
  db?: typeof defaultDb;
  cryptoConfig?: CryptoConfig;
  now?: number;
};

const resolveCryptoConfig = (
  cryptoConfig?: CryptoConfig
): CryptoConfig => {
  if (cryptoConfig) {
    return cryptoConfig;
  }
  return loadCryptoConfig();
};

const resolveTokenHashes = (token: string, config: CryptoConfig) => {
  const prefixed = hashToken(token, config);
  const raw = prefixed.includes(":") ? prefixed.split(":")[1] : prefixed;
  return { prefixed, raw };
};

export const resolveShareAccess = (
  token: string,
  deps: ShareAccessDeps = {}
): ShareAccessRecord | null => {
  if (!isValidShareToken(token)) {
    return null;
  }

  const db = deps.db ?? defaultDb;
  const config = resolveCryptoConfig(deps.cryptoConfig);
  const { prefixed, raw } = resolveTokenHashes(token, config);
  const now = deps.now ?? Date.now();

  let share = db
    .select()
    .from(shares)
    .where(eq(shares.tokenHash, prefixed))
    .get();

  if (!share && raw !== prefixed) {
    share = db
      .select()
      .from(shares)
      .where(eq(shares.tokenHash, raw))
      .get();
  }

  if (!share) {
    return null;
  }

  if (share.revokedAt !== null && share.revokedAt !== undefined) {
    return null;
  }

  if (share.expiresAt !== null && share.expiresAt !== undefined) {
    if (share.expiresAt <= now) {
      return null;
    }
  }

  if (share.oneTime) {
    const result = db
      .update(shares)
      .set({
        lastAccessAt: now,
        revokedAt: now,
      })
      .where(and(eq(shares.id, share.id), isNull(shares.revokedAt)))
      .run();

    if (result.changes === 0) {
      return null;
    }
  } else {
    db.update(shares)
      .set({ lastAccessAt: now })
      .where(eq(shares.id, share.id))
      .run();
  }

  return {
    id: share.id,
    pasteId: share.pasteId,
    oneTime: share.oneTime,
  };
};

export const createShareAccessConfig = (input: {
  encryptionKey: string | Buffer;
  tokenHashSecret: string | Buffer;
}) =>
  createCryptoConfig({
    encryptionKey: input.encryptionKey,
    tokenHashSecret: input.tokenHashSecret,
  });
