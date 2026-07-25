import "server-only";

import type { Registration } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { computeReadiness, computeVerified } from "@/lib/readiness";
import { buildDashboardStats } from "@/lib/stats";
import type { ContributorRow, DashboardStats } from "@/types";

type RegistrationWithUser = Registration & {
  user: { githubUsername: string };
};

/** Map a persisted registration (+ user) to a serializable contributor row. */
export function toContributorRow(row: RegistrationWithUser): ContributorRow {
  return {
    id: row.id,
    githubUsername: row.user.githubUsername,
    stellarAddress: row.stellarAddress,
    trustlineReady: row.trustlineReady,
    trustlineAuthorized: row.trustlineAuthorized,
    verified: computeVerified(
      row.funded,
      row.trustlineReady,
      row.trustlineAuthorized
    ),
    funded: row.funded,
    xlmBalance: row.xlmBalance,
    spendableXlmBalance: row.spendableXlmBalance,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    readiness: computeReadiness(row.funded, row.trustlineReady, row.xlmBalance, {
      authorized: row.trustlineAuthorized,
      spendableBalance: row.spendableXlmBalance,
    }),
  };
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const registrations = await prisma.registration.findMany({
    select: {
      funded: true,
      trustlineReady: true,
      trustlineAuthorized: true,
      xlmBalance: true,
      spendableXlmBalance: true,
    },
  });

  const totalContributors = registrations.length;
  const readyCount = registrations.filter(
    (row) =>
      computeReadiness(row.funded, row.trustlineReady, row.xlmBalance, {
        authorized: row.trustlineAuthorized,
        spendableBalance: row.spendableXlmBalance,
      }) === "ready"
  ).length;

  return buildDashboardStats(totalContributors, readyCount);
}

export async function getContributors(
  page: number = 1,
  limit: number = 50
): Promise<{ contributors: ContributorRow[]; total: number }> {
  const skip = (page - 1) * limit;

  const [registrations, total] = await Promise.all([
    prisma.registration.findMany({
      include: {
        user: {
          select: { githubUsername: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.registration.count(),
  ]);

  return {
    contributors: registrations.map(toContributorRow),
    total,
  };
}

/**
 * Re-run the Horizon check for a single registration and persist the result.
 * Shared by the single- and batch-recheck flows.
 */
async function recheckRegistration(
  registration: Registration
): Promise<Registration> {
  const { checkStellarAddress } = await import("@/lib/horizon");
  const result = await checkStellarAddress(registration.stellarAddress);

  return prisma.registration.update({
    where: { id: registration.id },
    data: {
      funded: result.funded,
      trustlineReady: result.trustline,
      trustlineAuthorized: result.trustline_authorized,
      xlmBalance: result.xlm_balance,
      spendableXlmBalance: result.spendable_xlm_balance,
      lastCheckedAt: new Date(),
    },
  });
}

export async function refreshAllContributors(): Promise<number> {
  const registrations = await prisma.registration.findMany();

  await Promise.all(
    registrations.map((registration) => recheckRegistration(registration))
  );

  return registrations.length;
}

/**
 * Re-check a single contributor by registration id. Returns the refreshed
 * contributor row, or `null` when no registration matches.
 */
export async function refreshContributor(
  id: string
): Promise<ContributorRow | null> {
  const registration = await prisma.registration.findUnique({ where: { id } });
  if (!registration) return null;

  await recheckRegistration(registration);

  const updated = await prisma.registration.findUnique({
    where: { id },
    include: { user: { select: { githubUsername: true } } },
  });

  return updated ? toContributorRow(updated) : null;
}
