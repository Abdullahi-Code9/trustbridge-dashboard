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

### `NEXT_PUBLIC_DEFAULT_ASSET_CODE`

Asset code for trustline checks. Default: `USDC`

### `NEXT_PUBLIC_DEFAULT_ASSET_ISSUER`

Asset issuer public key. Default: Circle USDC on Stellar mainnet:

```
GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX5IHOWEBMGJI55ITFSZ6
```

Change both code and issuer together for testnet or custom assets.

### `NEXT_PUBLIC_MIN_XLM_BALANCE`

Minimum XLM balance for **Ready** status (string parsed as float). Default: `1`

Accounts below this threshold show **Low Reserve** even with a valid trustline.

---

## Optional variables

### `SOROBAN_CONTRACT_ID`

Soroban contract ID for future on-chain registry integration, and the contract the maintainer dashboard's **Soroban event timeline** panel reads events for.

When unset, registrations are stored in PostgreSQL only and the event timeline panel renders an empty state explaining that configuration is missing. See [Architecture — Soroban](./ARCHITECTURE.md#future-soroban-registry).

### `SOROBAN_RPC_URL`

Soroban RPC endpoint used to fetch contract events for the timeline panel. Defaults to `https://soroban-testnet.stellar.org` when unset.

| Network | URL |
|---------|-----|
| Mainnet | `https://mainnet.sorobanrpc.com` |
| Testnet | `https://soroban-testnet.stellar.org` |

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
