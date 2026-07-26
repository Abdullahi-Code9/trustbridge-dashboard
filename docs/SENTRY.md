# Sentry Error Tracking

TrustBridge Dashboard integrates Sentry for runtime error monitoring across the
Next.js API layer and server components. The integration is **opt-in**: the
application functions correctly without Sentry configured — every helper
degrades to a silent no-op — so local development and CI never require a DSN.

---

## Table of contents

- [How it works](#how-it-works)
- [Setup](#setup)
- [Environment variables](#environment-variables)
- [Using the helpers](#using-the-helpers)
- [Instrumented routes](#instrumented-routes)
- [Source maps (optional)](#source-maps-optional)
- [Testing](#testing)
- [FAQ](#faq)

---

## How it works

All Sentry calls are centralised in **`src/lib/sentry.ts`**. Application code
always imports from there, never directly from `@sentry/nextjs`, so the SDK
surface area is contained to a single file.

At startup `src/lib/sentry.ts` checks for `NEXT_PUBLIC_SENTRY_DSN`:

| DSN present | `@sentry/nextjs` installed | Behaviour |
|-------------|----------------------------|-----------|
| ✅           | ✅                          | Real Sentry events sent |
| ✅           | ❌                          | Graceful no-op (install the SDK) |
| ❌           | —                           | Silent no-op (development / CI) |

---

## Setup

### 1. Install the SDK

```bash
npm install @sentry/nextjs
```

### 2. Create Sentry project config files

Run the Sentry wizard (recommended) or create the files manually:

```bash
npx @sentry/wizard@latest -i nextjs
```

The wizard creates:
- `sentry.client.config.ts` — browser-side initialisation
- `sentry.server.config.ts` — Node.js server initialisation
- `sentry.edge.config.ts` — Edge runtime initialisation

Minimal `sentry.server.config.ts`:

```ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NEXT_PUBLIC_APP_ENV ?? "development",
  tracesSampleRate: 0.1,
  // Mask PII before events leave the server
  beforeSend(event) {
    // Strip access tokens / stellar addresses from breadcrumbs if needed
    return event;
  },
});
```

### 3. Configure `next.config.mjs`

```js
import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(nextConfig, {
  org: "your-sentry-org",
  project: "trustbridge-dashboard",
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
});
```

### 4. Set environment variables

```bash
# .env.local
NEXT_PUBLIC_SENTRY_DSN=https://<key>@<org>.ingest.sentry.io/<project-id>
SENTRY_AUTH_TOKEN=<token-for-source-map-uploads>   # CI only
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Sentry DSN. No-op when absent. |
| `SENTRY_AUTH_TOKEN` | CI/CD only | Token for uploading source maps during build. |
| `NEXT_PUBLIC_APP_ENV` | Optional | Sets the Sentry `environment` tag (`production`, `staging`, etc.). Defaults to `"development"`. |

---

## Using the helpers

Import from `@/lib/sentry` in server-side code:

```ts
import {
  captureException,
  captureMessage,
  captureExceptionWithScope,
  setSentryUser,
  flushSentry,
  isSentryEnabled,
} from "@/lib/sentry";
```

### `captureException(error, context?)`

Report an unhandled exception. Preferred for `catch` blocks:

```ts
try {
  await riskyOperation();
} catch (err) {
  captureException(err, { route: "/api/contributors", userId: session.user.id });
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}
```

### `captureMessage(message, level?)`

Send an informational message (not an exception):

```ts
captureMessage("CSV export requested with stale data", "warning");
```

Level defaults to `"info"`. Valid values: `"debug" | "info" | "warning" | "error" | "fatal"`.

### `captureExceptionWithScope(error, user, tags, level?)`

Capture with rich metadata without polluting other concurrent events:

```ts
captureExceptionWithScope(
  err,
  { id: session.user.id, username: session.user.githubUsername },
  { route: "/api/register", network: "mainnet" },
  "error"
);
```

### `setSentryUser(user | null)`

Attach user identity to all subsequent events in the current scope. Call on
sign-in; pass `null` on sign-out:

```ts
// In NextAuth callbacks:
setSentryUser({ id: userId, username: githubUsername });
```

### `flushSentry(timeoutMs?)`

Ensure pending events are sent before a serverless function terminates. Default
timeout is 2 seconds:

```ts
// At the end of a background task:
await flushSentry(2000);
```

### `isSentryEnabled()`

Conditional logging helper — avoids noise in development:

```ts
if (isSentryEnabled()) {
  console.info("Sentry event sent:", eventId);
}
```

---

## Instrumented routes

The following routes are recommended instrumentation points:

| Route | Instrumented at | Why |
|-------|----------------|-----|
| `POST /api/check` | Outer `catch` block | Horizon errors and unexpected exceptions |
| `POST /api/register` | Outer `catch` block | DB write failures, Horizon errors |
| `GET /api/contributors` | DB query failures | Prisma connection errors |
| `POST /api/contributors` | Batch recheck failures | Partial Horizon batch failures |
| `POST /api/contributors/[id]` | Recheck errors | Single-contributor recheck failures |
| `GET /api/health` | Health check degradations | Stale-data warnings |
| `GET /api/audit` | Auth failures | Unexpected 403s |

To add instrumentation, wrap the handler body:

```ts
import { captureException } from "@/lib/sentry";

export async function POST(request: NextRequest) {
  try {
    // ... handler logic
  } catch (err) {
    captureException(err, { route: "POST /api/register" });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
```

---

## Source maps (optional)

Source maps let Sentry show original TypeScript line numbers rather than
minified bundle locations. They are uploaded during the build by
`@sentry/nextjs` when `SENTRY_AUTH_TOKEN` is set:

```bash
# In CI (e.g. GitHub Actions / Vercel):
SENTRY_AUTH_TOKEN=<token> npm run build
```

Source maps are **never sent to the browser** when `hideSourceMaps: true` is
set in `next.config.mjs` (the default in the wizard-generated config).

---

## Testing

Unit tests for `src/lib/sentry.ts` live in `tests/unit/sentry.test.ts` and
cover:

- No-op behaviour when `NEXT_PUBLIC_SENTRY_DSN` is absent
- Graceful fallback when DSN is set but `@sentry/nextjs` is not installed
- All public helper functions (`captureException`, `captureMessage`,
  `captureExceptionWithScope`, `setSentryUser`, `flushSentry`,
  `isSentryEnabled`)
- Edge cases (blank DSN, non-Error thrown values, null user, empty tags)

Run the unit suite:

```bash
npm test
# or targeted:
npx vitest run tests/unit/sentry.test.ts
```

To test that real events reach Sentry in staging, set `NEXT_PUBLIC_SENTRY_DSN`
to your **test** project DSN and trigger an error:

```bash
NEXT_PUBLIC_SENTRY_DSN=https://... npm run dev
# Then hit POST /api/check with an invalid body to trigger a 500
```

---

## FAQ

**Q: Do I need `@sentry/nextjs` installed for tests to pass?**
No. The SDK is an optional peer dependency. Tests run against the no-op stub
when the DSN is absent, which is the default in CI.

**Q: Will Sentry capture PII (Stellar addresses, GitHub usernames)?**
Only if you pass them explicitly in `context` / `tags`. The default SDK
configuration scrubs common PII patterns; review Sentry's
[data scrubbing](https://docs.sentry.io/product/data-management-settings/scrubbing/)
settings for your project.

**Q: Can I use Sentry on the Edge runtime?**
Yes. `@sentry/nextjs` supports the Edge runtime via `sentry.edge.config.ts`.
The helpers in `src/lib/sentry.ts` work in both Node.js and Edge contexts.

**Q: How do I test Sentry in production without spamming events?**
Use Sentry [environments](https://docs.sentry.io/product/sentry-basics/environments/)
(`NEXT_PUBLIC_APP_ENV=staging`) and
[sampling](https://docs.sentry.io/platforms/javascript/configuration/sampling/)
to control event volume.
