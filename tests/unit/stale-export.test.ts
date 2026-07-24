import { describe, it, expect, vi } from "vitest";
import {
  isExportStale,
  getStaleContributors,
  buildStalenessSummary,
} from "@/lib/stale-export";
import type { ContributorRow } from "@/types";

function makeRow(lastCheckedAt: string | null): ContributorRow {
  return {
    id: "1",
    githubUsername: "test",
    stellarAddress: "GBSX",
    trustlineReady: true,
    funded: true,
    xlmBalance: "2",
    lastCheckedAt,
    readiness: "ready",
  };
}

describe("stale-export", () => {
  it("returns false when all contributors are fresh", () => {
    const now = new Date().toISOString();
    const contributors = [makeRow(now)];
    expect(isExportStale(contributors, 3600000)).toBe(false);
  });

  it("returns true when a contributor is stale", () => {
    const old = new Date(Date.now() - 7200000).toISOString(); // 2 hours ago
    const contributors = [makeRow(old)];
    expect(isExportStale(contributors, 3600000)).toBe(true);
  });

  it("returns true when any contributor is stale (mixed)", () => {
    const fresh = new Date().toISOString();
    const stale = new Date(Date.now() - 7200000).toISOString();
    const contributors = [makeRow(fresh), makeRow(stale)];
    expect(isExportStale(contributors, 3600000)).toBe(true);
  });

  it("returns true when lastCheckedAt is null", () => {
    const contributors = [makeRow(null)];
    expect(isExportStale(contributors, 3600000)).toBe(true);
  });

  it("returns false for empty contributors", () => {
    expect(isExportStale([], 3600000)).toBe(false);
  });

  it("uses env default (24h) when no maxAgeMs provided", () => {
    const now = new Date().toISOString();
    const contributors = [makeRow(now)];
    expect(isExportStale(contributors)).toBe(false);
  });

  it("respects custom env value", () => {
    vi.stubEnv("STALE_CSV_MAX_AGE_MS", "1000"); // 1 second
    const old = new Date(Date.now() - 2000).toISOString();
    const contributors = [makeRow(old)];
    expect(isExportStale(contributors)).toBe(true);
    vi.unstubAllEnvs();
  });

  it("ignores malformed env and uses default", () => {
    vi.stubEnv("STALE_CSV_MAX_AGE_MS", "not-a-number");
    const now = new Date().toISOString();
    const contributors = [makeRow(now)];
    expect(isExportStale(contributors)).toBe(false);
    vi.unstubAllEnvs();
  });
});

describe("getStaleContributors", () => {
  it("returns only stale contributors", () => {
    const fresh = makeRow(new Date().toISOString());
    const stale = makeRow(new Date(Date.now() - 7200000).toISOString());
    const result = getStaleContributors([fresh, stale], 3600000);
    expect(result).toHaveLength(1);
    expect(result[0].githubUsername).toBe("test");
  });
});

describe("buildStalenessSummary", () => {
  it("reports no stale data when all fresh", () => {
    const fresh = makeRow(new Date().toISOString());
    const summary = buildStalenessSummary([fresh], 3600000);
    expect(summary.stale).toBe(false);
    expect(summary.staleCount).toBe(0);
    expect(summary.allowExport).toBe(true);
    expect(summary.warning).toBe("");
  });

  it("reports stale data with percentage", () => {
    const fresh = makeRow(new Date().toISOString());
    const stale = makeRow(new Date(Date.now() - 7200000).toISOString());
    const summary = buildStalenessSummary([fresh, stale], 3600000);
    expect(summary.stale).toBe(true);
    expect(summary.staleCount).toBe(1);
    expect(summary.totalCount).toBe(2);
    expect(summary.stalePercent).toBe(50);
    expect(summary.allowExport).toBe(false);
    expect(summary.warning).toContain("1 of 2 contributors (50%)");
  });
});
