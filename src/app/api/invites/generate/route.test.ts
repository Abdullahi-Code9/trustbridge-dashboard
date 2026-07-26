import type { Session } from "next-auth";
import { describe, expect, it, vi } from "vitest";

import { POST, GET, DELETE } from "@/app/api/invites/generate/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { recordAuditLog } from "@/lib/audit";
import { NextRequest } from "next/server";

describe("Bulk invite link generator", () => {
  describe("POST /api/invites/generate", () => {
    it("generates bulk invite links", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user-1",
          isMaintainer: true,
          githubUsername: "maintainer",
        },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await POST(
        new NextRequest("http://localhost/api/invites/generate", {
          method: "POST",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({ count: 5, expiryDays: 30 }),
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.generated).toBe(5);
      expect(json.invites).toHaveLength(5);
      expect(json.invites[0].code).toBeDefined();
      expect(json.invites[0].expiresAt).toBeDefined();
      expect(recordAuditLog).toHaveBeenCalled();
    });

    it("generates invites with default count of 10", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user-1",
          isMaintainer: true,
          githubUsername: "maintainer",
        },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await POST(
        new NextRequest("http://localhost/api/invites/generate", {
          method: "POST",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({}),
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.generated).toBe(10);
    });

    it("rejects count less than 1", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: true },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await POST(
        new NextRequest("http://localhost/api/invites/generate", {
          method: "POST",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({ count: 0 }),
        })
      );

      expect(res.status).toBe(400);
    });

    it("rejects count greater than 1000", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: true },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await POST(
        new NextRequest("http://localhost/api/invites/generate", {
          method: "POST",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({ count: 1001 }),
        })
      );

      expect(res.status).toBe(400);
    });

    it("rejects invalid expiry days", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: true },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await POST(
        new NextRequest("http://localhost/api/invites/generate", {
          method: "POST",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({ count: 5, expiryDays: 400 }),
        })
      );

      expect(res.status).toBe(400);
    });

    it("returns 403 for non-maintainer", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: false },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await POST(
        new NextRequest("http://localhost/api/invites/generate", {
          method: "POST",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({ count: 5 }),
        })
      );

      expect(res.status).toBe(403);
    });
  });

  describe("GET /api/invites/generate", () => {
    it("returns paginated invite list", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: true },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await GET(
        new NextRequest("http://localhost/api/invites/generate?page=1&pageSize=20")
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.page).toBe(1);
      expect(json.pageSize).toBe(20);
      expect(json.invites).toBeDefined();
    });

    it("respects page size limit", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: true },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await GET(
        new NextRequest("http://localhost/api/invites/generate?pageSize=200")
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.pageSize).toBe(100); // Capped at 100
    });

    it("returns 403 for non-maintainer", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: false },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await GET(
        new NextRequest("http://localhost/api/invites/generate")
      );

      expect(res.status).toBe(403);
    });
  });

  describe("DELETE /api/invites/generate", () => {
    it("deletes bulk invite links", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: "user-1",
          isMaintainer: true,
          githubUsername: "maintainer",
        },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await DELETE(
        new NextRequest("http://localhost/api/invites/generate", {
          method: "DELETE",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({ codes: ["code1", "code2", "code3"] }),
        })
      );

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.deleted).toBe(3);
      expect(recordAuditLog).toHaveBeenCalled();
    });

    it("rejects empty codes array", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: true },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await DELETE(
        new NextRequest("http://localhost/api/invites/generate", {
          method: "DELETE",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({ codes: [] }),
        })
      );

      expect(res.status).toBe(400);
    });

    it("rejects more than 1000 codes", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: true },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const codes = Array.from({ length: 1001 }, (_, i) => `code${i}`);
      const res = await DELETE(
        new NextRequest("http://localhost/api/invites/generate", {
          method: "DELETE",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({ codes }),
        })
      );

      expect(res.status).toBe(400);
    });

    it("returns 403 for non-maintainer", async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: "user-1", isMaintainer: false },
        expires: "2099-01-01T00:00:00.000Z",
      } satisfies Session);

      const res = await DELETE(
        new NextRequest("http://localhost/api/invites/generate", {
          method: "DELETE",
          headers: { origin: "http://localhost" },
          body: JSON.stringify({ codes: ["code1"] }),
        })
      );

      expect(res.status).toBe(403);
    });
  });
});
