import { describe, it, expect, vi, afterEach } from "vitest";
import { GET } from "@/app/api/metrics/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/registrations", () => ({
  getContributors: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  getRecentAuditLog: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getContributors } from "@/lib/registrations";
import { getRecentAuditLog } from "@/lib/audit";
import type { ContributorRow } from "@/types";
import type { AuditLogEntry } from "@/types";

const ORIGINAL_ENV = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.clearAllMocks();
});

function makeContributor(
  id: string,
  readiness: ContributorRow["readiness"]
): ContributorRow {
  return {
    id,
    githubUsername: id,
    stellarAddress: `GADDR_${id}`,
    trustlineReady: readiness === "ready",
    trustlineAuthorized: readiness === "ready",
    verified: readiness === "ready",
    funded: readiness !== "not_ready",
    xlmBalance: "5",
    spendableXlmBalance: "3",
    lastCheckedAt: "2026-01-01T00:00:00Z",
    readiness,
  };
}

function makeAuditEntry(action: string): AuditLogEntry {
  return {
    id: `log_${action}`,
    actorId: "user_1",
    actorLogin: "octocat",
    action,
    targetId: null,
    targetLabel: null,
    metadata: null,
    createdAt: "2026-01-01T00:00:00Z",
  };
}

describe("GET /api/metrics", () => {
  it("returns 403 for an unauthenticated request", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
  });

  it("returns 403 for a non-maintainer session", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", isMaintainer: false },
    } as any);

    const res = await GET();
    expect(res.status).toBe(403);
  });

  it("returns 200 with correct contributor counts for a maintainer", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", isMaintainer: true },
    } as any);

    vi.mocked(getContributors).mockResolvedValue([
      makeContributor("a", "ready"),
      makeContributor("b", "ready"),
      makeContributor("c", "low_reserve"),
      makeContributor("d", "not_ready"),
    ]);

    vi.mocked(getRecentAuditLog).mockResolvedValue([
      makeAuditEntry("recheck.single"),
      makeAuditEntry("recheck.single"),
      makeAuditEntry("recheck.batch"),
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();

    // Contributor counts
    expect(json.contributors.total).toBe(4);
    expect(json.contributors.ready).toBe(2);
    expect(json.contributors.readyPercent).toBe(50);
    expect(json.contributors.byStatus.ready).toBe(2);
    expect(json.contributors.byStatus.low_reserve).toBe(1);
    expect(json.contributors.byStatus.not_ready).toBe(1);
  });

  it("returns audit summary grouped by action", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", isMaintainer: true },
    } as any);
    vi.mocked(getContributors).mockResolvedValue([]);
    vi.mocked(getRecentAuditLog).mockResolvedValue([
      makeAuditEntry("recheck.single"),
      makeAuditEntry("recheck.single"),
      makeAuditEntry("recheck.batch"),
    ]);

    const res = await GET();
    const json = await res.json();

    expect(json.audit.recentEntries).toBe(3);
    expect(json.audit.byAction["recheck.single"]).toBe(2);
    expect(json.audit.byAction["recheck.batch"]).toBe(1);
    expect(json.audit.latestAt).toBe("2026-01-01T00:00:00Z");
  });

  it("returns null latestAt when there are no audit entries", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", isMaintainer: true },
    } as any);
    vi.mocked(getContributors).mockResolvedValue([]);
    vi.mocked(getRecentAuditLog).mockResolvedValue([]);

    const res = await GET();
    const json = await res.json();
    expect(json.audit.latestAt).toBeNull();
  });

  it("includes operational config from environment variables", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", isMaintainer: true },
    } as any);
    vi.mocked(getContributors).mockResolvedValue([]);
    vi.mocked(getRecentAuditLog).mockResolvedValue([]);

    process.env.RATE_LIMIT_MAX_REQUESTS = "20";
    process.env.HORIZON_CB_FAILURE_THRESHOLD = "3";
    process.env.SOROBAN_CONTRACT_ID = "CTEST123";

    const res = await GET();
    const json = await res.json();

    expect(json.config.rateLimitMaxRequests).toBe(20);
    expect(json.config.circuitBreakerFailureThreshold).toBe(3);
    expect(json.config.sorobanContractConfigured).toBe(true);
  });

  it("reports sorobanContractConfigured as false when SOROBAN_CONTRACT_ID is unset", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", isMaintainer: true },
    } as any);
    vi.mocked(getContributors).mockResolvedValue([]);
    vi.mocked(getRecentAuditLog).mockResolvedValue([]);

    delete process.env.SOROBAN_CONTRACT_ID;

    const res = await GET();
    const json = await res.json();
    expect(json.config.sorobanContractConfigured).toBe(false);
  });
});
