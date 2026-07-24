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
| **Ready** | ✅ | Funded, USDC trustline active **and authorized**, XLM ≥ minimum reserve |
| **Low reserve** | ⚠️ | Funded + authorized trustline, but XLM below threshold |
| **Not ready** | ❌ | Unfunded, missing trustline, **or a present-but-unauthorized trustline** |

> **Authorization matters:** a trustline can exist but remain *unauthorized* by the
> asset issuer (Stellar `AUTH_REQUIRED` assets). Payments to an unauthorized
> trustline still fail, so the dashboard tracks `is_authorized` separately and an
> account is only **verified** (✅ on-chain badge) when funded **and** holding an
> authorized trustline.

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

### 2. Configure environment

```bash
cp .env.example .env.local
```

Fill in all required values — see [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) for full reference.

### 3. Initialize the database

```bash
npm run db:push
```

### 4. Run locally

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
| `/api/check` | POST | Horizon validation `{ address, asset_code?, asset_issuer? }` — returns `trustline_authorized` and `verified` |
| `/api/register` | GET/POST | Read/save contributor registration (authenticated) |
| `/api/contributors` | GET/POST | List contributors / batch re-check (maintainer only) |
| `/api/contributors/[id]` | POST | Re-check a **single** contributor via Horizon (maintainer only) |
| `/api/audit` | GET | Recent maintainer actions — audit log (maintainer only) |
| `/api/stats` | GET | Aggregate readiness statistics |
| `/api/actions/lookup` | GET | Cached Horizon readiness lookup + wizard `nextAction` guidance, `?address=G...` |
| `/api/soroban/events` | GET | Recent events for `SOROBAN_CONTRACT_ID` (maintainer only) |

### Middleware

`src/middleware.ts` protects `/register` (requires sign-in) and `/dashboard` (requires sign-in + `GITHUB_MAINTAINER_ORG` membership).

### Security — CSRF protection

All mutating API routes (`POST /api/check`, `POST /api/register`, `POST /api/contributors`) validate the `Origin` / `Referer` header against the application's host. Non-browser clients that do not send an `Origin` header are allowed. For full details, see [docs/CSRF.md](./docs/CSRF.md).

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
SOROBAN_CONTRACT_ID=   # optional, future on-chain registry + event timeline panel
SOROBAN_RPC_URL=       # optional, defaults to soroban-testnet.stellar.org
```

See [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) for details.

Generate `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

---

## Testing

Unit tests run on [Vitest](https://vitest.dev/) and cover the pure business logic
(readiness/authorization rules, the Horizon retry helper, audit-log formatting,
and batch verification):

```bash
npm test          # run once
npm run test:watch
```

Tests also run in CI on every push and pull request, before the build.

> **Schema note:** issue #7 adds a `trustlineAuthorized` column to `Registration`
> and issue #22 adds an `AuditLog` table. After pulling these changes, sync your
> database with `npm run db:push`.

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

The scaffold stores registrations in PostgreSQL. Set `SOROBAN_CONTRACT_ID` when an on-chain Soroban registry is deployed — integration hooks can mirror writes to the contract (see [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md#future-soroban-registry)).

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
