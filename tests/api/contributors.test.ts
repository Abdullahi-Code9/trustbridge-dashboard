import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/contributors/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/registrations", () => ({
  getContributors: vi.fn(),
  refreshAllContributors: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { getContributors, refreshAllContributors } from "@/lib/registrations";

const sameOriginHeaders: Record<string, string> = {
  origin: "http://localhost:3000",
  host: "localhost:3000",
  "content-type": "application/json",
};

function post(headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/contributors", {
    method: "POST",
    headers: headers ?? sameOriginHeaders,
  });
}

describe("POST /api/contributors", () => {
  it("rejects cross-origin with CSRF error before touching auth", async () => {
    const r = post({
      origin: "https://evil.com",
      host: "localhost:3000",
    });
    const res = await POST(r);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Invalid request origin");
    expect(getServerSession).not.toHaveBeenCalled();
  });

  it("returns 403 (auth) for same-origin non-maintainer", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", isMaintainer: false },
    } as any);
    const r = post();
    const res = await POST(r);
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("Forbidden");
    expect(refreshAllContributors).not.toHaveBeenCalled();
  });

  it("returns 200 for same-origin maintainer", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", isMaintainer: true },
    } as any);
    vi.mocked(refreshAllContributors).mockResolvedValue(3);
    vi.mocked(getContributors).mockResolvedValue({
      contributors: [],
      total: 3,
    } as any);

    const r = post();
    const res = await POST(r);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.refreshed).toBe(3);
    expect(json.pagination).toBeDefined();
    expect(json.pagination.page).toBe(1);
    expect(json.pagination.total).toBe(3);
  });

  it("returns paginated results with custom page and limit", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", isMaintainer: true },
    } as any);
    vi.mocked(refreshAllContributors).mockResolvedValue(150);
    vi.mocked(getContributors).mockResolvedValue({
      contributors: Array.from({ length: 25 }),
      total: 150,
    } as any);

    const r = new NextRequest(
      "http://localhost:3000/api/contributors?page=2&limit=25",
      {
        method: "POST",
        headers: sameOriginHeaders,
      }
    );
    const res = await POST(r);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.pagination.page).toBe(2);
    expect(json.pagination.limit).toBe(25);
    expect(json.pagination.total).toBe(150);
    expect(json.pagination.pages).toBe(6);
    expect(json.pagination.hasNextPage).toBe(true);
    expect(json.pagination.hasPrevPage).toBe(true);
  });
});
