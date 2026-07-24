import { randomBytes } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  decryptToken,
  encryptToken,
  isEncryptedToken,
  TokenEncryptionConfigError,
} from "@/lib/token-crypto";

const ORIGINAL_KEY = process.env.TOKEN_ENCRYPTION_KEY;

describe("token-crypto", () => {
  beforeEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = randomBytes(32).toString("base64");
  });

  afterEach(() => {
    process.env.TOKEN_ENCRYPTION_KEY = ORIGINAL_KEY;
  });

  it("round-trips a plaintext token through encrypt/decrypt (success path)", () => {
    const plaintext = "gho_super_secret_github_token";
    const encrypted = encryptToken(plaintext);

    expect(encrypted).not.toBe(plaintext);
    expect(isEncryptedToken(encrypted)).toBe(true);
    expect(decryptToken(encrypted)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext (random IV)", () => {
    const plaintext = "gho_same_token";
    expect(encryptToken(plaintext)).not.toBe(encryptToken(plaintext));
  });

  it("fails closed when TOKEN_ENCRYPTION_KEY is missing (failure path)", () => {
    delete process.env.TOKEN_ENCRYPTION_KEY;
    expect(() => encryptToken("token")).toThrow(TokenEncryptionConfigError);
  });

  it("fails closed when TOKEN_ENCRYPTION_KEY is the wrong length", () => {
    process.env.TOKEN_ENCRYPTION_KEY = Buffer.from("too-short").toString(
      "base64"
    );
    expect(() => encryptToken("token")).toThrow(TokenEncryptionConfigError);
  });

  it("rejects tampered ciphertext instead of returning garbage", () => {
    const encrypted = encryptToken("gho_secret");
    const parts = encrypted.split(":");
    // Flip the ciphertext segment so the GCM auth tag no longer matches.
    parts[3] = Buffer.from("tampered-ciphertext").toString("base64");
    const tampered = parts.join(":");

    expect(() => decryptToken(tampered)).toThrow();
  });

  it("rejects a value that was never encrypted", () => {
    expect(() => decryptToken("gho_plaintext_token")).toThrow(
      TokenEncryptionConfigError
    );
  });
});
