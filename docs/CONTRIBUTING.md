# Contributing to TrustBridge Dashboard

Thank you for your interest in contributing! This project is open source and community-driven.

← Back to [README](../README.md) · See also [Architecture](./ARCHITECTURE.md) · [Setup guide](./SETUP.md)

---

## Code of conduct

Be respectful, inclusive, and constructive. Harassment or discrimination is not tolerated.

---

## Ways to contribute

- 🐛 **Bug reports** — Open an issue with reproduction steps
- ✨ **Features** — Discuss in an issue before large changes
- 📖 **Documentation** — Fix typos, improve guides (see `docs/`)
- 🎨 **UI/UX** — Stellar brand alignment, accessibility improvements
- 🧪 **Tests** — Add coverage for Horizon validation, auth edge cases

---

## Development setup

1. Follow [SETUP.md](./SETUP.md) to run the project locally
2. Create a branch from `main`:

   ```bash
   git checkout -b feat/short-description
   ```

3. Make focused changes — one concern per PR
4. Ensure the project builds and tests pass:

   ```bash
   npm run lint
   npm run test
   npm run build
   ```

### End-to-end tests

Playwright tests use intercepted NextAuth sessions and mocked API responses, so
they never call GitHub OAuth or production services. Install Chromium once with
`npx playwright install chromium`, then run `npm run test:e2e`. GitHub Actions
runs the same suite with `npx playwright install --with-deps chromium`.

---

## Pull request guidelines

### Before opening a PR

- [ ] Issue linked (if applicable)
- [ ] `.env.example` updated if new env vars added
- [ ] Docs updated in `docs/` and linked from README
- [ ] `npm run lint`, `npm run test`, and `npm run build` pass
- [ ] No secrets committed

### PR title format

Use conventional prefixes:

| Prefix | Use case |
|--------|----------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `docs:` | Documentation only |
| `refactor:` | Code change without behavior change |
| `chore:` | Tooling, deps, CI |

Example: `feat: add testnet Horizon toggle`

### PR description

Include:

1. **What** changed
2. **Why** it was needed
3. **How to test** locally

---

## Project conventions

### TypeScript

- Strict mode enabled — avoid `any`
- Shared types in `src/types/`
- Server-only logic in `src/lib/`, not in client components

### Components

- UI primitives: `src/components/ui/`
- Feature components: `src/components/`
- Use `"use client"` only when needed (hooks, browser APIs)

### Styling

- Tailwind utility classes
- Stellar brand: `stellar-purple` (#3E1BDB), `stellar-cyan` (#00B4D8)
- Support dark mode via `next-themes`

### API routes

- Use `export const runtime = "nodejs"` for stellar-sdk routes
- Use `export const dynamic = "force-dynamic"` for DB-backed routes
- Return structured JSON errors with appropriate HTTP status codes

### Database

- Schema changes require Prisma migration or documented `db:push` step
- Update [ARCHITECTURE.md](./ARCHITECTURE.md) if data model changes

---

## Reporting bugs

Include:

1. Steps to reproduce
2. Expected vs actual behavior
3. Browser/OS version
4. Relevant env config (redact secrets)
5. Console or server logs

---

## Feature requests

Open an issue describing:

- Problem statement (e.g. "Maintainers can't filter by org team")
- Proposed solution
- Alternatives considered

---

## Questions?

Open a [GitHub Discussion](https://github.com/your-org/trustbridge-dashboard/discussions) or issue with the `question` label.

---

## Related docs

- [Architecture](./ARCHITECTURE.md)
- [Project structure](./PROJECT_STRUCTURE.md)
- [Environment variables](./ENVIRONMENT.md)
