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
4. Ensure the project builds, tests pass, and types are valid:

   ```bash
   npm run lint       # ESLint
   npm run typecheck  # TypeScript type checking
   npm run test       # Vitest
   npm run build      # Next.js build
   npm run storybook  # Run local Storybook at http://localhost:6006
   ```

   All of these run in CI and must pass before merging.

---

## Storybook & Component Development

TrustBridge Dashboard uses Storybook to develop and visually test UI components in isolation without needing live Horizon network access or database sessions.

### Running Storybook
```bash
# Start local Storybook development server
npm run storybook

# Build static Storybook bundle
npm run build-storybook
```

### Component Guidelines for Stories
- **Pure Mock Data**: Stories must use static mock data only. Do not invoke Prisma or make requests to Stellar Horizon from within stories.
- **Key States**: Include stories for empty states, populated/ready states, loading states, and mobile viewports (`parameters: { viewport: { defaultViewport: "mobile1" } }`).
- **No Secrets**: Never hardcode production API keys, secrets, or real private keys in Storybook files.

---

## Pull request guidelines

### Before opening a PR

- [ ] Issue linked (if applicable)
- [ ] `.env.example` updated if new env vars added
- [ ] Docs updated in `docs/` and linked from README
- [ ] `npm run lint` passes (ESLint)
- [ ] `npm run typecheck` passes (TypeScript strict mode)
- [ ] `npm run test` passes (all tests)
- [ ] `npm run build` passes (Next.js build succeeds)
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
