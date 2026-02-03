import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const VALID_KEY = 'a'.repeat(64);
const INVALID_KEY_SHORT = 'a'.repeat(32);

describe('crypto', () => {
  const originalEnv = process.env.ENCRYPTION_KEY;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.ENCRYPTION_KEY = originalEnv;
    } else {
      delete process.env.ENCRYPTION_KEY;
    }
  });

  describe('encrypt/decrypt round trip', () => {
    it('should encrypt and decrypt back to original plaintext', async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { encrypt, decrypt } = await import('../crypto');
      
      const plaintext = 'Hello, World!';
      const { encrypted, iv } = encrypt(plaintext);
      const decrypted = decrypt(encrypted, iv);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle unicode characters', async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { encrypt, decrypt } = await import('../crypto');
      
      const plaintext = '你好世界！🎉 émojis & spëcial çhars';
      const { encrypted, iv } = encrypt(plaintext);
      const decrypted = decrypt(encrypted, iv);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle empty string', async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { encrypt, decrypt } = await import('../crypto');
      
      const plaintext = '';
      const { encrypted, iv } = encrypt(plaintext);
      const decrypted = decrypt(encrypted, iv);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should handle large content', async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { encrypt, decrypt } = await import('../crypto');
      
      const plaintext = 'x'.repeat(100000);
      const { encrypted, iv } = encrypt(plaintext);
      const decrypted = decrypt(encrypted, iv);
      
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertext for same plaintext (random IV)', async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { encrypt } = await import('../crypto');
      
      const plaintext = 'test';
      const result1 = encrypt(plaintext);
      const result2 = encrypt(plaintext);
      
      expect(result1.encrypted).not.toBe(result2.encrypted);
      expect(result1.iv).not.toBe(result2.iv);
    });
  });

  describe('invalid key', () => {
    it('should throw when ENCRYPTION_KEY is not set', async () => {
      delete process.env.ENCRYPTION_KEY;
      const { encrypt } = await import('../crypto');
      
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY environment variable is not set');
    });

    it('should throw when ENCRYPTION_KEY is too short', async () => {
      process.env.ENCRYPTION_KEY = INVALID_KEY_SHORT;
      const { encrypt } = await import('../crypto');
      
      expect(() => encrypt('test')).toThrow('ENCRYPTION_KEY must be 64 hex characters');
    });
  });

  describe('tamper detection', () => {
    it('should fail to decrypt with modified ciphertext', async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { encrypt, decrypt } = await import('../crypto');
      
      const { encrypted, iv } = encrypt('secret data');
      const [ciphertext, authTag] = encrypted.split(':');
      const tamperedCiphertext = 'ff' + ciphertext.slice(2);
      const tamperedEncrypted = `${tamperedCiphertext}:${authTag}`;
      
      expect(() => decrypt(tamperedEncrypted, iv)).toThrow();
    });

    it('should fail to decrypt with modified auth tag', async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { encrypt, decrypt } = await import('../crypto');
      
      const { encrypted, iv } = encrypt('secret data');
      const [ciphertext, authTag] = encrypted.split(':');
      const tamperedAuthTag = 'ff' + authTag.slice(2);
      const tamperedEncrypted = `${ciphertext}:${tamperedAuthTag}`;
      
      expect(() => decrypt(tamperedEncrypted, iv)).toThrow();
    });

    it('should fail to decrypt with modified IV', async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { encrypt, decrypt } = await import('../crypto');
      
      const { encrypted, iv } = encrypt('secret data');
      const tamperedIv = 'ff' + iv.slice(2);
      
      expect(() => decrypt(encrypted, tamperedIv)).toThrow();
    });

    it('should throw on invalid encrypted format', async () => {
      process.env.ENCRYPTION_KEY = VALID_KEY;
      const { decrypt } = await import('../crypto');
      
      expect(() => decrypt('invalid-format', 'aabbccdd')).toThrow('Invalid encrypted format');
    });
  });
});
