import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/check/route";

vi.mock("@/lib/horizon", () => ({
  checkStellarAddress: vi.fn(),
}));

import { checkStellarAddress } from "@/lib/horizon";

function post(body: unknown) {
  return new NextRequest("http://localhost:3000/api/check", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with mocked result for valid address", async () => {
    vi.mocked(checkStellarAddress).mockResolvedValue({
      funded: true,
      trustline: true,
      xlm_balance: 2,
      readiness: "ready",
      errors: [],
    } as any);

    const r = post({ address: "GBSX" });
    const res = await POST(r);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.funded).toBe(true);
  });

  it("returns 400 for missing address", async () => {
    const r = post({ address: "" });
    const res = await POST(r);
    expect(res.status).toBe(400);
  });

  it("returns 200 with not-ready state when circuit breaker is open", async () => {
    vi.mocked(checkStellarAddress).mockResolvedValue({
      funded: false,
      trustline: false,
      xlm_balance: "0",
      readiness: "not_ready",
      errors: ["Horizon is temporarily unavailable. Please try again later."],
    } as any);

    const r = post({ address: "GBSX" });
    const res = await POST(r);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.errors).toContain(
      "Horizon is temporarily unavailable. Please try again later."
    );
  });

  it("returns 500 for unexpected errors", async () => {
    vi.mocked(checkStellarAddress).mockRejectedValue(new Error("boom"));

    const r = post({ address: "GBSX" });
    const res = await POST(r);
    expect(res.status).toBe(500);
  });
});
