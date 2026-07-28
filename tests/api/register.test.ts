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

vi.mock("@/lib/soroban-register", () => ({
  mirrorRegistrationToSoroban: vi.fn(),
}));

vi.mock("@/lib/audit", () => ({
  recordAuditLog: vi.fn(),
}));

import { getServerSession } from "next-auth";
import { checkStellarAddress } from "@/lib/horizon";
import { prisma } from "@/lib/prisma";
import { mirrorRegistrationToSoroban } from "@/lib/soroban-register";

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
  const validAddress =
    "GDXNXL25GDM3N5LAR5FALA3VSGHFET3EOKLXRP3ITPPMR3PISTQSKSFS";

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

  it("returns 400 for empty address", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    const r = post({ stellarAddress: "" });
    const res = await POST(r);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain("required");
    expect(json.validationErrors).toBeDefined();
  });

  it("returns 400 for invalid address format", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    const r = post({ stellarAddress: "SBSX7U7ARH74ENSCCX7FYTA5FS2YQXZHY737IBSZEOF72ULMITMZNKQ" });
    const res = await POST(r);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.validationErrors).toBeDefined();
    expect(checkStellarAddress).not.toHaveBeenCalled();
  });

  it("returns 200 for valid same-origin session registration", async () => {
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: "user-1", githubUsername: "gidson5" },
    } as any);
    vi.mocked(prisma.registration.findUnique).mockResolvedValue(null);
    vi.mocked(checkStellarAddress).mockResolvedValue({
      funded: true,
      trustline: true,
      xlm_balance: "2",
      readiness: "ready",
      horizon_error: null,
      trustline_authorized: true,
      verified: true,
      spendable_xlm_balance: "1.5",
      errors: [],
    } as any);
    vi.mocked(prisma.registration.upsert).mockResolvedValue({
      id: "reg-1",
      userId: "user-1",
      stellarAddress: validAddress,
      funded: true,
      trustlineReady: true,
      trustlineAuthorized: true,
      xlmBalance: "2",
      spendableXlmBalance: "1.5",
      lastCheckedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    vi.mocked(mirrorRegistrationToSoroban).mockResolvedValue({
      success: true,
      errors: [],
    });

    const r = post({
      stellarAddress: validAddress,
    });
    const res = await POST(r);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.registration.stellarAddress).toBe(validAddress);
    expect(json.registration.walletProof.provider).toBe("Freighter");
    expect(json.registration.walletProof.challenge).toContain(
      "GitHub handle: @gidson5"
    );
    expect(json.registration.horizonDebug.summary).toContain("All Horizon");
    expect(mirrorRegistrationToSoroban).toHaveBeenCalled();
  });
});
