/**
 * Sentry error tracking integration for TrustBridge Dashboard.
 *
 * This module provides a thin wrapper around Sentry so that:
 *  1. The real `@sentry/nextjs` package can be wired in at deploy time by
 *     setting `NEXT_PUBLIC_SENTRY_DSN` (and optionally `SENTRY_AUTH_TOKEN`
 *     for source-map uploads).
 *  2. Without a DSN the module degrades gracefully — every helper is a no-op —
 *     so local development and CI tests work without installing the SDK.
 *  3. Application code always imports from `@/lib/sentry`, never directly from
 *     `@sentry/nextjs`, keeping the surface area of the Sentry dependency to a
 *     single file.
 *
 * @see docs/SENTRY.md for setup, environment variables, and testing guidance.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SentryScope {
  setTag(key: string, value: string): void;
  setUser(user: { id?: string; username?: string } | null): void;
  setExtra(key: string, value: unknown): void;
  setLevel(level: SentryLevel): void;
}

export type SentryLevel = "debug" | "info" | "warning" | "error" | "fatal";

export interface SentryClient {
  captureException(error: unknown, context?: Record<string, unknown>): string;
  captureMessage(message: string, level?: SentryLevel): string;
  withScope(callback: (scope: SentryScope) => void): void;
  setUser(user: { id?: string; username?: string } | null): void;
  flush(timeout?: number): Promise<boolean>;
}

// ---------------------------------------------------------------------------
// No-op stub (used when NEXT_PUBLIC_SENTRY_DSN is absent)
// ---------------------------------------------------------------------------

const noop = (): void => undefined;

const noopScope: SentryScope = {
  setTag: noop,
  setUser: noop,
  setExtra: noop,
  setLevel: noop,
};

const noopClient: SentryClient = {
  captureException: () => "",
  captureMessage: () => "",
  withScope: (cb) => cb(noopScope),
  setUser: noop,
  flush: async () => true,
};

// ---------------------------------------------------------------------------
// Client resolution
// ---------------------------------------------------------------------------

/**
 * Returns the resolved Sentry client.
 *
 * When `NEXT_PUBLIC_SENTRY_DSN` is set the real `@sentry/nextjs` package is
 * used; otherwise the no-op stub is returned so callers never need to null-
 * check the result.
 *
 * The dynamic `require()` is intentional: it allows the package to be an
 * optional peer dependency (not listed in `dependencies`) so that teams that
 * don't want Sentry can simply omit the DSN without an install-time error.
 */
function resolveClient(): SentryClient {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  if (!dsn) return noopClient;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Sentry = require("@sentry/nextjs") as {
      captureException: (error: unknown, context?: Record<string, unknown>) => string | undefined;
      captureMessage: (message: string, level?: string) => string | undefined;
      withScope: (cb: (scope: {
        setTag(k: string, v: string): void;
        setUser(u: { id?: string; username?: string } | null): void;
        setExtra(k: string, v: unknown): void;
        setLevel(l: string): void;
      }) => void) => void;
      setUser: (u: { id?: string; username?: string } | null) => void;
      flush: (timeout?: number) => Promise<boolean>;
    };
    return {
      captureException: (error, context) => {
        return Sentry.captureException(error, context) ?? "";
      },
      captureMessage: (message, level = "info") => {
        return Sentry.captureMessage(message, level) ?? "";
      },
      withScope: (cb) => {
        Sentry.withScope((scope) => {
          cb({
            setTag: (k, v) => scope.setTag(k, v),
            setUser: (u) => scope.setUser(u),
            setExtra: (k, v) => scope.setExtra(k, v),
            setLevel: (l) => scope.setLevel(l),
          });
        });
      },
      setUser: (u) => Sentry.setUser(u),
      flush: (timeout) => Sentry.flush(timeout),
    };
  } catch {
    // @sentry/nextjs is not installed — fall back to no-op.
    return noopClient;
  }
}

// Singleton so the DSN check and require() happen at most once per process.
let _client: SentryClient | null = null;

function getClient(): SentryClient {
  if (!_client) _client = resolveClient();
  return _client;
}

// Exposed for tests that need to reset the singleton between runs.
export function _resetSentryClient(): void {
  _client = null;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

/**
 * Report an unhandled exception to Sentry.
 *
 * @param error   The caught value (ideally an `Error` instance).
 * @param context Optional key/value pairs attached to the event as "extra"
 *                data (e.g. `{ route: "/api/contributors", userId: "u_123" }`).
 * @returns       The Sentry event id, or an empty string when Sentry is
 *                unconfigured.
 *
 * @example
 * ```ts
 * try {
 *   await riskyOperation();
 * } catch (err) {
 *   captureException(err, { route: "/api/register" });
 *   return NextResponse.json({ error: "Internal error" }, { status: 500 });
 * }
 * ```
 */
export function captureException(
  error: unknown,
  context?: Record<string, unknown>
): string {
  return getClient().captureException(error, context);
}

/**
 * Send an informational message (not an exception) to Sentry.
 *
 * @param message Human-readable description of the event.
 * @param level   Sentry severity level. Defaults to `"info"`.
 * @returns       The Sentry event id, or an empty string when unconfigured.
 */
export function captureMessage(
  message: string,
  level: SentryLevel = "info"
): string {
  return getClient().captureMessage(message, level);
}

/**
 * Capture an exception with additional scope data (tags, user, level).
 *
 * Prefer `captureException` for the common case; use this only when you need
 * to attach extra metadata that shouldn't bleed into other events.
 *
 * @example
 * ```ts
 * captureExceptionWithScope(err, { id: session.user.id }, { route: "/api/check" }, "error");
 * ```
 */
export function captureExceptionWithScope(
  error: unknown,
  user: { id?: string; username?: string } | null,
  tags: Record<string, string> = {},
  level: SentryLevel = "error"
): string {
  let eventId = "";
  getClient().withScope((scope) => {
    scope.setUser(user);
    scope.setLevel(level);
    for (const [k, v] of Object.entries(tags)) {
      scope.setTag(k, v);
    }
    eventId = getClient().captureException(error);
  });
  return eventId;
}

/**
 * Associate a user with subsequent Sentry events for the current hub/scope.
 * Call this on sign-in; pass `null` to clear on sign-out.
 */
export function setSentryUser(
  user: { id?: string; username?: string } | null
): void {
  getClient().setUser(user);
}

/**
 * Flush pending Sentry events before a serverless function terminates.
 * Call this at the end of long-running background tasks or in `onRequestEnd`
 * middleware hooks.
 */
export async function flushSentry(timeoutMs = 2000): Promise<boolean> {
  return getClient().flush(timeoutMs);
}

/**
 * `true` when a real Sentry DSN is configured and events will actually be
 * sent to sentry.io. Useful for conditional log messages in development.
 */
export function isSentryEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN?.trim());
}
