# CSV Export Guide

CSV exports should be treated as payout artifacts.

## Recommended columns

- GitHub username.
- Stellar address.
- Readiness status.
- Asset code and issuer.
- Last checked timestamp.

## Export columns

The CSV export includes the following columns:

- `id` — Contributor internal ID
- `githubUsername` — GitHub username
- `stellarAddress` — Stellar public key
- `funded` — Account funded (yes/no)
- `trustlineReady` — Trustline established (yes/no)
- `trustlineAuthorized` — Trustline authorized (yes/no)
- `verified` — On-chain verified (yes/no)
- `xlmBalance` — XLM balance
- `spendableXlmBalance` — Spendable XLM balance
- `readiness` — Readiness status (ready/low_reserve/not_ready)
- `lastCheckedAt` — Last check timestamp
- `horizonDebugSummary` — Horizon state summary
- `horizonNextAction` — Recommended next action
- `freighterProofChallenge` — Freighter proof challenge

## Before sending payments

Re-run readiness checks, exclude not-ready contributors, and keep the export alongside the transaction batch hash for later review.

## Security notes

- CSV exports are maintainer-only
- Never commit exports with real data to version control
- Exports are audit-logged
- No access tokens or secrets are included in exports
