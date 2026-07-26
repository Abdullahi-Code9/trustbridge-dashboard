import "server-only";

import { prisma } from "@/lib/prisma";
import {
  buildWalletProofInfo,
  buildHorizonDebugInfo,
} from "@/lib/registration-insights";
import { computeReadiness, computeVerified } from "@/lib/readiness";
import { buildDashboardStats } from "@/lib/stats";
import type { ContributorRow, DashboardStats, ReadinessStatus } from "@/types";

type RegistrationRow = Awaited<
  ReturnType<typeof prisma.registration.findUnique>
>;
type RegistrationWithUser = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.registration.findUnique<{
        include: { user: { select: { githubUsername: true } } };
      }>
    >
  >
>;

function isRegistrationRow(row: RegistrationRow): row is NonNullable<RegistrationRow> {
  return row !== null;
}

type PersistedRegistration = NonNullable<
  Awaited<
    ReturnType<
      typeof prisma.registration.findFirst
    >
  >
>;

type RegistrationWithUserRow = PersistedRegistration & {
  user: { githubUsername: string };
};

/** Readiness for any persisted registration row (with or without its user join). */
function readinessOf(row: PersistedRegistration): ReadinessStatus {
  return computeReadiness(row.funded, row.trustlineReady, row.xlmBalance, {
    authorized: row.trustlineAuthorized,
    spendableBalance: row.spendableXlmBalance,
  });
}

/** Map a persisted registration (+ user) to a serializable contributor row. */
export function toContributorRow(row: RegistrationWithUserRow): ContributorRow {
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
    readiness: readinessOf(row),
    walletProof: buildWalletProofInfo(
      row.stellarAddress,
      row.user.githubUsername
    ),
    horizonDebug: buildHorizonDebugInfo({
      funded: row.funded,
      trustlineReady: row.trustlineReady,
      trustlineAuthorized: row.trustlineAuthorized,
      readiness: readinessOf(row),
      xlmBalance: row.xlmBalance,
      spendableXlmBalance: row.spendableXlmBalance,
      lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
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

export interface ReadinessDiff {
  registrationId: string;
  previousReadiness: ReadinessStatus;
  newReadiness: ReadinessStatus;
  changed: boolean;
}

interface RecheckOutcome {
  registration: Registration;
  diff: ReadinessDiff;
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
 * Shared by the single- and batch-recheck flows. Captures the readiness
 * before and after the check so callers can audit what actually changed,
 * rather than just the post-recheck state.
 */
async function recheckRegistration(
  registration: PersistedRegistration
): Promise<RecheckOutcome> {
  const previousReadiness = readinessOf(registration);

  const { checkStellarAddress } = await import("@/lib/horizon");
  const result = await checkStellarAddress(registration.stellarAddress);

  const updated = await prisma.registration.update({
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

  const newReadiness = readinessOf(updated);

  return {
    registration: updated,
    diff: {
      registrationId: updated.id,
      previousReadiness,
      newReadiness,
      changed: previousReadiness !== newReadiness,
    },
  };
}

export interface RefreshAllSummary {
  refreshed: number;
  changed: number;
  diffs: ReadinessDiff[];
}

export async function refreshAllContributors(): Promise<RefreshAllSummary> {
  const registrations = await prisma.registration.findMany();

  const outcomes = await Promise.all(
    registrations.map((registration) => recheckRegistration(registration))
  );

  const diffs = outcomes.map((outcome) => outcome.diff);

  return {
    refreshed: registrations.length,
    changed: diffs.filter((diff) => diff.changed).length,
    diffs,
  };
}

export interface RefreshContributorResult {
  contributor: ContributorRow;
  diff: ReadinessDiff;
}

/**
 * Re-check a single contributor by registration id. Returns the refreshed
 * contributor row plus the before/after readiness diff, or `null` when no
 * registration matches.
 */
export async function refreshContributor(
  id: string
): Promise<RefreshContributorResult | null> {
  const registration = await prisma.registration.findUnique({ where: { id } });
  if (!registration) return null;

  const { diff } = await recheckRegistration(registration);

  const updated = await prisma.registration.findUnique({
    where: { id },
    include: { user: { select: { githubUsername: true } } },
  });

  return updated ? { contributor: toContributorRow(updated), diff } : null;
}
