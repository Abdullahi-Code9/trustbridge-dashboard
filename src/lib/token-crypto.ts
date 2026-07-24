import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const KEY_LENGTH = 32;
const ENCRYPTED_PREFIX = "v1:";

export class TokenEncryptionConfigError extends Error {}

/**
 * TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key, e.g.:
 *   openssl rand -base64 32
 * Fails closed (throws) rather than silently storing plaintext.
 */
function getEncryptionKey(): Buffer {
  const raw = process.env.TOKEN_ENCRYPTION_KEY?.trim();

  if (!raw) {
    throw new TokenEncryptionConfigError(
      "TOKEN_ENCRYPTION_KEY is not configured"
    );
  }

  let key: Buffer;
  try {
    key = Buffer.from(raw, "base64");
  } catch {
    throw new TokenEncryptionConfigError(
      "TOKEN_ENCRYPTION_KEY must be valid base64"
    );
  }

  if (key.length !== KEY_LENGTH) {
    throw new TokenEncryptionConfigError(
      `TOKEN_ENCRYPTION_KEY must decode to ${KEY_LENGTH} bytes (got ${key.length})`
    );
  }

  return key;
}

/** Encrypts a plaintext token for storage at rest. Format: v1:<iv>:<authTag>:<ciphertext> (base64 segments). */
export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX.slice(0, -1),
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function isEncryptedToken(value: string): boolean {
  return value.startsWith(ENCRYPTED_PREFIX);
}

/** Decrypts a token previously produced by encryptToken(). Throws on tampered/invalid ciphertext. */
export function decryptToken(encrypted: string): string {
  if (!isEncryptedToken(encrypted)) {
    throw new TokenEncryptionConfigError(
      "Value is not in the expected encrypted token format"
    );
  }

  const [, ivB64, authTagB64, ciphertextB64] = encrypted.split(":");
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new TokenEncryptionConfigError("Malformed encrypted token");
  }

  const key = getEncryptionKey();
  const iv = Buffer.from(ivB64, "base64");
  const authTag = Buffer.from(authTagB64, "base64");
  const ciphertext = Buffer.from(ciphertextB64, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const plaintext = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plaintext.toString("utf8");
}
