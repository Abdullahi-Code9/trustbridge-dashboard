# Readiness Model

The dashboard presents contributor payout readiness as a small set of maintainable states.

## Ready

The account exists on Horizon, has the configured asset trustline, and meets the minimum XLM reserve.

## Low reserve

The account exists and has the trustline, but its **spendable** XLM is below the configured threshold. The contributor may still receive assets, but future operations can fail if the reserve is too low.

Spendable XLM is the raw native balance minus the Stellar minimum reserve (`baseReserve * (2 + subentries + sponsoring − sponsored)`) and any `selling_liabilities` — the raw balance alone can look healthy while the spendable amount is near zero once trustlines, offers, or signers are accounted for. See `computeSpendableXlmBalance()` in `src/lib/readiness.ts`.

## Not ready

The account is unfunded, the trustline is missing, or Horizon cannot complete the check. Maintainers should avoid payout export until the state changes.
