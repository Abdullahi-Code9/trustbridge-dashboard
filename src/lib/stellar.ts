import "server-only";

import { StrKey } from "stellar-sdk";

/**
 * Stellar address helpers that depend on stellar-sdk.
 * Server-only — never import this module from Client Components.
 */
export function normalizeStellarAddress(address: string): string {
  return address.trim();
}

export function isValidStellarAddress(address: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(normalizeStellarAddress(address));
  } catch {
    return false;
  }
}
