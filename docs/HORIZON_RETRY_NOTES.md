# Horizon Retry Notes

Horizon is an external dependency, so transient failures should be visible without confusing contributors.

## Circuit breaker

`src/lib/circuit-breaker.ts` wraps Horizon calls with a state-machine breaker (CLOSED → OPEN → HALF_OPEN → CLOSED):

| Config env var | Default | Description |
|----------------|---------|-------------|
| `HORIZON_CB_FAILURE_THRESHOLD` | 5 | Consecutive failures before opening |
| `HORIZON_CB_RECOVERY_MS` | 30000 | Milliseconds to wait before probing recovery |
| `HORIZON_CB_SUCCESS_THRESHOLD` | 2 | Successful probe calls required to close again |

When the breaker is **OPEN**, `checkStellarAddress` returns a `not_ready` result with the message:

> "Horizon is temporarily unavailable. Please try again later."

This prevents wasted network calls, protects Horizon rate limits, and keeps the maintainer batch re-check (`POST /api/contributors`) from stalling when Horizon is down.

## Retryable cases

- Rate limiting.
- Temporary upstream errors.
- Request timeouts.

## Product behavior

When checks cannot complete, show a not-ready state with a clear Horizon availability message. Avoid marking an account ready from stale data immediately before payout export.

## Related docs

- [Architecture overview](../docs/ARCHITECTURE.md)
- [Environment variables](../docs/ENVIRONMENT.md)
