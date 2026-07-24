import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/register/route";

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

vi.mock("@/lib/horizon", () => ({
  checkStellarAddress: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    registration: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

vi.mock("@/lib/stellar", () => ({
  isValidStellarAddress: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { checkStellarAddress } from "@/lib/horizon";
import { prisma } from "@/lib/prisma";
import { isValidStellarAddress } from "@/lib/stellar";

const sameOriginHeaders: Record<string, string> = {
  origin: "http://localhost:3000",
  host: "localhost:3000",
  "content-type": "application/json",
};

function post(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/register", {
    method: "POST",
    headers: headers ?? sameOriginHeaders,
    body: JSON.stringify(body),
  });
}

describe("POST /api/register", () => {
  it("rejects cross-origin requests before touching session or DB", async () => {
    const r = post({ stellarAddress: "GBSX" }, {
      origin: "https://evil.com",
      host: "localhost:3000",
      "content-type": "application/json",
    });
    const res = await POST(r);
    expect(res.status).toBe(403);
    expect(getServerSession).not.toHaveBeenCalled();
    expect(prisma.registration.findUnique).not.toHaveBeenCalled();
  });

  it("returns 401 when same-origin but unauthenticated", async () => {
    vi.mocked(getServerSession).mockResolvedValue(null);
    const r = post({ stellarAddress: "GBSX" });
    const res = await POST(r);
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid address (same-origin + session)", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(isValidStellarAddress).mockReturnValue(false);
    const r = post({ stellarAddress: "bad" });
    const res = await POST(r);
    expect(res.status).toBe(400);
    expect(checkStellarAddress).not.toHaveBeenCalled();
  });

  it("returns 200 for valid same-origin session registration", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(isValidStellarAddress).mockReturnValue(true);
    vi.mocked(prisma.registration.findUnique).mockResolvedValue(null);
    vi.mocked(checkStellarAddress).mockResolvedValue({
      funded: true,
      trustline: true,
      xlm_balance: 2,
      readiness: "ready",
      horizon_error: null,
    } as any);
    vi.mocked(prisma.registration.upsert).mockResolvedValue({
      id: "reg-1",
      userId: "user-1",
      stellarAddress: "GBSX",
      funded: true,
      trustlineReady: true,
      xlmBalance: 2,
      lastCheckedAt: new Date(),
    } as any);

    const r = post({ stellarAddress: "GBSX" });
    const res = await POST(r);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.registration.stellarAddress).toBe("GBSX");
  });
});
