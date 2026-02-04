import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const KEY_HEX_LENGTH = 64;

function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex) {
    throw new Error('ENCRYPTION_KEY environment variable is not set');
  }
  if (keyHex.length !== KEY_HEX_LENGTH) {
    throw new Error(`ENCRYPTION_KEY must be ${KEY_HEX_LENGTH} hex characters (32 bytes)`);
  }
  return Buffer.from(keyHex, 'hex');
}

export function encrypt(plaintext: string): { encrypted: string; iv: string } {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  
  return {
    encrypted: `${ciphertext}:${authTag}`,
    iv: iv.toString('hex'),
  };
}

export function decrypt(encrypted: string, iv: string): string {
  const key = getEncryptionKey();
  const colonIndex = encrypted.lastIndexOf(':');
  if (colonIndex === -1) {
    throw new Error('Invalid encrypted format, expected "ciphertext:authTag"');
  }
  
  const ciphertext = encrypted.slice(0, colonIndex);
  const authTag = encrypted.slice(colonIndex + 1);
  
  if (!authTag) {
    throw new Error('Invalid encrypted format, expected "ciphertext:authTag"');
  }
  
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(authTag, 'hex'));
  
  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');
  
  return plaintext;
}
