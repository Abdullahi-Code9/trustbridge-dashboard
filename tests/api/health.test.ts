import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    registration: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/registrations", () => ({
  toContributorRow: vi.fn((row: unknown) => row),
}));

vi.mock("@/lib/stale-export", () => ({
  buildStalenessSummary: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { buildStalenessSummary } from "@/lib/stale-export";
import type { HealthResponse } from "@/app/api/health/route";

// Helpers for creating mock data
function freshSummary() {
  return {
    stale: false,
    staleCount: 0,
    totalCount: 5,
    stalePercent: 0,
    warning: "",
    allowExport: true,
  };
}

function staleSummary() {
  return {
    stale: true,
    staleCount: 2,
    totalCount: 5,
    stalePercent: 40,
    warning: "2 of 5 contributors (40%) have not been verified in the last 24 hour(s).",
    allowExport: false,
  };
}

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("GET /api/health", () => {
  it("returns 200 with status=ok when DB is healthy and data is fresh", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(prisma.registration.findMany).mockResolvedValue([] as never);
    vi.mocked(buildStalenessSummary).mockReturnValue(freshSummary());

    const res = await GET();
    const json: HealthResponse = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("ok");
    expect(json.checks.database.status).toBe("ok");
    expect(json.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(json.checks.csvStaleness.status).toBe("ok");
    expect(json.checks.csvStaleness.staleCount).toBe(0);
    expect(json.timestamp).toBeTruthy();
    expect(json.version).toBeTruthy();
  });

  it("returns 200 with status=degraded when CSV data is stale", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(prisma.registration.findMany).mockResolvedValue([] as never);
    vi.mocked(buildStalenessSummary).mockReturnValue(staleSummary());

    const res = await GET();
    const json: HealthResponse = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("degraded");
    expect(json.checks.csvStaleness.status).toBe("degraded");
    expect(json.checks.csvStaleness.staleCount).toBe(2);
    expect(json.checks.csvStaleness.totalCount).toBe(5);
    expect(json.checks.csvStaleness.stalePercent).toBe(40);
    expect(json.checks.csvStaleness.warning).toContain("2 of 5");
  });

  it("returns 200 with status=error when DB is unreachable", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("Connection refused"));

    const res = await GET();
    const json: HealthResponse = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("error");
    expect(json.checks.database.status).toBe("error");
    expect(json.checks.database.error).toContain("Connection refused");
    // Staleness check is skipped when DB is down
    expect(prisma.registration.findMany).not.toHaveBeenCalled();
  });

  it("returns 200 with status=degraded when DB is healthy but staleness query fails", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(prisma.registration.findMany).mockRejectedValue(
      new Error("Query timeout")
    );

    const res = await GET();
    const json: HealthResponse = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("degraded");
    expect(json.checks.csvStaleness.status).toBe("degraded");
    expect(json.checks.csvStaleness.warning).toContain("Unable to determine");
  });

  it("includes a version field in the response", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(prisma.registration.findMany).mockResolvedValue([] as never);
    vi.mocked(buildStalenessSummary).mockReturnValue(freshSummary());

    const res = await GET();
    const json: HealthResponse = await res.json();

    expect(typeof json.version).toBe("string");
    expect(json.version.length).toBeGreaterThan(0);
  });

  it("includes an ISO-8601 timestamp in the response", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(prisma.registration.findMany).mockResolvedValue([] as never);
    vi.mocked(buildStalenessSummary).mockReturnValue(freshSummary());

    const before = Date.now();
    const res = await GET();
    const after = Date.now();
    const json: HealthResponse = await res.json();

    const ts = new Date(json.timestamp).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });

  it("does not expose PII in the response body", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(prisma.registration.findMany).mockResolvedValue([] as never);
    vi.mocked(buildStalenessSummary).mockReturnValue(staleSummary());

    const res = await GET();
    const text = await res.text();

    // The body must not contain typical PII fields
    expect(text).not.toContain("githubUsername");
    expect(text).not.toContain("stellarAddress");
    expect(text).not.toContain("accessToken");
    expect(text).not.toContain("email");
  });

  it("reports database latency as a non-negative number", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(prisma.registration.findMany).mockResolvedValue([] as never);
    vi.mocked(buildStalenessSummary).mockReturnValue(freshSummary());

    const res = await GET();
    const json: HealthResponse = await res.json();

    expect(json.checks.database.latencyMs).toBeGreaterThanOrEqual(0);
    expect(Number.isFinite(json.checks.database.latencyMs)).toBe(true);
  });

  it("does not include error field in database check when DB is healthy", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(prisma.registration.findMany).mockResolvedValue([] as never);
    vi.mocked(buildStalenessSummary).mockReturnValue(freshSummary());

    const res = await GET();
    const json: HealthResponse = await res.json();

    expect(json.checks.database.error).toBeUndefined();
  });

  it("skips staleness check when DB reports error (error takes priority)", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("Timeout"));

    const res = await GET();
    const json: HealthResponse = await res.json();

    // Registration query should never be called
    expect(prisma.registration.findMany).not.toHaveBeenCalled();
    // Overall status must be "error", not "degraded"
    expect(json.status).toBe("error");
  });

  it("csvStaleness reflects all-stale scenario (stalePercent=100)", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(prisma.registration.findMany).mockResolvedValue([] as never);
    vi.mocked(buildStalenessSummary).mockReturnValue({
      stale: true,
      staleCount: 3,
      totalCount: 3,
      stalePercent: 100,
      warning: "3 of 3 contributors (100%) have not been verified.",
      allowExport: false,
    });

    const res = await GET();
    const json: HealthResponse = await res.json();

    expect(json.checks.csvStaleness.stalePercent).toBe(100);
    expect(json.checks.csvStaleness.staleCount).toBe(3);
    expect(json.status).toBe("degraded");
  });
});
