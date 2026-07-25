# TrustBridge Dashboard

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![Stellar](https://img.shields.io/badge/Stellar-USDC-3E1BDB)](https://stellar.org/)

**TrustBridge Dashboard** is the open-source web interface for the [TrustBridge](https://github.com) project. It connects GitHub contributor identities to Stellar G-addresses and validates payout readiness before Wave disbursements.

> **The problem:** Stellar payments fail with `PAYMENT_NO_TRUST` when a recipient account lacks a trustline for the asset being sent (e.g. USDC). Maintainers need a single source of truth mapping `github_username → stellar_address` with live trustline and reserve checks — before batch payouts.

---

## Table of contents

- [Features](#features)
- [Quick start](#quick-start)
- [Documentation](#documentation)
- [Tech stack](#tech-stack)
- [Routes & API](#routes--api)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Audience | Capability |
|----------|------------|
| **Contributors** | Sign in with GitHub OAuth, register a Stellar G-address, get live Horizon validation (funding, USDC trustline, XLM reserve) |
| **Maintainers** | View all registrations, filter by readiness, batch re-check via Horizon, export CSV for Wave payout prep, review recent Soroban contract events |
| **Everyone** | Public landing page with Wave readiness stats |

### Readiness model

| Status | Badge | Meaning |
|--------|-------|---------|
| **Ready** | ✅ | Funded, USDC trustline active **and authorized**, spendable XLM ≥ minimum reserve |
| **Low reserve** | ⚠️ | Funded + authorized trustline, but spendable XLM below threshold |
| **Not ready** | ❌ | Unfunded, missing trustline, **or a present-but-unauthorized trustline** |

> **Authorization matters:** a trustline can exist but remain *unauthorized* by the
> asset issuer (Stellar `AUTH_REQUIRED` assets). Payments to an unauthorized
> trustline still fail, so the dashboard tracks `is_authorized` separately and an
> account is only **verified** (✅ on-chain badge) when funded **and** holding an
> authorized trustline.

> **Spendable vs. raw XLM:** every Stellar account must keep a minimum reserve
> locked up — `baseReserve * (2 + subentries + sponsoring − sponsored)` — plus
> any XLM tied up in `selling_liabilities`. That reserve is not available for
> payments, so the reserve check compares against **spendable** XLM
> (`spendableXlmBalance`), not the raw `xlm_balance`. A contributor with 5 XLM
> raw balance and 3 trustlines can show ~3.5 XLM locked in reserve, leaving
> well under 1 XLM spendable — this is `low_reserve`, not `ready`, even though
> the raw balance alone looks healthy.

---

## Quick start

### Prerequisites

- **Node.js** 18+ and **npm**
- **PostgreSQL** database (local, [Neon](https://neon.tech), [Supabase](https://supabase.com), or [Vercel Postgres](https://vercel.com/storage/postgres))
- **GitHub OAuth App** ([create one here](https://github.com/settings/developers))

### 1. Clone and install

```bash
git clone https://github.com/your-org/trustbridge-dashboard.git
cd trustbridge-dashboard
npm install
```

### 2. Start the dev database stack (optional)

For local development with PostgreSQL in Docker:

```bash
docker-compose up -d
```

See [docs/DOCKER_COMPOSE.md](./docs/DOCKER_COMPOSE.md) for details.

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in all required values — see [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) for full reference.

If using Docker Compose, set:

```bash
DATABASE_URL="postgresql://trustbridge:trustbridge-dev-password@localhost:5432/trustbridge_dashboard?schema=public"
```

### 4. Initialize the database

```bash
npm run db:push
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **GitHub OAuth callback URL (local):** `http://localhost:3000/api/auth/callback/github`

---

## Documentation

All docs are cross-linked from this README:

| Document | Description |
|----------|-------------|
| [**Setup guide**](./docs/SETUP.md) | Step-by-step local development setup |
| [**Docker Compose stack**](./docs/DOCKER_COMPOSE.md) | Containerized dev environment with PostgreSQL |
| [**Environment variables**](./docs/ENVIRONMENT.md) | Every env var explained |
| [**Architecture**](./docs/ARCHITECTURE.md) | System design, data flow, auth model |
| [**Project structure**](./docs/PROJECT_STRUCTURE.md) | Directory layout and key files |
| [**Deployment**](./docs/DEPLOYMENT.md) | Vercel deployment checklist |
| [**Contributing**](./docs/CONTRIBUTING.md) | How to contribute to this repo |
| [**CSRF protection**](./docs/CSRF.md) | Threat model, protected routes, non-browser client policy, testing guide |

---

## Tech stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS, [shadcn/ui](https://ui.shadcn.com/) patterns |
| Data fetching | [TanStack React Query](https://tanstack.com/query) |
| Auth | [NextAuth.js](https://next-auth.js.org/) + GitHub OAuth |
| Database | PostgreSQL + [Prisma ORM](https://www.prisma.io/) |
| Blockchain | [stellar-sdk](https://www.npmjs.com/package/stellar-sdk) + Horizon API |
| Deployment | [Vercel](https://vercel.com/) (recommended) |

**Brand colors:** Stellar purple `#3E1BDB`, cyan accent `#00B4D8`. Dark mode supported.

---

## Routes & API

### Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Landing page, TrustBridge explainer, Wave stats |
| `/register` | GitHub OAuth | Contributor Stellar address registration |
| `/dashboard` | GitHub OAuth + org member | Maintainer payout readiness table |

### API routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth.js handlers |
| `/api/check` | POST | Horizon validation `{ address, asset_code?, asset_issuer? }` — returns `trustline_authorized` and `verified` | 10 req/min |
| `/api/register` | GET/POST | Read/save contributor registration (authenticated) |
| `/api/contributors` | GET/POST | List contributors / batch re-check (maintainer only) |
| `/api/contributors/paginated` | GET | Paginated contributors for infinite scroll `?limit=25&cursor=...` (maintainer only) |
| `/api/contributors/[id]` | POST | Re-check a **single** contributor via Horizon (maintainer only) |
| `/api/audit` | GET | Recent maintainer actions — audit log (maintainer only) |
| `/api/stats` | GET | Aggregate readiness statistics |
| `/api/actions/lookup` | GET | Cached Horizon readiness lookup + wizard `nextAction` guidance, `?address=G...` |
| `/api/soroban/events` | GET | Recent events for `SOROBAN_CONTRACT_ID` (maintainer only) |
| `/api/settings/network` | GET | Resolved Horizon/Soroban network + mismatch warnings (maintainer only) |

### Resilience

- **Horizon circuit breaker** — `src/lib/circuit-breaker.ts` wraps Horizon API calls. After 5 consecutive failures, the breaker opens and fast-fails for 30s, returning a friendly "Horizon is temporarily unavailable" message. Configurable via `HORIZON_CB_FAILURE_THRESHOLD`, `HORIZON_CB_RECOVERY_MS`, and `HORIZON_CB_SUCCESS_THRESHOLD`.
- **Stale CSV export guard** — `src/lib/stale-export.ts` checks `lastCheckedAt` timestamps before CSV export. If any contributor hasn't been verified within the configured window (default 24h), the dashboard shows an amber warning banner and requires confirmation before exporting. Configurable via `STALE_CSV_MAX_AGE_MS`.

### Structured logging

- **Request/response logging** — `src/lib/logger.ts` provides structured JSON logging for debugging and monitoring. All API requests, Horizon calls, and database operations can be logged with context and metadata. Enable debug logging via `DEBUG=true` environment variable.
- **Observability** — Log format includes timestamp, log level (info/warn/error/debug), context identifier, message, and optional details. Perfect for ingestion into centralized logging platforms.

### Pagination & infinite scroll

- **Cursor-based pagination** — `/api/contributors/paginated` supports efficient cursor-based pagination via the `useInfiniteContributors()` React Query hook. Useful for tables with 100+ contributors.
- **React Query integration** — `src/lib/use-infinite-contributors.ts` provides a drop-in hook for infinite scroll UIs. Automatically fetches next pages as users scroll.

### Middleware

`src/middleware.ts` protects `/register` (requires sign-in) and `/dashboard` (requires sign-in + `GITHUB_MAINTAINER_ORG` membership).

### Security

- **CSRF protection** — All mutating API routes validate the `Origin` / `Referer` header against the application's host. See [docs/CSRF.md](./docs/CSRF.md).
- **Rate limiting** — `POST /api/check` is rate-limited per IP (default 10 requests per minute) to prevent Horizon API abuse. Configure via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`.
- **CSV / JSON exports** — Maintainer dashboard exports contributor data as CSV or JSON. Export helpers live in `src/lib/csv.ts` and are covered by snapshot tests.

---

## Environment variables

Copy `.env.example` to `.env.local` and configure:

```bash
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=
TOKEN_ENCRYPTION_KEY=  # required, openssl rand -base64 32 — encrypts stored access tokens
GITHUB_MAINTAINER_ORG=
GITHUB_MAINTAINER_TEAM= # optional, team slug within GITHUB_MAINTAINER_ORG — org-only check if unset
DATABASE_URL=
NEXT_PUBLIC_HORIZON_URL=https://horizon.stellar.org
NEXT_PUBLIC_DEFAULT_ASSET_CODE=USDC
NEXT_PUBLIC_DEFAULT_ASSET_ISSUER=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX5IHOWEBMGJI55ITFSZ6
NEXT_PUBLIC_MIN_XLM_BALANCE=1
NEXT_PUBLIC_BASE_RESERVE_XLM=0.5  # optional, Stellar base reserve used for spendable-balance checks
SOROBAN_CONTRACT_ID=   # optional, future on-chain registry + event timeline panel
SOROBAN_RPC_URL=       # optional, defaults to soroban-testnet.stellar.org
```

> **Note:** `NEXT_PUBLIC_HORIZON_URL` and `SOROBAN_RPC_URL` should point at the same Stellar network. Their defaults don't (mainnet vs. testnet) — the dashboard detects and warns on this mismatch via `/api/settings/network` and the maintainer dashboard's network status panel, and records it to the audit log.

See [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) for details.

Generate `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

---

## Testing

Unit tests run on [Vitest](https://vitest.dev/) and cover the pure business logic
(readiness/authorization rules, the Horizon retry helper, audit-log formatting,
batch verification, and the Soroban event-timeline read path — including the
`GET /api/soroban/events` maintainer guard, a missing `SOROBAN_CONTRACT_ID`,
and simulated RPC outages/rate limits, all without a live network call):

```bash
npm test          # run once
npm run test:watch
```

Tests also run in CI on every push and pull request, before the build.

> **Schema note:** issue #7 adds a `trustlineAuthorized` column to `Registration`,
> issue #22 adds an `AuditLog` table, and issue #8 adds a `spendableXlmBalance`
> column to `Registration`. After pulling these changes, sync your database with
> `npm run db:push`.

---

## Deployment

This project is optimized for **Vercel**:

1. Push to GitHub
2. Import repo in Vercel
3. Add environment variables from [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md)
4. Attach a Postgres database (Vercel Postgres, Neon, etc.)
5. Run `npm run db:push` against production `DATABASE_URL`
6. Set GitHub OAuth callback to `https://your-domain.vercel.app/api/auth/callback/github`

Full checklist: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)

---

## Contributing

We welcome contributions! Please read [docs/CONTRIBUTING.md](./docs/CONTRIBUTING.md) before opening a PR.

Quick flow:

1. Fork the repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit with clear messages
4. Run tests (`npm run test`)
5. Open a pull request against `main`

---

## Optional: Soroban on-chain registry

PostgreSQL is the source of truth for registrations. Setting `SOROBAN_CONTRACT_ID`
(+ optionally `SOROBAN_RPC_URL`) today enables the **read-only** maintainer event
timeline (`GET /api/soroban/events`), which fetches recent contract events and
degrades gracefully — never failing the dashboard — on RPC outages, rate limits,
or a missing contract ID.

Mirroring registrations *to* a Soroban contract (write-through) is designed but
**not yet implemented** — see
[docs/ARCHITECTURE.md § Soroban register write-through](./docs/ARCHITECTURE.md#soroban-register-write-through)
for the read-vs-write-through breakdown, the intended write design, and how each
edge case (outage, missing config, rate limits) is or would be handled.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

## Links

- [Architecture overview](./docs/ARCHITECTURE.md)
- [Project structure](./docs/PROJECT_STRUCTURE.md)
- [Setup guide](./docs/SETUP.md)
- [Stellar Horizon API](https://developers.stellar.org/docs/data/apis/horizon)
- [Stellar USDC trustlines](https://developers.stellar.org/docs/learn/fundamentals/stellar-data-structures/accounts/trustlines)
