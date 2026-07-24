import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/check/route";

vi.mock("@/lib/horizon", () => ({
  checkStellarAddress: vi.fn(),
}));

import { checkStellarAddress } from "@/lib/horizon";
import { resetRateLimit } from "@/lib/rate-limit";

function post(body: unknown) {
  return new NextRequest("http://localhost:3000/api/check", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
const sameOriginHeaders: Record<string, string> = {
  origin: "http://localhost:3000",
  host: "localhost:3000",
  "content-type": "application/json",
};

function post(body: unknown, headers?: Record<string, string>) {
  return new NextRequest("http://localhost:3000/api/check", {
    method: "POST",
    headers: headers ?? sameOriginHeaders,
    body: JSON.stringify(body),
  });
}

describe("POST /api/check", () => {
  beforeEach(() => {
    resetRateLimit();
    vi.clearAllMocks();
  });

  it("rejects cross-origin requests before touching Horizon", async () => {
    const r = post({ address: "GBSX" }, {
      origin: "https://evil.com",
      host: "localhost:3000",
      "content-type": "application/json",
    });
    const res = await POST(r);
    expect(res.status).toBe(403);
    expect(checkStellarAddress).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limit exceeded", async () => {
    vi.mocked(checkStellarAddress).mockResolvedValue({
      funded: true,
      trustline: true,
      xlm_balance: 2,
      readiness: "ready",
      horizon_error: null,
    } as any);

    // Exhaust the default limit (10 requests)
    for (let i = 0; i < 10; i++) {
      const r = post({ address: "GBSX" });
      const res = await POST(r);
      expect(res.status).toBe(200);
    }

    const r = post({ address: "GBSX" });
    const res = await POST(r);
    expect(res.status).toBe(429);
    const retryAfter = res.headers.get("retry-after");
    expect(retryAfter).toBeTruthy();
    expect(checkStellarAddress).toHaveBeenCalledTimes(10);
  });

  it("returns 400 for missing address (same-origin)", async () => {
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
  it("returns 200 with mocked result (same-origin)", async () => {
    vi.mocked(checkStellarAddress).mockResolvedValue({
      funded: true,
      trustline: true,
      xlm_balance: 2,
      readiness: "ready",
      horizon_error: null,
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
    expect(json.funded).toBe(true);
  });
});
