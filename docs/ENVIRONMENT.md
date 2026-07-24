# Environment Variables

Complete reference for all configuration used by TrustBridge Dashboard.

← Back to [README](../README.md) · See also [Setup guide](./SETUP.md) · [Deployment](./DEPLOYMENT.md)

Copy `.env.example` to `.env.local` (development) or configure in your Vercel project settings (production).

---

## Required variables

### `GITHUB_CLIENT_ID`

GitHub OAuth App client ID.

- **Where:** [GitHub Developer Settings](https://github.com/settings/developers)
- **Used by:** NextAuth.js GitHub provider

### `GITHUB_CLIENT_SECRET`

GitHub OAuth App client secret.

- **Server-only** — never expose to the browser
- **Used by:** NextAuth.js token exchange

### `NEXTAUTH_URL`

Canonical URL of the deployment.

| Environment | Value |
|-------------|-------|
| Local | `http://localhost:3000` |
| Production | `https://your-domain.vercel.app` |

Used for OAuth callback generation.

### `NEXTAUTH_SECRET`

Random string for JWT/session encryption.

Generate:

```bash
openssl rand -base64 32
```

**Required in production.** Missing value causes auth failures.

### `GITHUB_MAINTAINER_ORG`

GitHub organization **slug** (login name) whose members can access `/dashboard`.

Example: if your org URL is `https://github.com/stellar`, set `GITHUB_MAINTAINER_ORG=stellar`.

- Checked via GitHub API `GET /user/orgs` after sign-in
- Non-members can still use `/register`

### `DATABASE_URL`

PostgreSQL connection string.

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

Providers: local Postgres, Neon, Supabase, Vercel Postgres, Railway, etc.

### `TOKEN_ENCRYPTION_KEY`

Base64-encoded 32-byte key used to encrypt GitHub access tokens at rest (AES-256-GCM) before they are written to `User.accessToken`. See [`src/lib/token-crypto.ts`](../src/lib/token-crypto.ts).

Generate:

```bash
openssl rand -base64 32
```

**Required.** If unset, invalid, or not exactly 32 bytes after base64 decoding, sign-in fails closed — no access token is stored (rather than falling back to plaintext) and a `token_encryption_skipped` row is written to `TokenAuditLog`.

---

## Stellar / Horizon (public)

These are prefixed with `NEXT_PUBLIC_` and available in the browser.

### `NEXT_PUBLIC_HORIZON_URL`

Horizon API base URL.

| Network | URL |
|---------|-----|
| Mainnet | `https://horizon.stellar.org` |
| Testnet | `https://horizon-testnet.stellar.org` |

Must match the network your contributors use.

> **Network consistency:** `NEXT_PUBLIC_HORIZON_URL` and `SOROBAN_RPC_URL` (below) should point at the **same** Stellar network. The project's own defaults do not — Horizon defaults to mainnet while `SOROBAN_RPC_URL` defaults to testnet — so a maintainer who only sets one of the two can end up validating contributor funding against a different network than the one Soroban events are read from. The dashboard detects this: `GET /api/settings/network` (maintainer-only) and the "Network configuration" panel on `/dashboard` compare the resolved networks and show a warning banner when they mismatch, and a `network_config_mismatch_detected` entry is written to the audit log (visible via `GET /api/audit`) so the misconfiguration has a durable record. See [`src/lib/network-config.ts`](../src/lib/network-config.ts).

### `NEXT_PUBLIC_DEFAULT_ASSET_CODE`

Asset code for trustline checks. Default: `USDC`

### `NEXT_PUBLIC_DEFAULT_ASSET_ISSUER`

Asset issuer public key. Default: Circle USDC on Stellar mainnet:

```
GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX5IHOWEBMGJI55ITFSZ6
```

Change both code and issuer together for testnet or custom assets.

### `NEXT_PUBLIC_MIN_XLM_BALANCE`

Minimum **spendable** XLM balance for **Ready** status (string parsed as float). Default: `1`

Accounts below this threshold show **Low Reserve** even with a valid trustline. Compared against the spendable balance (raw balance minus reserve and liabilities), not the raw `xlm_balance`.

### `NEXT_PUBLIC_BASE_RESERVE_XLM`

Stellar network base reserve, in XLM, used to compute each account's minimum reserve (string parsed as float). Default: `0.5`

Every Stellar account locks up `baseReserve * (2 + subentry_count + num_sponsoring − num_sponsored)` XLM that cannot be spent. This value rarely changes on mainnet; override only for custom networks or if the protocol-wide base reserve changes. See [Architecture — Readiness rules](./ARCHITECTURE.md#readiness-rules).

---

## Optional variables

### `SOROBAN_CONTRACT_ID`

Soroban contract ID the maintainer dashboard's **Soroban event timeline** panel reads events for. Registrations are not yet mirrored to this contract — see the write-through design note below.

When unset, registrations are stored in PostgreSQL only and the event timeline panel renders an empty state explaining that configuration is missing. See [Architecture — Soroban register write-through](./ARCHITECTURE.md#soroban-register-write-through) for the read-vs-write-through breakdown.

### `SOROBAN_RPC_URL`

Soroban RPC endpoint used to fetch contract events for the timeline panel. Defaults to `https://soroban-testnet.stellar.org` when unset.

| Network | URL |
|---------|-----|
| Mainnet | `https://mainnet.sorobanrpc.com` |
| Testnet | `https://soroban-testnet.stellar.org` |

**Keep this on the same network as `NEXT_PUBLIC_HORIZON_URL` above.** The default here is testnet while the default Horizon URL is mainnet — see the network consistency note above and [Architecture — network hardening](./ARCHITECTURE.md#network-hardening) for how the mismatch is surfaced.

---

## Vercel configuration

1. Project → **Settings** → **Environment Variables**
2. Add all required variables for **Production**, **Preview**, and **Development**
3. Redeploy after changes

For preview deployments, set `NEXTAUTH_URL` to the preview URL or use Vercel's automatic `VERCEL_URL` pattern in custom auth config if needed.

---

## Security checklist

- [ ] Never commit `.env.local` or secrets
- [ ] Rotate `GITHUB_CLIENT_SECRET` if exposed
- [ ] Use `sslmode=require` for remote Postgres
- [ ] Generate unique `NEXTAUTH_SECRET` per environment

---

## Related docs

- [Setup guide](./SETUP.md)
- [Deployment](./DEPLOYMENT.md)
- [Architecture](./ARCHITECTURE.md)
