import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  CacheStore,
  buildCacheKey,
  checkCache,
  parseCheckCacheTtl,
} from "@/lib/cache";

// ---------------------------------------------------------------------------
// CacheStore — core behaviour
// ---------------------------------------------------------------------------
describe("CacheStore", () => {
  let cache: CacheStore<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new CacheStore<string>(1_000); // 1-second TTL for tests
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── get / set ─────────────────────────────────────────────────────────────

  it("returns null on a cache miss", () => {
    expect(cache.get("missing")).toBeNull();
  });

  it("returns the stored value on a cache hit", () => {
    cache.set("key", "value");
    expect(cache.get("key")).toBe("value");
  });

  it("returns null after TTL expires (eviction on read)", () => {
    cache.set("key", "value");
    vi.advanceTimersByTime(1_001);
    expect(cache.get("key")).toBeNull();
  });

  it("does not evict an entry before its TTL", () => {
    cache.set("key", "value");
    vi.advanceTimersByTime(999);
    expect(cache.get("key")).toBe("value");
  });

  it("per-entry TTL override takes precedence over the default", () => {
    cache.set("short", "v", 500);
    vi.advanceTimersByTime(501);
    expect(cache.get("short")).toBeNull();

    cache.set("long", "v", 5_000);
    vi.advanceTimersByTime(1_001); // default TTL would expire here
    expect(cache.get("long")).toBe("v");
  });

  it("latest set wins for the same key", () => {
    cache.set("key", "first");
    cache.set("key", "second");
    expect(cache.get("key")).toBe("second");
  });

  // ── invalidate ────────────────────────────────────────────────────────────

  it("invalidate removes a specific entry", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.invalidate("a");
    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBe("2");
  });

  it("invalidate is a no-op for unknown keys", () => {
    expect(() => cache.invalidate("nope")).not.toThrow();
  });

  it("invalidatePattern removes matching entries and returns count", () => {
    cache.set("check:GABCD:USDC:GA5Z", "r1");
    cache.set("check:GXYZ:USDC:GA5Z", "r2");
    cache.set("horizon:GABCD:USDC:GA5Z", "r3");

    const removed = cache.invalidatePattern(/^check:/);
    expect(removed).toBe(2);
    expect(cache.get("check:GABCD:USDC:GA5Z")).toBeNull();
    expect(cache.get("check:GXYZ:USDC:GA5Z")).toBeNull();
    expect(cache.get("horizon:GABCD:USDC:GA5Z")).toBe("r3");
  });

  it("invalidatePattern returns 0 when nothing matches", () => {
    cache.set("foo", "bar");
    expect(cache.invalidatePattern(/^nomatch/)).toBe(0);
  });

  // ── clear / reset ─────────────────────────────────────────────────────────

  it("clear removes all entries", () => {
    cache.set("a", "1");
    cache.set("b", "2");
    cache.clear();
    expect(cache.get("a")).toBeNull();
    expect(cache.get("b")).toBeNull();
  });

  it("reset is an alias for clear and zeroes stats", () => {
    cache.set("a", "1");
    cache.get("a"); // register a hit
    cache.reset();
    const stats = cache.getStats();
    expect(stats.size).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.misses).toBe(0);
    expect(stats.evictions).toBe(0);
  });

  // ── getOrCompute ──────────────────────────────────────────────────────────

  it("getOrCompute calls fn on miss and caches the result", async () => {
    const fn = vi.fn().mockResolvedValue("computed");
    const result = await cache.getOrCompute("k", fn);
    expect(result).toBe("computed");
    expect(fn).toHaveBeenCalledTimes(1);

    // Second call must be served from cache
    const cached = await cache.getOrCompute("k", fn);
    expect(cached).toBe("computed");
    expect(fn).toHaveBeenCalledTimes(1); // fn not called again
  });

  it("getOrCompute re-invokes fn after TTL expires", async () => {
    const fn = vi.fn().mockResolvedValue("fresh");
    await cache.getOrCompute("k", fn);
    vi.advanceTimersByTime(1_001);
    await cache.getOrCompute("k", fn);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("getOrCompute propagates fn errors without caching", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(cache.getOrCompute("k", fn)).rejects.toThrow("boom");
    expect(cache.get("k")).toBeNull();
  });

  // ── stats ─────────────────────────────────────────────────────────────────

  it("getStats tracks hits, misses, evictions, and hitRate", () => {
    cache.set("a", "1");
    cache.get("a"); // hit
    cache.get("b"); // miss

    // Trigger an eviction
    vi.advanceTimersByTime(1_001);
    cache.get("a"); // expired → eviction

    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.evictions).toBe(1);
    expect(stats.hitRate).toBe(50); // 1 hit / 2 total = 50 %
  });

  it("getStats hitRate is 0 when there are no accesses", () => {
    expect(cache.getStats().hitRate).toBe(0);
  });

  it("getStats.keys lists all live keys", () => {
    cache.set("x", "1");
    cache.set("y", "2");
    const keys = cache.getStats().keys;
    expect(keys).toContain("x");
    expect(keys).toContain("y");
    expect(keys).toHaveLength(2);
  });

  it("getStats.size reflects current live entries", () => {
    expect(cache.getStats().size).toBe(0);
    cache.set("a", "1");
    expect(cache.getStats().size).toBe(1);
    cache.clear();
    expect(cache.getStats().size).toBe(0);
  });

  // ── scale: 100+ keys ─────────────────────────────────────────────────────

  it("handles 100+ concurrent keys without collision", () => {
    const count = 150;
    for (let i = 0; i < count; i++) {
      cache.set(`key:${i}`, `value:${i}`);
    }
    expect(cache.getStats().size).toBe(count);
    for (let i = 0; i < count; i++) {
      expect(cache.get(`key:${i}`)).toBe(`value:${i}`);
    }
  });

  it("invalidatePattern handles 100+ keys efficiently", () => {
    for (let i = 0; i < 120; i++) {
      cache.set(`check:addr${i}`, `r${i}`);
    }
    for (let i = 0; i < 30; i++) {
      cache.set(`horizon:addr${i}`, `r${i}`);
    }
    const removed = cache.invalidatePattern(/^check:/);
    expect(removed).toBe(120);
    expect(cache.getStats().size).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// buildCacheKey
// ---------------------------------------------------------------------------
describe("buildCacheKey", () => {
  it("produces deterministic keys", () => {
    const k1 = buildCacheKey("check", "GABCD", "USDC", "GISSUER");
    const k2 = buildCacheKey("check", "GABCD", "USDC", "GISSUER");
    expect(k1).toBe(k2);
  });

  it("distinguishes different addresses", () => {
    const k1 = buildCacheKey("check", "GABCD", "USDC", "GI");
    const k2 = buildCacheKey("check", "GXYZ", "USDC", "GI");
    expect(k1).not.toBe(k2);
  });

  it("distinguishes different asset codes", () => {
    const k1 = buildCacheKey("check", "GABCD", "USDC", "GI");
    const k2 = buildCacheKey("check", "GABCD", "XLM", "GI");
    expect(k1).not.toBe(k2);
  });

  it("distinguishes different prefixes", () => {
    const k1 = buildCacheKey("check", "GABCD");
    const k2 = buildCacheKey("horizon", "GABCD");
    expect(k1).not.toBe(k2);
  });
});

// ---------------------------------------------------------------------------
// parseCheckCacheTtl
// ---------------------------------------------------------------------------
describe("parseCheckCacheTtl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns the default 2-minute TTL when env is unset", () => {
    delete process.env.CHECK_CACHE_TTL_MS;
    expect(parseCheckCacheTtl()).toBe(2 * 60_000);
  });

  it("parses a valid env value", () => {
    vi.stubEnv("CHECK_CACHE_TTL_MS", "30000");
    expect(parseCheckCacheTtl()).toBe(30_000);
  });

  it("falls back to default for non-numeric env values", () => {
    vi.stubEnv("CHECK_CACHE_TTL_MS", "not-a-number");
    expect(parseCheckCacheTtl()).toBe(2 * 60_000);
  });

  it("falls back to default for zero", () => {
    vi.stubEnv("CHECK_CACHE_TTL_MS", "0");
    expect(parseCheckCacheTtl()).toBe(2 * 60_000);
  });

  it("falls back to default for negative values", () => {
    vi.stubEnv("CHECK_CACHE_TTL_MS", "-500");
    expect(parseCheckCacheTtl()).toBe(2 * 60_000);
  });
});

// ---------------------------------------------------------------------------
// checkCache singleton — smoke test (not exhaustive — CacheStore tests above
// cover all the behaviour; here we just confirm the export exists and works)
// ---------------------------------------------------------------------------
describe("checkCache singleton", () => {
  beforeEach(() => {
    checkCache.reset();
  });

  it("is a CacheStore instance", () => {
    expect(checkCache).toBeInstanceOf(CacheStore);
  });

  it("stores and retrieves a check result", () => {
    const result = { funded: true, trustline: true, readiness: "ready" };
    checkCache.set("check:GABCD", result);
    expect(checkCache.get("check:GABCD")).toEqual(result);
  });

  it("reset() clears all entries between tests", () => {
    checkCache.set("check:GABCD", { funded: true });
    checkCache.reset();
    expect(checkCache.get("check:GABCD")).toBeNull();
    expect(checkCache.getStats().size).toBe(0);
  });
});
