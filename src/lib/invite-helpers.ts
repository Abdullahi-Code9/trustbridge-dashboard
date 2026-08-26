import "server-only";

import { createHash, randomBytes } from "crypto";

import { prisma } from "@/lib/prisma";

export function hashInviteCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export function generateInviteCode(): string {
  return randomBytes(24).toString("hex");
}

export interface CreateInviteInput {
  code: string;
  generatedById: string;
  expiresAt?: Date | null;
  batchLabel?: string | null;
}

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

export async function findInviteByCode(code: string) {
  const codeHash = hashInviteCode(code);
  const invite = await prisma.invite.findUnique({ where: { codeHash } });

  if (!invite) return null;
  if (invite.expiresAt && invite.expiresAt < new Date()) return null;

  return invite;
}

export async function markInviteUsed(id: string) {
  return prisma.invite.update({
    where: { id },
    data: { used: true, usedAt: new Date() },
  });
}

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