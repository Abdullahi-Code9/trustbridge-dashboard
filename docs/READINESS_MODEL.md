# Readiness Model

The dashboard presents contributor payout readiness as a small set of maintainable states.

## Ready

The account exists on Horizon, has the configured asset trustline, and meets the minimum XLM reserve.

## Low reserve

The account exists and has the trustline, but native XLM is below the configured threshold. The contributor may still receive assets, but future operations can fail if the reserve is too low.

## Not ready

The account is unfunded, the trustline is missing, or Horizon cannot complete the check. Maintainers should avoid payout export until the state changes.
