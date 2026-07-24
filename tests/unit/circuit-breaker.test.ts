import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  CircuitBreaker,
  CircuitBreakerOpenError,
} from "@/lib/circuit-breaker";

describe("CircuitBreaker", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows calls when CLOSED", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      recoveryTimeoutMs: 1000,
    });
    const result = await cb.call(() => Promise.resolve(42));
    expect(result).toBe(42);
    expect(cb.getState()).toBe("CLOSED");
  });

  it("opens after failure threshold reached", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 2,
      successThreshold: 1,
      recoveryTimeoutMs: 5000,
    });

    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    expect(cb.getState()).toBe("CLOSED");

    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    expect(cb.getState()).toBe("OPEN");
  });

  it("fast-fails with CircuitBreakerOpenError when OPEN", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      recoveryTimeoutMs: 5000,
    });

    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    expect(cb.getState()).toBe("OPEN");

    await expect(cb.call(() => Promise.resolve(42))).rejects.toThrow(CircuitBreakerOpenError);
  });

  it("transitions to HALF_OPEN after recovery timeout", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      recoveryTimeoutMs: 1000,
    });

    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    expect(cb.getState()).toBe("OPEN");

    vi.advanceTimersByTime(1001);

    // First call after recovery should be allowed (HALF_OPEN)
    const result = await cb.call(() => Promise.resolve(42));
    expect(result).toBe(42);
    expect(cb.getState()).toBe("CLOSED");
  });

  it("returns to OPEN if HALF_OPEN call fails", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      recoveryTimeoutMs: 1000,
    });

    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    expect(cb.getState()).toBe("OPEN");

    vi.advanceTimersByTime(1001);

    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    expect(cb.getState()).toBe("OPEN");
  });

  it("closes after success threshold in HALF_OPEN", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 2,
      recoveryTimeoutMs: 1000,
    });

    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    expect(cb.getState()).toBe("OPEN");

    vi.advanceTimersByTime(1001);

    await cb.call(() => Promise.resolve(1));
    expect(cb.getState()).toBe("HALF_OPEN");

    await cb.call(() => Promise.resolve(2));
    expect(cb.getState()).toBe("CLOSED");
  });

  it("resets failure count on success in CLOSED state", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 1,
      recoveryTimeoutMs: 1000,
    });

    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    await cb.call(() => Promise.resolve(42));

    // Failure count should be reset after success
    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    expect(cb.getState()).toBe("CLOSED"); // still closed because threshold is 3
  });

  it("uses env defaults when not set", async () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe("CLOSED");
    await cb.call(() => Promise.resolve(42));
    expect(cb.getState()).toBe("CLOSED");
  });

  it("uses env values when set", async () => {
    vi.stubEnv("HORIZON_CB_FAILURE_THRESHOLD", "1");
    vi.stubEnv("HORIZON_CB_RECOVERY_MS", "500");
    vi.stubEnv("HORIZON_CB_SUCCESS_THRESHOLD", "1");

    const cb = new CircuitBreaker();
    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    expect(cb.getState()).toBe("OPEN");

    vi.advanceTimersByTime(501);
    await cb.call(() => Promise.resolve(42));
    expect(cb.getState()).toBe("CLOSED");

    vi.unstubAllEnvs();
  });

  it("ignores malformed env values and uses defaults", async () => {
    vi.stubEnv("HORIZON_CB_FAILURE_THRESHOLD", "not-a-number");
    vi.stubEnv("HORIZON_CB_RECOVERY_MS", "not-a-number");
    vi.stubEnv("HORIZON_CB_SUCCESS_THRESHOLD", "not-a-number");

    const cb = new CircuitBreaker();
    // Default threshold is 5, so 1 failure shouldn't open
    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    expect(cb.getState()).toBe("CLOSED");

    vi.unstubAllEnvs();
  });

  it("exposes metrics", async () => {
    const cb = new CircuitBreaker({
      failureThreshold: 1,
      successThreshold: 1,
      recoveryTimeoutMs: 1000,
    });

    const metrics1 = cb.getMetrics();
    expect(metrics1.state).toBe("CLOSED");
    expect(metrics1.failureCount).toBe(0);

    await expect(cb.call(() => Promise.reject(new Error("fail")))).rejects.toThrow("fail");
    const metrics2 = cb.getMetrics();
    expect(metrics2.state).toBe("OPEN");
    expect(metrics2.failureCount).toBe(1);
    expect(metrics2.lastFailureTime).not.toBeNull();
  });
});
