import "server-only";

import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

/**
 * Hash an invite code using SHA-256. Codes are never stored in plaintext.
 */
export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Generate a single cryptographically random invite code (hex, 48 chars).
 */
export function generateInviteCode(): string {
  return randomBytes(24).toString("hex");
}

export interface CreateInviteInput {
  code: string;
  generatedById: string;
  expiresAt?: Date | null;
  batchLabel?: string | null;
}

/**
 * Persist a single invite in the database. The code is hashed before storage.
 * Returns the raw (unhashed) code for display/revocation, plus the DB record.
 */
export async function createInvite(input: CreateInviteInput) {
  const codeHash = hashInviteCode(input.code);

  const invite = await prisma.invite.create({
    data: {
      codeHash,
      generatedById: input.generatedById,
      expiresAt: input.expiresAt ?? null,
      batchLabel: input.batchLabel ?? null,
    },
  });

  return invite;
}

export interface PersistedInvite {
  id: string;
  codeHash: string;
  batchLabel: string | null;
  expiresAt: Date | null;
  used: boolean;
  usedAt: Date | null;
  createdAt: Date;
}

/**
 * List all invites for a user with pagination.
 */
export async function listInvites(
  generatedById: string,
  page: number = 1,
  pageSize: number = 20
): Promise<{ invites: PersistedInvite[]; total: number; totalPages: number }> {
  const skip = (page - 1) * pageSize;
  const safePageSize = Math.min(Math.max(1, pageSize), 100);

  const [invites, total] = await Promise.all([
    prisma.invite.findMany({
      where: { generatedById },
      orderBy: { createdAt: "desc" },
      skip,
      take: safePageSize,
    }),
    prisma.invite.count({ where: { generatedById } }),
  ]);

  return {
    invites,
    total,
    totalPages: Math.ceil(total / safePageSize),
  };
}

/**
 * Look up a single invite by its raw code (hashes and checks).
 * Returns null if not found or already expired.
 */
export async function findInviteByCode(code: string) {
  const codeHash = hashInviteCode(code);
  const invite = await prisma.invite.findUnique({ where: { codeHash } });

  if (!invite) return null;

  // Check expiry
  if (invite.expiresAt && invite.expiresAt < new Date()) {
    return null;
  }

  return invite;
}

/**
 * Mark an invite as used (consumed).
 */
export async function markInviteUsed(id: string) {
  return prisma.invite.update({
    where: { id },
    data: { used: true, usedAt: new Date() },
  });
}

/**
 * Revoke (soft-delete) invites by their raw codes.
 * Only affects invites owned by the given user.
 */
export async function revokeInvites(
  codes: string[],
  generatedById: string
): Promise<{ revoked: number }> {
  const codeHashes = codes.map(hashInviteCode);

  const result = await prisma.invite.deleteMany({
    where: {
      codeHash: { in: codeHashes },
      generatedById,
    },
  });

  return { revoked: result.count };
}