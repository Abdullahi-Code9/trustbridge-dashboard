import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/check/route";

vi.mock("@/lib/horizon", () => ({
  checkStellarAddress: vi.fn(),
}));

import { checkStellarAddress } from "@/lib/horizon";

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

  it("returns 400 for missing address (same-origin)", async () => {
    const r = post({ address: "" });
    const res = await POST(r);
    expect(res.status).toBe(400);
  });

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
    expect(json.funded).toBe(true);
  });
});
