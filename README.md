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
- [Testing](#testing)
  - [Wave #75 — Dark mode contrast audit](#wave-75--dark-mode-contrast-audit)
  - [Wave #72 — Register API concurrency tests](#wave-72--register-api-concurrency-tests)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

| Audience | Capability |
|----------|------------|
| **Contributors** | Sign in with GitHub OAuth, register a Stellar G-address, get live Horizon validation (funding, USDC trustline, XLM reserve), view outreach template examples |
| **Maintainers** | View all registrations, filter by readiness, batch re-check via Horizon, review per-row Horizon diagnostics, use an accessible desktop table or mobile card layout, export enriched CSV/JSON data, generate outreach templates for contributors, review recent Soroban contract events |
| **Everyone** | Public landing page with Wave readiness stats |

### Wallet proof and dashboard diagnostics

- **Freighter ownership proof** — the `/register` flow now generates a deterministic message-signing challenge tied to the contributor's GitHub handle and Stellar payout address. Contributors can copy that challenge and sign it in Freighter when maintainers need wallet ownership proof.
- **Per-row Horizon debug panel** — each dashboard row exposes the current readiness summary, the next recommended action, and the underlying funded/trustline/reserve checkpoints used for payout decisions.
- **Accessible responsive table** — the maintainer table includes captioned headers, sortable column labels with `aria-sort`, and a mobile card layout so contributor readiness stays reviewable on smaller screens.
- **Export parity** — CSV and JSON exports now include the Horizon debug summary, recommended next action, and Freighter proof challenge so maintainer reviews stay consistent outside the UI.

### Outreach templates

The dashboard includes a template generator (on the register page) that creates contributor outreach materials in three formats:

- **Email** — subject line, body, next steps, wallet proof guidelines
- **Markdown** — checklist, troubleshooting table, with emoji and formatting
- **Plain text** — simple, universal format for copy-paste or SMS

Templates are customizable by Wave number, contributor name, minimum XLM requirement, deadline, and support email. Download or copy directly to clipboard.

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
| [**Sentry error tracking**](./docs/SENTRY.md) | Setup, environment variables, instrumented routes, testing guide |

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

**Brand colors:** Stellar purple `#3E1BDB`, cyan accent `#00B4D8`. Dark mode supported — all UI colour pairs meet WCAG 2.1 AA contrast requirements (≥ 4.5:1 for normal text, ≥ 3.0:1 for large text / UI components).

---

## Routes & API

### Pages

| Route | Auth | Description |
|-------|------|-------------|
| `/` | Public | Landing page, TrustBridge explainer, Wave stats |
| `/register` | GitHub OAuth | Contributor Stellar address registration |
| `/dashboard` | GitHub OAuth + org member | Maintainer payout readiness table |
| `/dashboard/metrics` | GitHub OAuth + org member | Admin metrics: readiness counts, audit activity, ops config |

### API routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth.js handlers |
| `/api/check` | POST | Horizon validation `{ address, asset_code?, asset_issuer? }` | 10 req/min |
| `/api/register` | GET/POST | Read/save contributor registration (authenticated) | — |
| `/api/contributors` | GET/POST | List contributors / batch re-check (maintainer only). Response includes `registryMode` (`REGISTRY_MODE` env var) | — |
| `/api/contributors/paginated` | GET | Cursor-paginated contributor list for infinite scroll (maintainer only). Also includes `registryMode` | — |
| `/api/contributors/[id]` | POST | Re-check a **single** contributor via Horizon (maintainer only) |
| `/api/audit` | GET | Recent maintainer actions — audit log (maintainer only) |
| `/api/stats` | GET | Aggregate readiness statistics — **publicly cached** (`Cache-Control: public, max-age=<ttl>, stale-while-revalidate`) | — |
| `/api/actions/lookup` | GET | Cached Horizon readiness lookup + wizard `nextAction` guidance, `?address=G...` — **publicly cached** (30 s TTL) |
| `/api/soroban/events` | GET | Recent events for `SOROBAN_CONTRACT_ID` (maintainer only) |
| `/api/settings/network` | GET | Resolved Horizon/Soroban network + mismatch warnings (maintainer only) |
| `/api/health` | GET | Liveness + readiness probe — DB ping, CSV staleness, and contract-sync status (public, always 200) |
| `/api/contract-sync` | GET/POST | GET: last sync result (public). POST: trigger a contract-to-Postgres sync (maintainer session or `CRON_SECRET`) |

### Contract-to-Postgres sync job

- **`src/lib/contract-sync.ts`** re-syncs Postgres registration state against Horizon-verified funded/trustline/balance state, intended to be driven by a scheduler (e.g. Vercel Cron) rather than a maintainer clicking "recheck all". Trigger with `POST /api/contract-sync` (maintainer session, or a scheduler presenting `Authorization: Bearer $CRON_SECRET`); read the last run via `GET /api/contract-sync` or the `contractSync` block of `/api/health`.
- Rate-limited via `CONTRACT_SYNC_MIN_INTERVAL_MS` (default 60s) so a mis-configured scheduler can't fan out into repeated full-table Horizon sweeps, and never throws — Horizon/RPC outages and DB errors are captured in the result instead of raising a 500.

### Resilience

- **Stats API cache headers** — `GET /api/stats` and `GET /api/actions/lookup` emit `Cache-Control: public, max-age=<ttl>, stale-while-revalidate=<swr>` so CDN edges (Vercel Edge Network, Cloudflare, etc.) and browsers serve cached responses without hitting the origin. Two layers cooperate: an **in-process `statsCache`** (default 60 s TTL, controlled by `STATS_CACHE_TTL_MS`) eliminates redundant DB queries within a server instance, and the **HTTP headers** let the CDN cache aggregate stats globally. The cache is automatically evicted whenever contributor readiness changes (batch recheck, single recheck). The lookup endpoint uses a shorter fixed 30 s TTL to keep wizard validation fresh. Neither endpoint exposes contributor PII — only aggregate counts and per-address Horizon results are returned.
- **Background recheck queue** — `src/lib/background-queue.ts` implements an in-memory job queue for Horizon rechecks. All recheck requests (batch and single) are queued and processed with a default concurrency limit of 2. This prevents Horizon rate-limit exhaustion and allows maintainers to request rechecks without blocking. Check queue status and job results via `/api/contributors/queue/status` and `/api/contributors/queue/jobs/[jobId]`. Configurable concurrency via code (currently hardcoded at 2 jobs max). Job history is retained in memory (last 100 completed jobs).
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

### GitHub Organization Membership Webhook

The dashboard listens for GitHub organization membership changes via webhook at `/api/webhooks/github-org-membership`. When a member is added to or removed from your maintainer organization, the webhook records an audit entry, allowing the system to track membership changes.

**Setup:**

1. Generate a webhook secret:
   ```bash
   openssl rand -base64 32
   ```

2. Set `GITHUB_WEBHOOK_SECRET` in your `.env.local`:
   ```bash
   GITHUB_WEBHOOK_SECRET=<generated-secret>
   ```

3. Configure the webhook in your GitHub organization:
   - Go to Organization Settings → Webhooks → Add webhook
   - Payload URL: `https://your-domain.com/api/webhooks/github-org-membership`
   - Content type: `application/json`
   - Secret: The same secret from step 1
   - Events: Select "Organization" and check "Member"

The webhook endpoint returns HTTP 202 (Accepted) for all webhook deliveries to prevent GitHub retry storms. Processing is logged and failures are captured in the audit log.

### Security

- **CSRF protection** — All mutating API routes validate the `Origin` / `Referer` header against the application's host. See [docs/CSRF.md](./docs/CSRF.md).
- **Rate limiting** — `POST /api/check` is rate-limited per IP (default 10 requests per minute) to prevent Horizon API abuse. Configure via `RATE_LIMIT_WINDOW_MS` and `RATE_LIMIT_MAX_REQUESTS`.
- **CSV / JSON exports** — Maintainer dashboard exports contributor data as CSV or JSON. Export helpers live in `src/lib/csv.ts` and are covered by snapshot tests.
- **Freighter proof workflow** — `GET/POST /api/register` returns `walletProof` and `horizonDebug` metadata alongside the registration so the register page, dashboard table, and exports can render the same ownership-proof and troubleshooting guidance.

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
NEXT_PUBLIC_DEFAULT_ASSET_ISSUER=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
NEXT_PUBLIC_MIN_XLM_BALANCE=1
NEXT_PUBLIC_BASE_RESERVE_XLM=0.5  # optional, Stellar base reserve used for spendable-balance checks
SOROBAN_CONTRACT_ID=   # optional, future on-chain registry + event timeline panel
SOROBAN_RPC_URL=       # optional, defaults to soroban-testnet.stellar.org
STATS_CACHE_TTL_MS=    # optional, in-process + HTTP cache TTL for /api/stats (default 60000 ms = 60 s)
CHECK_CACHE_TTL_MS=    # optional, in-process cache TTL for /api/check responses (default 120000 ms = 2 min)
```

> **Note:** `NEXT_PUBLIC_HORIZON_URL` and `SOROBAN_RPC_URL` should point at the same Stellar network. Their defaults don't (mainnet vs. testnet) — the dashboard detects and warns on this mismatch via `/api/settings/network` and the maintainer dashboard's network status panel, and records it to the audit log.

> **Caching:** `STATS_CACHE_TTL_MS` controls both the in-process `statsCache` TTL and the `max-age` value in the `Cache-Control` header emitted by `GET /api/stats`. Setting it to `0` or a non-numeric value falls back to the 60 s default. To disable CDN caching entirely during local development, set `STATS_CACHE_TTL_MS=1` (1 ms expires immediately in the in-process cache and produces `max-age=0` in the header).

See [docs/ENVIRONMENT.md](./docs/ENVIRONMENT.md) for details.

### Environment Validation on Boot

The dashboard validates all environment variables using Zod at startup (`src/lib/env-validation.ts`). This schema:

- **Ensures required fields are present** — missing `GITHUB_CLIENT_ID`, `DATABASE_URL`, etc. will fail fast
- **Casts numeric values** — `RATE_LIMIT_MAX_REQUESTS` → number, `NEXT_PUBLIC_MIN_XLM_BALANCE` → float
- **Validates URLs** — `DATABASE_URL`, `NEXTAUTH_URL`, `SOROBAN_RPC_URL` must be valid URLs
- **Provides defaults** — optional fields like `NEXT_PUBLIC_HORIZON_URL` default to Stellar mainnet
- **Fails on startup** — invalid configuration is caught before any route handlers run

Use `validateEnv()` or `getValidatedEnv()` to get the fully typed, validated configuration:

```typescript
import { getValidatedEnv } from "@/lib/env-validation";

const env = getValidatedEnv();
// env is strongly typed and guaranteed valid
```

Generate `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

Generate `TOKEN_ENCRYPTION_KEY`:

```bash
openssl rand -base64 32
```

Generate `GITHUB_WEBHOOK_SECRET` (if using org membership sync):

```bash
openssl rand -base64 32
```

---

## Testing

Unit tests run on [Vitest](https://vitest.dev/) and cover the pure business logic
(readiness/authorization rules, the Horizon retry helper, audit-log formatting,
batch verification, contributor search/filter/sort/column helpers, the
`GET /api/metrics` admin endpoint, and the Soroban event-timeline read path):

```bash
npm test              # run all Vitest unit + API tests once
npm run test:watch    # watch mode
npm run test:unit     # unit tests only
npm run test:api      # API route tests only
```

End-to-end tests run on [Playwright](https://playwright.dev/) and cover the
maintainer dashboard flow end-to-end (access control, table search & column
toggles, re-check, and the admin metrics page):

```bash
npm run test:e2e      # headless Playwright run (requires running app)
npm run test:e2e:ui   # interactive Playwright UI
```

All tests run in CI on every push and pull request, before the build.

### Wave #75 — Dark mode contrast audit

Audits and enforces WCAG 2.1 AA contrast ratios across all dark-mode colour
pairs in the dashboard. Run automatically as part of `npm test`.

**What was audited and fixed:**

| File | Issue | Fix |
|------|-------|-----|
| `src/app/globals.css` | `--destructive` at L=30.6% gave ~2.3:1 on dark bg (hard WCAG AA fail) | Raised to L=65% → ~5.9:1 |
| `src/app/globals.css` | `--destructive-foreground` was near-white (unreadable on new lighter red) | Changed to dark (`0 0% 10%`) |
| `src/app/globals.css` | `--muted-foreground` at L=65.1% was marginal on card bg | Raised to L=70% |
| `src/app/globals.css` | `--primary` / `--ring` at L=58% | Raised to L=65% |
| `src/app/globals.css` | `--accent` at L=42% | Raised to L=48% |
| `src/app/globals.css` | `--border` / `--input` at L=17.5% (invisible dividers in dark) | Raised to L=22% |
| `src/components/ui/badge.tsx` | `dark:text-*-400` (L≈60%) on dark card bg — below 4.5:1 | Raised to `dark:text-*-300` (L≈73%) |
| `src/components/ui/badge.tsx` | Light mode `text-*-600` on white — marginal | Raised to `text-*-700` |
| `src/app/dashboard/metrics/page.tsx` | Status-box sub-labels `dark:text-*-400` — below AA | Raised to `dark:text-*-200` |
| `src/app/dashboard/metrics/page.tsx` | Status-box borders `dark:border-*-900` — near-invisible | Raised to `dark:border-*-800` |
| `src/app/register/RegisterClient.tsx` | Amber banner `dark:text-amber-300 dark:bg-amber-500/10` | Fixed to `dark:text-amber-200 dark:bg-amber-950/40` |
| `src/components/ContributorTable.tsx` | Stale-data warning `dark:border-amber-900` — near-invisible | Raised to `dark:border-amber-700/60` |

**Automated tests** live in `src/lib/dark-mode-contrast-audit.test.ts`. The file
encodes the WCAG 2.1 relative-luminance algorithm in pure TypeScript (no DOM
required) and runs 25 assertions across five `describe` blocks:

- CSS design tokens (foreground, muted-foreground, destructive, primary, accent)
- Badge dark/light text on card backgrounds
- Metrics-page status-box blended backgrounds (alpha-composited)
- RegisterClient maintainer error banner
- ContributorTable stale-data warning
- Regression guard: four pre-fix colours that must *fail* WCAG AA — if these
  ever pass it means the test palette data needs updating

### Wave #72 — Register API concurrency tests

Validates that `POST /api/register` is correct under concurrent load. Run with
`npm run test:api` or `npm test`.

**Test file:** `tests/api/register-concurrency.test.ts` — 22 assertions across 7
`describe` blocks.

| Scenario | Coverage |
|----------|----------|
| **Idempotency** | 5 simultaneous requests from the same user all return 200; Horizon called exactly N times |
| **Address conflict race** | Two users racing to claim one address: exactly one 200 + one 409 |
| **Re-assignment (no spurious 409)** | User updating their own registered address never gets a 409 |
| **100+ contributor scale** | 120 distinct users register concurrently — all 200, no dropped requests, upsert called exactly 120× |
| **Horizon outage** | `checkStellarAddress` rejects for all callers → all 500, DB never written |
| **Partial Horizon outage** | Alternating pass/fail — correct mix of 200/500 responses |
| **Mixed address pool** | 50 user pairs each racing for the same address — exactly 50 wins (200) + 50 losses (409) |
| **Auth edge cases** | Unauthenticated → 401, cross-origin → 403, invalid format → 400, empty address → 400 with `validationErrors` |

All mocks target `prisma`, `@/lib/horizon`, `next-auth`, and `@/lib/soroban-register`
so no real database or network is needed. The conflict-detection mock simulates the
`findUnique → upsert` race window that exists in the route handler.

> **Schema hardening:** The `Registration` table enforces unique `stellarAddress` per user (one-to-one via `userId`), with comprehensive indexes on `trustlineReady`, `trustlineAuthorized`, `funded`, and `lastCheckedAt` for efficient filtering. All models include detailed field documentation in `prisma/schema.prisma`. The schema supports optimistic registration updates with proper cascading deletes and constraints to ensure data integrity during high-concurrency Wave operations.

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
TODO — Maintainer Roles UI: Viewer vs Operator vs Admin With Audit

Complexity: High — 200 points

Objective: Build an admin-only UI and API for managing existing dashboard RBAC roles, with complete auditing and protection against privilege escalation and removal of the final administrator.

1. Review Existing RBAC

[ ] Locate the RBAC implementation from the dependent RBAC issue.

[ ] Read existing role definitions.

[ ] Reuse the existing role model.

[ ] Do not introduce a third role system.

[ ] Identify viewer.

[ ] Identify operator.

[ ] Identify admin.

[ ] Identify existing permission checks.

[ ] Identify existing GitHub team-to-role mapping.

[ ] Identify how GitHub membership is currently enforced.

[ ] Identify current authenticated-user helpers.

[ ] Identify existing admin authorization middleware/helpers.

[ ] Identify existing Prisma user/member models.

[ ] Identify existing audit implementation.

[ ] Identify existing CSRF protections.

[ ] Review existing settings page structure.

[ ] Review existing API conventions.

[ ] Review existing test patterns.


2. Define Role Management Rules

[ ] Document the meaning of each role.

[ ] Confirm viewer permissions.

[ ] Confirm operator permissions.

[ ] Confirm admin permissions.

[ ] Confirm only admins can assign roles.

[ ] Confirm operators cannot modify roles.

[ ] Confirm viewers cannot modify roles.

[ ] Confirm users must remain GitHub organization members.

[ ] Decide behavior when a GitHub member is removed.

[ ] Ensure role assignment does not bypass GitHub membership.

[ ] Ensure role changes use the existing RBAC model.

[ ] Define whether admins can modify their own role.

[ ] Prevent an admin from accidentally removing the final admin.

[ ] Prevent the final admin from being demoted.

[ ] Prevent the final admin from being deleted through this UI.


3. Settings UI

[ ] Open src/app/dashboard/settings/page.tsx.

[ ] Add a roles/maintainers section.

[ ] Display dashboard users who are eligible for role management.

[ ] Display username/display name using existing safe fields.

[ ] Display current role.

[ ] Display GitHub membership status where appropriate.

[ ] Display role options using existing RBAC values.

[ ] Add role selector.

[ ] Add explicit save/update action.

[ ] Show loading state.

[ ] Show success state.

[ ] Show API errors.

[ ] Disable controls while saving.

[ ] Prevent unauthorized users from seeing mutation controls.

[ ] Keep UI usable on mobile.

[ ] Clearly identify admin accounts.

[ ] Clearly warn before sensitive role changes.

[ ] Require confirmation for admin promotion/demotion if appropriate.

[ ] Show last-admin protection errors clearly.

[ ] Do not expose secrets or sensitive authentication data.

[ ] Do not expose unnecessary personal information.


4. Role Assignment API

[ ] Add/extend an API endpoint under src/app/api/.

[ ] Require an authenticated user.

[ ] Require the caller to have admin permissions.

[ ] Validate the target user.

[ ] Validate the requested role.

[ ] Reject unknown roles.

[ ] Reject malformed user identifiers.

[ ] Verify the target user belongs to the supported GitHub organization.

[ ] Verify the target user is still an eligible GitHub member.

[ ] Do not trust role information supplied by the browser.

[ ] Do not trust client-side admin checks.

[ ] Perform authorization server-side.

[ ] Perform last-admin validation server-side.

[ ] Make the update atomic where necessary.

[ ] Return a safe success response.

[ ] Return 401 for unauthenticated requests.

[ ] Return 403 for unauthorized requests.

[ ] Return 400 for malformed requests.

[ ] Return 404 for unknown targets where appropriate.

[ ] Return a clear conflict/error for last-admin protection.

[ ] Avoid leaking internal database information.


5. Privilege Escalation Protection

[ ] Never allow a viewer to assign themselves admin.

[ ] Never allow an operator to assign themselves admin.

[ ] Never trust a submitted role=admin value.

[ ] Verify caller permissions using server-side RBAC.

[ ] Verify target identity server-side.

[ ] Prevent authorization based solely on GitHub team names from the request.

[ ] Prevent changing another user's role through manipulated IDs.

[ ] Validate organization membership independently.

[ ] Ensure role changes cannot grant permissions outside the existing RBAC model.

[ ] Review all mutation paths for equivalent bypasses.

[ ] Ensure API and UI enforce the same policy.


6. Last Admin Protection

[ ] Determine how administrators are counted.

[ ] Count active admins transactionally.

[ ] Reject demotion of the final admin.

[ ] Reject removal/deactivation of the final admin.

[ ] Reject changing the final admin to viewer.

[ ] Reject changing the final admin to operator.

[ ] Ensure simultaneous requests cannot bypass the protection.

[ ] Use database transaction/locking strategy where supported.

[ ] Test concurrent admin changes.

[ ] Ensure failed last-admin changes do not partially update data.

[ ] Return a clear API error.

[ ] Display the error in the settings UI.


7. GitHub Membership Enforcement

[ ] Preserve the existing GitHub membership requirement.

[ ] Do not allow role assignment to non-members unless explicitly documented.

[ ] Reuse existing GitHub organization membership checks.

[ ] Avoid duplicating membership logic.

[ ] Handle stale membership data safely.

[ ] Decide behavior when GitHub membership lookup fails.

[ ] Fail closed for authorization-sensitive operations.

[ ] Ensure GitHub team mapping remains compatible.

[ ] Document the relationship between GitHub membership and dashboard roles.

[ ] Test non-member role assignment.


8. Audit Integration

[ ] Open src/lib/audit.ts.

[ ] Reuse the existing audit infrastructure.

[ ] Do not create a separate audit model.

[ ] Record every successful role change.

[ ] Record attempted unauthorized role changes where existing audit policy allows.

[ ] Record the acting administrator.

[ ] Record the target user.

[ ] Record previous role.

[ ] Record new role.

[ ] Record timestamp.

[ ] Record relevant request/context identifier if supported.

[ ] Avoid recording passwords.

[ ] Avoid recording JWTs.

[ ] Avoid recording webhook secrets.

[ ] Avoid unnecessary PII.

[ ] Ensure audit entries cannot be modified through the role UI.

[ ] Ensure failed role changes do not create misleading success events.

[ ] Ensure audit writes happen with the role mutation.

[ ] Ensure audit failure behavior is explicitly defined.


9. CSRF Protection

[ ] Review existing CSRF strategy.

[ ] Apply the existing CSRF mechanism to role mutations.

[ ] Ensure browser requests cannot forge role changes.

[ ] Validate origin/request protection where applicable.

[ ] Do not rely on UI visibility as CSRF protection.

[ ] Test forged mutation requests.

[ ] Test missing CSRF protection.

[ ] Ensure API clients follow the existing authentication contract.

[ ] Avoid introducing a custom CSRF implementation unnecessarily.


10. Prisma / Database

[ ] Determine whether the existing RBAC schema supports this feature.

[ ] Avoid creating a duplicate role model.

[ ] Add schema changes only if required.

[ ] Add migration if necessary.

[ ] Ensure existing roles remain valid.

[ ] Add appropriate constraints/indexes if needed.

[ ] Use transactions for role + audit operations where appropriate.

[ ] Ensure concurrent requests cannot bypass last-admin protection.

[ ] Verify migration against existing development data.

[ ] Verify rollback/recovery expectations.


11. API Tests

[ ] Test authenticated admin can list/manage roles.

[ ] Test viewer cannot modify roles.

[ ] Test operator cannot modify roles.

[ ] Test unauthenticated request.

[ ] Test invalid role.

[ ] Test invalid target user.

[ ] Test unknown target user.

[ ] Test non-member target.

[ ] Test valid viewer assignment.

[ ] Test valid operator assignment.

[ ] Test valid admin assignment.

[ ] Test self-promotion attempt.

[ ] Test unauthorized privilege escalation.

[ ] Test CSRF failure.

[ ] Test last-admin demotion.

[ ] Test last-admin removal.

[ ] Test concurrent last-admin changes.

[ ] Test audit record creation.

[ ] Test failed changes do not produce successful audit entries.


12. UI Tests

[ ] Test roles section renders.

[ ] Test current roles are displayed.

[ ] Test admin sees role controls.

[ ] Test viewer does not get mutation controls.

[ ] Test operator does not get mutation controls.

[ ] Test role selector options.

[ ] Test successful update.

[ ] Test API failure.

[ ] Test last-admin error.

[ ] Test non-member error.

[ ] Test loading state.

[ ] Test confirmation flow if implemented.

[ ] Test UI does not claim success when API fails.

[ ] Test updated role appears after successful mutation.


13. Security Tests

[ ] Test manipulated target user ID.

[ ] Test manipulated role value.

[ ] Test caller impersonation attempt.

[ ] Test stale admin session.

[ ] Test non-member caller.

[ ] Test non-member target.

[ ] Test forged CSRF request.

[ ] Test cross-user role modification.

[ ] Test privilege escalation.

[ ] Test final-admin protection.

[ ] Test concurrent role mutations.

[ ] Verify audit data cannot leak credentials.

[ ] Verify API errors do not reveal sensitive internals.


14. Documentation

[ ] Document viewer, operator, and admin.

[ ] Document who can assign roles.

[ ] Document GitHub organization membership requirement.

[ ] Document GitHub team mapping interaction.

[ ] Document last-admin protection.

[ ] Document audit behavior.

[ ] Document CSRF/security requirements.

[ ] Document any new environment variables.

[ ] Document API endpoints.

[ ] Document compatibility with existing RBAC.

[ ] Document expected behavior when GitHub membership changes.


15. Final Validation

[ ] Run npm test.

[ ] Verify RBAC tests pass.

[ ] Verify API tests pass.

[ ] Verify UI tests pass.

[ ] Verify audit tests pass.

[ ] Verify no existing authentication behavior regressed.

[ ] Verify GitHub membership is still required.

[ ] Verify last admin cannot be removed.

[ ] Verify every successful role change is audited.

[ ] Verify unauthorized users cannot mutate roles.

[ ] Verify CSRF protection works.

[ ] Verify no third RBAC model was introduced.

[ ] Review the complete security-sensitive diff.


PR Checklist

[ ] Admin role-management UI included.

[ ] Role-management API included.

[ ] Existing RBAC model reused.

[ ] GitHub membership requirement preserved.

[ ] Privilege escalation prevented.

[ ] CSRF protection included.

[ ] Last-admin protection included.

[ ] Every successful change audited.

[ ] Tests included.

[ ] Security regression tests included.

[ ] Documentation updated.

[ ] npm test passes.

[ ] No HR functionality added.

[ ] No duplicate RBAC model introduced.
