# Horizon Retry Notes

Horizon is an external dependency, so transient failures should be visible without confusing contributors.

## Retryable cases

- Rate limiting.
- Temporary upstream errors.
- Request timeouts.

## Product behavior

When checks cannot complete, show a not-ready state with a clear Horizon availability message. Avoid marking an account ready from stale data immediately before payout export.
