import type { ContributorRow, ReadinessStatus } from "@/types";

export type ContributorSortKey = "githubUsername" | "xlmBalance" | "lastCheckedAt";
export type ContributorFilter = "all" | "ready" | "needs_attention";

export function readinessNeedsAttention(readiness: ReadinessStatus): boolean {
  return readiness !== "ready";
}

export function filterContributors(
  contributors: ContributorRow[],
  filter: ContributorFilter,
): ContributorRow[] {
  if (filter === "ready") {
    return contributors.filter((row) => row.readiness === "ready");
  }
  if (filter === "needs_attention") {
    return contributors.filter((row) => readinessNeedsAttention(row.readiness));
  }
  return [...contributors];
}

export function compareContributors(
  a: ContributorRow,
  b: ContributorRow,
  sortKey: ContributorSortKey,
): number {
  if (sortKey === "githubUsername") {
    return a.githubUsername.localeCompare(b.githubUsername);
  }

  if (sortKey === "xlmBalance") {
    return Number.parseFloat(a.xlmBalance) - Number.parseFloat(b.xlmBalance);
  }

  const aTime = a.lastCheckedAt ? new Date(a.lastCheckedAt).getTime() : 0;
  const bTime = b.lastCheckedAt ? new Date(b.lastCheckedAt).getTime() : 0;
  return aTime - bTime;
}

export function sortContributors(
  contributors: ContributorRow[],
  sortKey: ContributorSortKey,
  ascending = true,
): ContributorRow[] {
  return [...contributors].sort((a, b) => {
    const comparison = compareContributors(a, b, sortKey);
    return ascending ? comparison : -comparison;
  });
}

export function countReadyContributors(contributors: ContributorRow[]): number {
  return contributors.filter((row) => row.readiness === "ready").length;
}
