export type CircuitBreakerState = "CLOSED" | "OPEN" | "HALF_OPEN";

export interface CircuitBreakerOptions {
  /**
   * Number of consecutive failures before opening the circuit.
   */
  failureThreshold: number;
  /**
   * Number of consecutive successes in HALF_OPEN state before closing.
   */
  successThreshold: number;
  /**
   * Milliseconds to wait before attempting recovery (HALF_OPEN).
   */
  recoveryTimeoutMs: number;
}

function getDefaultOptions(): CircuitBreakerOptions {
  const failureThreshold = Number.parseInt(
    process.env.HORIZON_CB_FAILURE_THRESHOLD ?? "5",
    10
  );
  const successThreshold = Number.parseInt(
    process.env.HORIZON_CB_SUCCESS_THRESHOLD ?? "2",
    10
  );
  const recoveryTimeoutMs = Number.parseInt(
    process.env.HORIZON_CB_RECOVERY_MS ?? "30000",
    10
  );

  return {
    failureThreshold:
      Number.isFinite(failureThreshold) && failureThreshold > 0
        ? failureThreshold
        : 5,
    successThreshold:
      Number.isFinite(successThreshold) && successThreshold > 0
        ? successThreshold
        : 2,
    recoveryTimeoutMs:
      Number.isFinite(recoveryTimeoutMs) && recoveryTimeoutMs > 0
        ? recoveryTimeoutMs
        : 30000,
  };
}

/**
 * Generic circuit breaker that prevents repeated calls to a failing
 * dependency. Tracks state (CLOSED → OPEN → HALF_OPEN → CLOSED) and
 * fast-fails when OPEN.
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = "CLOSED";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime: number | null = null;

  constructor(private options: CircuitBreakerOptions = getDefaultOptions()) {}

  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics(): {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime: number | null;
  } {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
    };
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      const elapsed = Date.now() - (this.lastFailureTime ?? 0);
      if (elapsed > this.options.recoveryTimeoutMs) {
        this.state = "HALF_OPEN";
        this.successCount = 0;
      } else {
        throw new CircuitBreakerOpenError(
          this.options.recoveryTimeoutMs - elapsed
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.options.successThreshold) {
        this.state = "CLOSED";
        this.failureCount = 0;
        this.successCount = 0;
      }
    } else {
      this.failureCount = 0;
    }
  }

  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.state === "HALF_OPEN") {
      this.state = "OPEN";
      this.successCount = 0;
    } else if (this.failureCount >= this.options.failureThreshold) {
      this.state = "OPEN";
    }
  }
}

export class CircuitBreakerOpenError extends Error {
  constructor(public readonly remainingMs: number) {
    super(`Circuit breaker is open. Retry after ${remainingMs}ms.`);
    this.name = "CircuitBreakerOpenError";
  }
}
