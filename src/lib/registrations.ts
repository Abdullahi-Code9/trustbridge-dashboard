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

export async function getContributors(): Promise<ContributorRow[]> {
  const registrations = await prisma.registration.findMany({
    include: {
      user: {
        select: { githubUsername: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return registrations.map(toContributorRow);
}

/**
 * Cursor-paginated contributor query
 * @param cursor Base64-encoded registration ID for pagination
 * @param limit Number of results (1-100, default 50)
 */
export async function getContributorsPaginated(
  cursor?: string,
  limit: number = 50
): Promise<{
  contributors: ContributorRow[];
  nextCursor: string | null;
  hasMore: boolean;
}> {
  const { encodeCursor, decodeCursor } = await import("@/lib/cursor-pagination");

  const decodedCursor = cursor ? decodeCursor(cursor) : null;
  const normalizedLimit = Math.min(Math.max(limit, 1), 100);

  // Fetch normalizedLimit + 1 to determine if there are more records
  const registrations = await prisma.registration.findMany({
    include: {
      user: {
        select: { githubUsername: true },
      },
    },
    orderBy: { updatedAt: "desc" },
    ...(decodedCursor && {
      skip: 1, // Skip the cursor record itself
      cursor: { id: decodedCursor },
    }),
    take: normalizedLimit + 1,
  });

  const hasMore = registrations.length > normalizedLimit;
  const pageData = registrations.slice(0, normalizedLimit);
  const nextCursor = hasMore
    ? encodeCursor(pageData[pageData.length - 1].id)
    : null;

  return {
    contributors: pageData.map(toContributorRow),
    nextCursor,
    hasMore,
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
