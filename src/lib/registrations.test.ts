import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    registration: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/readiness", () => ({
  computeReadiness: vi.fn(
    (funded, trustlineReady, xlmBalance, options) =>
      funded && trustlineReady && options.authorized ? "ready" : "not_ready"
  ),
  computeVerified: vi.fn(
    (funded, trustlineReady, authorized) =>
      funded && trustlineReady && authorized
  ),
}));

vi.mock("@/lib/stats", () => ({
  buildDashboardStats: vi.fn((total, ready) => ({
    total,
    ready,
    lowReserve: total - ready,
  })),
}));

vi.mock("@/lib/cursor-pagination", () => ({
  encodeCursor: vi.fn((value: string) => Buffer.from(value).toString("base64")),
  decodeCursor: vi.fn((cursor: string) =>
    Buffer.from(cursor, "base64").toString("utf-8")
  ),
}));

import { prisma } from "@/lib/prisma";
import { toContributorRow, getContributorsPaginated } from "@/lib/registrations";

describe("Registrations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("toContributorRow", () => {
    it("converts registration to contributor row", () => {
      const registration = {
        id: "reg-1",
        user: { githubUsername: "alice" },
        stellarAddress: "GBUQWP3BOUZX34ULNQG23RQ6F4YUSXHTGSNLAYWBEJCLLWTG5V5TGO7Z",
        trustlineReady: true,
        trustlineAuthorized: true,
        verified: true,
        funded: true,
        xlmBalance: "10.5",
        spendableXlmBalance: "8.5",
        lastCheckedAt: new Date("2025-02-01T12:00:00Z"),
        readiness: "ready",
      };

      const row = toContributorRow(registration as any);

      expect(row.id).toBe("reg-1");
      expect(row.githubUsername).toBe("alice");
      expect(row.stellarAddress).toBe(registration.stellarAddress);
      expect(row.trustlineReady).toBe(true);
    });
  });

  describe("getContributorsPaginated", () => {
    it("returns first page without cursor", async () => {
      const mockRegistrations = Array.from({ length: 5 }, (_, i) => ({
        id: `reg-${i + 1}`,
        user: { githubUsername: `user${i + 1}` },
        stellarAddress: `G${i}BUQWP3BOUZX34ULNQG23RQ6F4YUSXHTGSNLAYWBEJCLLWTG5V5TGO7Z`,
        trustlineReady: true,
        trustlineAuthorized: true,
        funded: true,
        xlmBalance: "10",
        spendableXlmBalance: "8",
        lastCheckedAt: new Date(),
      }));

      vi.mocked(prisma.registration.findMany).mockResolvedValueOnce(
        mockRegistrations as any
      );

      const result = await getContributorsPaginated(undefined, 3);

      expect(result.contributors).toHaveLength(3);
      expect(result.hasMore).toBe(true);
      expect(result.nextCursor).not.toBeNull();
    });

    it("uses default limit of 50", async () => {
      vi.mocked(prisma.registration.findMany).mockResolvedValueOnce([]);

      await getContributorsPaginated();

      expect(prisma.registration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 51, // limit + 1 to check for more
        })
      );
    });

    it("enforces maximum limit of 100", async () => {
      vi.mocked(prisma.registration.findMany).mockResolvedValueOnce([]);

      await getContributorsPaginated(undefined, 500);

      expect(prisma.registration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 101, // capped at 100 + 1
        })
      );
    });

    it("returns paginated results with cursor", async () => {
      const cursor = Buffer.from("reg-5").toString("base64");
      const mockRegistrations = Array.from({ length: 3 }, (_, i) => ({
        id: `reg-${6 + i}`,
        user: { githubUsername: `user${6 + i}` },
        stellarAddress: `G${6 + i}BUQWP3BOUZX34ULNQG23RQ6F4YUSXHTGSNLAYWBEJCLLWTG5V5TGO7Z`,
        trustlineReady: true,
        trustlineAuthorized: true,
        funded: true,
        xlmBalance: "10",
        spendableXlmBalance: "8",
        lastCheckedAt: new Date(),
      }));

      vi.mocked(prisma.registration.findMany).mockResolvedValueOnce(
        mockRegistrations as any
      );

      const result = await getContributorsPaginated(cursor, 2);

      expect(prisma.registration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          cursor: { id: "reg-5" },
          take: 3, // limit + 1
        })
      );

      expect(result.contributors).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it("returns hasMore=false for last page", async () => {
      const mockRegistrations = Array.from({ length: 2 }, (_, i) => ({
        id: `reg-${i + 1}`,
        user: { githubUsername: `user${i + 1}` },
        stellarAddress: `G${i}BUQWP3BOUZX34ULNQG23RQ6F4YUSXHTGSNLAYWBEJCLLWTG5V5TGO7Z`,
        trustlineReady: true,
        trustlineAuthorized: true,
        funded: true,
        xlmBalance: "10",
        spendableXlmBalance: "8",
        lastCheckedAt: new Date(),
      }));

      vi.mocked(prisma.registration.findMany).mockResolvedValueOnce(
        mockRegistrations as any
      );

      const result = await getContributorsPaginated(undefined, 5);

      expect(result.contributors).toHaveLength(2);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });
  });
});
