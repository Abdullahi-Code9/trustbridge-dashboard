import "server-only";

import { buildCsv, buildCsvFilename } from "@/lib/csv";
import type { ContributorRow } from "@/types";

const CSV_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let cachedCsv: { data: string; timestamp: number } | null = null;

export function buildContributorsCsv(
  contributors: ContributorRow[]
): string {
  const headers = [
    "id",
    "githubUsername",
    "stellarAddress",
    "funded",
    "trustlineReady",
    "trustlineAuthorized",
    "verified",
    "xlmBalance",
    "spendableXlmBalance",
    "readiness",
    "lastCheckedAt",
  ];

  const rows = contributors.map((c) => [
    c.id,
    c.githubUsername,
    c.stellarAddress,
    c.funded ? "yes" : "no",
    c.trustlineReady ? "yes" : "no",
    c.trustlineAuthorized ? "yes" : "no",
    c.verified ? "yes" : "no",
    c.xlmBalance,
    c.spendableXlmBalance,
    c.readiness,
    c.lastCheckedAt || "",
  ]);

  return buildCsv(headers, rows);
}

export function getContributorsCsvFilename(date = new Date()): string {
  return buildCsvFilename("contributors", date);
}

export function getCachedCsv(contributors: ContributorRow[]): string {
  const now = Date.now();

  if (
    cachedCsv &&
    now - cachedCsv.timestamp < CSV_CACHE_TTL
  ) {
    return cachedCsv.data;
  }

  const csv = buildContributorsCsv(contributors);
  cachedCsv = { data: csv, timestamp: now };
  return csv;
}

export function invalidateCsvCache(): void {
  cachedCsv = null;
}
