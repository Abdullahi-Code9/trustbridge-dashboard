import type { Session } from "next-auth";
import { describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/treasury/export/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/readiness", () => ({
  computeReadiness: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    registration: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { computeReadiness } from "@/lib/readiness";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/lib/audit";
import { NextRequest } from "next/server";

describe("Treasury export endpoint", () => {
  describe("GET /api/treasury/export", () => {
    it("returns 403 for non-maintainer", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: false },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await GET(new NextRequest("http://localhost/api/treasury/export"));
      expect(res.status).toBe(403);
    });

    it("returns treasury export data", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user-1",
          isMaintainer: true,
          email: "maintainer@test.com",
          githubUsername: "maintainer",
        },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      vi.mocked(prisma.registration.findMany).mockResolvedValue([
        {
          id: "reg-1",
          userId: "user-2",
          stellarAddress: "GBXYZ123...",
          funded: true,
          trustlineReady: true,
          trustlineAuthorized: true,
          xlmBalance: "100",
          spendableXlmBalance: "50",
          lastCheckedAt: new Date("2026-07-26"),
          user: {
            githubUsername: "contributor1",
          },
        },
        {
          id: "reg-2",
          userId: "user-3",
          stellarAddress: "GABC456...",
          funded: false,
          trustlineReady: false,
          trustlineAuthorized: false,
          xlmBalance: "0",
          spendableXlmBalance: "0",
          lastCheckedAt: new Date("2026-07-26"),
          user: {
            githubUsername: "contributor2",
          },
        },
      ] as any);

      vi.mocked(computeReadiness).mockImplementation((funded, trustline) => {
        return funded && trustline ? "ready" : "not_ready";
      });

      const res = await GET(new NextRequest("http://localhost/api/treasury/export"));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.totalContributors).toBe(2);
      expect(json.readyCount).toBe(1);
      expect(json.notReadyCount).toBe(1);
      expect(json.contributors).toHaveLength(2);
      expect(recordAuditLog).toHaveBeenCalled();
    });
  });

  describe("POST /api/treasury/export", () => {
    it("exports as JSON by default", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user-1",
          isMaintainer: true,
          email: "maintainer@test.com",
          githubUsername: "maintainer",
        },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      vi.mocked(prisma.registration.findMany).mockResolvedValue([
        {
          id: "reg-1",
          userId: "user-2",
          stellarAddress: "GBXYZ123...",
          funded: true,
          trustlineReady: true,
          trustlineAuthorized: true,
          xlmBalance: "100",
          spendableXlmBalance: "50",
          lastCheckedAt: new Date("2026-07-26"),
          user: {
            githubUsername: "contributor1",
          },
        },
      ] as any);

      vi.mocked(computeReadiness).mockReturnValue("ready");

      const res = await POST(
        new NextRequest("http://localhost/api/treasury/export", {
          method: "POST",
          body: JSON.stringify({ format: "json" }),
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.exportedAt).toBeDefined();
      expect(json.contributors).toHaveLength(1);
    });

    it("exports as CSV", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user-1",
          isMaintainer: true,
          email: "maintainer@test.com",
          githubUsername: "maintainer",
        },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      vi.mocked(prisma.registration.findMany).mockResolvedValue([
        {
          id: "reg-1",
          userId: "user-2",
          stellarAddress: "GBXYZ123...",
          funded: true,
          trustlineReady: true,
          trustlineAuthorized: true,
          xlmBalance: "100",
          spendableXlmBalance: "50",
          lastCheckedAt: new Date("2026-07-26"),
          user: {
            githubUsername: "contributor1",
          },
        },
      ] as any);

      vi.mocked(computeReadiness).mockReturnValue("ready");

      const res = await POST(
        new NextRequest("http://localhost/api/treasury/export", {
          method: "POST",
          body: JSON.stringify({ format: "csv" }),
        })
      );

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/csv");
      const text = await res.text();
      expect(text).toContain("github_username");
      expect(text).toContain("contributor1");
    });

    it("returns 400 for unsupported format", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user-1",
          isMaintainer: true,
          email: "maintainer@test.com",
        },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await POST(
        new NextRequest("http://localhost/api/treasury/export", {
          method: "POST",
          body: JSON.stringify({ format: "xml" }),
        })
      );

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain("Unsupported");
    });

    it("returns 403 for non-maintainer", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: false },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await POST(
        new NextRequest("http://localhost/api/treasury/export", {
          method: "POST",
          body: JSON.stringify({ format: "json" }),
        })
      );

      expect(res.status).toBe(403);
    });
  });
});
