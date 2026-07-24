import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, extractClientIp, resetRateLimit } from "@/lib/rate-limit";
import { NextRequest } from "next/server";

describe("rate-limit", () => {
  beforeEach(() => {
    resetRateLimit();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests within the limit", () => {
    const result = checkRateLimit("ip-1", { windowMs: 60000, maxRequests: 3 });
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("blocks requests exceeding the limit", () => {
    const opts = { windowMs: 60000, maxRequests: 2 };
    checkRateLimit("ip-1", opts);
    checkRateLimit("ip-1", opts);
    const result = checkRateLimit("ip-1", opts);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("resets the window after time passes", () => {
    const opts = { windowMs: 1000, maxRequests: 1 };
    checkRateLimit("ip-1", opts);
    vi.advanceTimersByTime(1001);
    const result = checkRateLimit("ip-1", opts);
    expect(result.allowed).toBe(true);
  });

  it("tracks different identifiers independently", () => {
    const opts = { windowMs: 60000, maxRequests: 1 };
    checkRateLimit("ip-a", opts);
    const result = checkRateLimit("ip-b", opts);
    expect(result.allowed).toBe(true);
  });

  it("extracts IP from x-forwarded-for", () => {
    const r = new NextRequest("http://localhost:3000/api/check", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(extractClientIp(r)).toBe("1.2.3.4");
  });

  it("extracts IP from x-real-ip", () => {
    const r = new NextRequest("http://localhost:3000/api/check", {
      headers: { "x-real-ip": "9.8.7.6" },
    });
    expect(extractClientIp(r)).toBe("9.8.7.6");
  });

  it("extracts IP from cf-connecting-ip", () => {
    const r = new NextRequest("http://localhost:3000/api/check", {
      headers: { "cf-connecting-ip": "10.20.30.40" },
    });
    expect(extractClientIp(r)).toBe("10.20.30.40");
  });

  it("falls back to unknown when no IP headers present", () => {
    const r = new NextRequest("http://localhost:3000/api/check");
    expect(extractClientIp(r)).toBe("unknown");
  });

  it("uses defaults when env is not set", () => {
    const result = checkRateLimit("ip-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9); // default max is 10
  });

  it("ignores malformed env values and uses defaults", () => {
    vi.stubEnv("RATE_LIMIT_WINDOW_MS", "not-a-number");
    vi.stubEnv("RATE_LIMIT_MAX_REQUESTS", "not-a-number");
    const result = checkRateLimit("ip-1");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(9);
    vi.unstubAllEnvs();
  });
});
