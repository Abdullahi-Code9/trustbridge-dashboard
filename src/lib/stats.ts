import { calculatePercent } from "@/lib/utils";
import type { ContributorRow, DashboardStats } from "@/types";

export function buildDashboardStats(
  totalContributors: number,
  readyCount: number,
): DashboardStats {
  return {
    totalContributors,
    readyCount,
    readyPercent: calculatePercent(readyCount, totalContributors),
  };
}

export function summarizeContributors(contributors: ContributorRow[]): DashboardStats {
  const readyCount = contributors.filter((row) => row.readiness === "ready").length;
  return buildDashboardStats(contributors.length, readyCount);
}
