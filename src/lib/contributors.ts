import type { ContributorRow, ReadinessStatus } from "@/types";

export type ContributorSortKey = "githubUsername" | "xlmBalance" | "lastCheckedAt" | "readiness";
export type ContributorFilter = "all" | "ready" | "needs_attention" | "low_reserve";

/** Column identifiers for the contributor table. */
export type ContributorColumnKey =
  | "githubUsername"
  | "stellarAddress"
  | "readiness"
  | "verified"
  | "xlmBalance"
  | "spendableXlmBalance"
  | "lastCheckedAt";

export interface ContributorColumnDef {
  key: ContributorColumnKey;
  label: string;
  defaultVisible: boolean;
}

/** All available columns in their default display order. */
export const CONTRIBUTOR_COLUMNS: ContributorColumnDef[] = [
  { key: "githubUsername",     label: "GitHub",         defaultVisible: true },
  { key: "stellarAddress",     label: "Stellar address", defaultVisible: true },
  { key: "readiness",          label: "Status",         defaultVisible: true },
  { key: "verified",           label: "Verified",       defaultVisible: true },
  { key: "xlmBalance",         label: "XLM",            defaultVisible: true },
  { key: "spendableXlmBalance",label: "Spendable XLM",  defaultVisible: false },
  { key: "lastCheckedAt",      label: "Last checked",   defaultVisible: true },
];

/** Returns the set of column keys that are visible by default. */
export function defaultVisibleColumns(): Set<ContributorColumnKey> {
  return new Set(
    CONTRIBUTOR_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
  );
}

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
  if (filter === "low_reserve") {
    return contributors.filter((row) => row.readiness === "low_reserve");
  }
  return [...contributors];
}

/**
 * Search contributors by GitHub username or Stellar address.
 * Case-insensitive substring match against both fields.
 */
export function searchContributors(
  contributors: ContributorRow[],
  query: string,
): ContributorRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return contributors;
  return contributors.filter(
    (row) =>
      row.githubUsername.toLowerCase().includes(q) ||
      row.stellarAddress.toLowerCase().includes(q),
  );
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

  if (sortKey === "readiness") {
    const order: Record<string, number> = { ready: 0, low_reserve: 1, not_ready: 2 };
    return (order[a.readiness] ?? 3) - (order[b.readiness] ?? 3);
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
