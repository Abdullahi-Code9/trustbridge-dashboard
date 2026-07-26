/**
 * Caching layer for TrustBridge Dashboard.
 * Reduces database queries and Horizon API calls with intelligent TTL management.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  hits: number;
}

/**
 * Generic in-memory cache with TTL and statistics.
 */
export class CacheStore<T> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly defaultTtlMs: number;
  private stats = { hits: 0, misses: 0, evictions: 0 };

  constructor(defaultTtlMs: number = 60_000) {
    this.defaultTtlMs = defaultTtlMs;
  }

  /**
   * Get a value from cache if valid.
   */
  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.stats.evictions++;
      return null;
    }

    entry.hits++;
    this.stats.hits++;
    return entry.data;
  }

  /**
   * Set a value in cache.
   */
  set(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
      hits: 0,
    });
  }

  /**
   * Get or compute a value with fallback.
   */
  async getOrCompute(
    key: string,
    fn: () => Promise<T>,
    ttlMs?: number,
  ): Promise<T> {
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }

    const data = await fn();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Invalidate a specific cache entry.
   */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /**
   * Invalidate all entries matching a pattern.
   */
  invalidatePattern(pattern: RegExp): number {
    let count = 0;
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      if (pattern.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.store.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
  }

  /**
   * Reset the cache — clears all entries and zeroes all stats.
   * Alias for `clear()` with a more test-friendly name, matching the
   * `resetRateLimit()` / `resetCircuitBreaker()` convention used elsewhere.
   */
  reset(): void {
    this.clear();
  }

  /**
   * Get cache statistics.
   */
  getStats(): {
    size: number;
    hits: number;
    misses: number;
    evictions: number;
    hitRate: number;
    keys: string[];
  } {
    const total = this.stats.hits + this.stats.misses;
    return {
      size: this.store.size,
      hits: this.stats.hits,
      misses: this.stats.misses,
      evictions: this.stats.evictions,
      hitRate: total > 0 ? Math.round((this.stats.hits / total) * 100) : 0,
      keys: Array.from(this.store.keys()),
    };
  }
}

/**
 * Specific cache for contributor data.
 */
export const contributorCache = new CacheStore<unknown>(5 * 60_000); // 5 minutes

/**
 * Specific cache for verification status.
 */
export const verificationCache = new CacheStore<unknown>(2 * 60_000); // 2 minutes

/**
 * Specific cache for statistics.
 */
export const statsCache = new CacheStore<unknown>(10 * 60_000); // 10 minutes

/**
 * Parse the CHECK_CACHE_TTL_MS environment variable.
 * Falls back to 2 minutes when unset or invalid.
 * Exposed so tests can verify the default without importing process.env directly.
 */
export function parseCheckCacheTtl(): number {
  const raw = process.env.CHECK_CACHE_TTL_MS;
  if (!raw) return 2 * 60_000;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 2 * 60_000;
}

/**
 * Dedicated KV cache for /api/check responses.
 *
 * Keyed by `check:<address>:<assetCode>:<assetIssuer>` so the same address
 * checked against different assets never collides.  TTL is controlled by the
 * CHECK_CACHE_TTL_MS environment variable (default 2 minutes).
 *
 * Kept separate from verificationCache (used internally by horizon.ts) so the
 * two layers can have independent TTLs and can be invalidated independently in
 * tests and production flows.
 */
export const checkCache = new CacheStore<unknown>(parseCheckCacheTtl());

/**
 * Build cache key from function arguments.
 */
export function buildCacheKey(prefix: string, ...args: unknown[]): string {
  return `${prefix}:${args.map((a) => JSON.stringify(a)).join(':')}`;
}

/**
 * Invalidate contributor-related caches.
 */
export function invalidateContributorCaches(): void {
  contributorCache.invalidatePattern(/^contributor:/);
  verificationCache.invalidatePattern(/^verification:/);
  statsCache.invalidatePattern(/^stats:/);
}
