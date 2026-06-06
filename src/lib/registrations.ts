import { computeReadiness } from "@/lib/stellar";
import { prisma } from "@/lib/prisma";
import type { ContributorRow, DashboardStats } from "@/types";

export async function getDashboardStats(): Promise<DashboardStats> {
  const registrations = await prisma.registration.findMany({
    select: {
      funded: true,
      trustlineReady: true,
      xlmBalance: true,
    },
  });

  const totalContributors = registrations.length;
  const readyCount = registrations.filter(
    (row) =>
      computeReadiness(row.funded, row.trustlineReady, row.xlmBalance) ===
      "ready"
  ).length;

  return {
    totalContributors,
    readyCount,
    readyPercent:
      totalContributors === 0
        ? 0
        : Math.round((readyCount / totalContributors) * 100),
  };
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

  return registrations.map((row) => ({
    id: row.id,
    githubUsername: row.user.githubUsername,
    stellarAddress: row.stellarAddress,
    trustlineReady: row.trustlineReady,
    funded: row.funded,
    xlmBalance: row.xlmBalance,
    lastCheckedAt: row.lastCheckedAt?.toISOString() ?? null,
    readiness: computeReadiness(row.funded, row.trustlineReady, row.xlmBalance),
  }));
}

export async function refreshAllContributors(): Promise<number> {
  const { checkStellarAddress } = await import("@/lib/horizon");
  const registrations = await prisma.registration.findMany();

  await Promise.all(
    registrations.map(async (registration) => {
      const result = await checkStellarAddress(registration.stellarAddress);
      await prisma.registration.update({
        where: { id: registration.id },
        data: {
          funded: result.funded,
          trustlineReady: result.trustline,
          xlmBalance: result.xlm_balance,
          lastCheckedAt: new Date(),
        },
      });
    })
  );

  return registrations.length;
}
