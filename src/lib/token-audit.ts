import "server-only";

import { prisma } from "@/lib/prisma";

export type TokenAuditAction =
  | "token_encrypted_at_signin"
  | "token_encryption_skipped"
  | "token_decrypted"
  | "token_decrypt_failed";

/**
 * Best-effort audit trail for access-token lifecycle events (encrypt/decrypt).
 * Never throws — a logging failure must not block sign-in or token reads.
 */
export async function recordTokenAudit(
  userId: string,
  action: TokenAuditAction,
  success: boolean,
  detail?: string
): Promise<void> {
  try {
    await prisma.tokenAuditLog.create({
      data: { userId, action, success, detail },
    });
  } catch (error) {
    console.error("Failed to write token audit log", error);
  }
}
