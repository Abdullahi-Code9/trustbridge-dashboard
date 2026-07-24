import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { assertSameOrigin } from "@/lib/csrf";

function req(
  method: string,
  url: string,
  headers?: Record<string, string>
): NextRequest {
  return new NextRequest(url, { method, headers });
}

describe("assertSameOrigin", () => {
  it("allows safe methods regardless of origin", () => {
    const r = req("GET", "http://localhost:3000/api/check", {
      origin: "https://evil.com",
    });
    expect(assertSameOrigin(r)).toBeNull();
  });

  it("allows same-origin POST (Origin matches Host)", () => {
    const r = req("POST", "http://localhost:3000/api/check", {
      origin: "http://localhost:3000",
      host: "localhost:3000",
    });
    expect(assertSameOrigin(r)).toBeNull();
  });

  it("rejects cross-origin POST (mismatched Origin)", () => {
    const r = req("POST", "http://localhost:3000/api/check", {
      origin: "https://evil.com",
      host: "localhost:3000",
    });
    const res = assertSameOrigin(r);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("allows Origin matching x-forwarded-host", () => {
    const r = req("POST", "http://localhost:3000/api/check", {
      origin: "https://app.vercel.app",
      "x-forwarded-host": "app.vercel.app",
      host: "localhost:3000",
    });
    expect(assertSameOrigin(r)).toBeNull();
  });

  it("allows Origin matching NEXTAUTH_URL host", () => {
    vi.stubEnv("NEXTAUTH_URL", "https://dashboard.example.com");
    const r = req("POST", "http://localhost:3000/api/check", {
      origin: "https://dashboard.example.com",
      host: "localhost:3000",
    });
    expect(assertSameOrigin(r)).toBeNull();
    vi.unstubAllEnvs();
  });

  it("falls back to request URL host when Host header absent", () => {
    const r = req("POST", "http://localhost:3000/api/check", {
      origin: "http://localhost:3000",
    });
    expect(assertSameOrigin(r)).toBeNull();
  });

  it("rejects when Origin port differs (localhost:3000 vs 4000)", () => {
    const r = req("POST", "http://localhost:3000/api/check", {
      origin: "http://localhost:4000",
      host: "localhost:3000",
    });
    const res = assertSameOrigin(r);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("falls back to Referer when Origin absent", () => {
    const r = req("POST", "http://localhost:3000/api/check", {
      referer: "http://localhost:3000/",
      host: "localhost:3000",
    });
    expect(assertSameOrigin(r)).toBeNull();
  });

  it("rejects mismatched Referer when Origin absent", () => {
    const r = req("POST", "http://localhost:3000/api/check", {
      referer: "https://evil.com/",
      host: "localhost:3000",
    });
    const res = assertSameOrigin(r);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });

  it("allows when both Origin and Referer are absent (non-browser)", () => {
    const r = req("POST", "http://localhost:3000/api/check", {
      host: "localhost:3000",
    });
    expect(assertSameOrigin(r)).toBeNull();
  });

  it("rejects malformed Origin header", () => {
    const r = req("POST", "http://localhost:3000/api/check", {
      origin: "not-a-valid-url",
      host: "localhost:3000",
    });
    const res = assertSameOrigin(r);
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
  });
});
