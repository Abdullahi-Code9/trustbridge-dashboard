/**
 * Analytics adapter for TrustBridge Dashboard.
 *
 * Provides a simple interface for tracking product events.
 * Defaults to a no-op when no analytics key is configured.
 *
 * Supported adapters:
 * - PostHog (if POSTHOG_API_KEY is set)
 * - Console logging (fallback for development)
 * - No-op (default when no key is configured)
 */

export type EventType =
  | "registration_created"
  | "registration_updated"
  | "recheck_completed"
  | "batch_recheck_started"
  | "csv_exported"
  | "soroban_mirror_completed";

export interface AnalyticsEvent {
  type: EventType;
  timestamp: number;
  properties?: Record<string, unknown>;
}

interface AnalyticsAdapter {
  track(event: EventType, properties?: Record<string, unknown>): void;
  identify(userId: string, properties?: Record<string, unknown>): void;
  reset(): void;
}

/**
 * No-op adapter — used when no analytics key is configured.
 */
class NoOpAdapter implements AnalyticsAdapter {
  track(): void {
    // No-op
  }
  identify(): void {
    // No-op
  }
  reset(): void {
    // No-op
  }
}

/**
 * Console adapter — logs events to the console for development.
 */
class ConsoleAdapter implements AnalyticsAdapter {
  track(event: EventType, properties?: Record<string, unknown>): void {
    console.log(`[Analytics] ${event}`, properties);
  }
  identify(userId: string, properties?: Record<string, unknown>): void {
    console.log(`[Analytics] identify: ${userId}`, properties);
  }
  reset(): void {
    console.log("[Analytics] reset");
  }
}

/**
 * PostHog adapter — sends events to PostHog.
 * Requires POSTHOG_API_KEY and optionally POSTHOG_HOST.
 */
class PostHogAdapter implements AnalyticsAdapter {
  private apiKey: string;
  private host: string;
  private initialized = false;

  constructor(apiKey: string, host?: string) {
    this.apiKey = apiKey;
    this.host = host || "https://app.posthog.com";
  }

  private async init(): Promise<void> {
    if (this.initialized) return;

    try {
      const posthog = await import("posthog-js").then((m) => m.default);
      posthog.init(this.apiKey, {
        api_host: this.host,
        autocapture: false,
        capture_pageview: false,
        capture_pageleave: false,
      });
      this.initialized = true;
    } catch {
      console.warn("[Analytics] Failed to initialize PostHog");
    }
  }

  async track(event: EventType, properties?: Record<string, unknown>): Promise<void> {
    await this.init();
    try {
      const posthog = await import("posthog-js").then((m) => m.default);
      posthog.capture(event, properties);
    } catch {
      // Silently ignore — analytics should never block the user
    }
  }

  async identify(userId: string, properties?: Record<string, unknown>): Promise<void> {
    await this.init();
    try {
      const posthog = await import("posthog-js").then((m) => m.default);
      posthog.identify(userId, properties);
    } catch {
      // Silently ignore
    }
  }

  async reset(): Promise<void> {
    try {
      const posthog = await import("posthog-js").then((m) => m.default);
      posthog.reset();
    } catch {
      // Silently ignore
    }
  }
}

/**
 * Get the analytics adapter instance.
 * Returns a no-op adapter when no key is configured.
 */
function getAnalyticsAdapter(): AnalyticsAdapter {
  if (typeof window === "undefined") {
    // Server-side: no-op
    return new NoOpAdapter();
  }

  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_API_KEY?.trim();
  if (posthogKey) {
    return new PostHogAdapter(posthogKey, process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim());
  }

  // Development fallback: console logging
  if (process.env.NODE_ENV === "development") {
    return new ConsoleAdapter();
  }

  return new NoOpAdapter();
}

const adapter = getAnalyticsAdapter();

/**
 * Track a registration event.
 */
export function trackRegistrationCreated(properties?: {
  userId?: string;
  stellarAddress?: string;
}): void {
  adapter.track("registration_created", properties);
}

/**
 * Track a registration update event.
 */
export function trackRegistrationUpdated(properties?: {
  userId?: string;
  stellarAddress?: string;
  fieldsChanged?: string[];
}): void {
  adapter.track("registration_updated", properties);
}

/**
 * Track a recheck completion event.
 */
export function trackRecheckCompleted(properties?: {
  totalChecked?: number;
  changed?: number;
  durationMs?: number;
}): void {
  adapter.track("recheck_completed", properties);
}

/**
 * Track a batch recheck start event.
 */
export function trackBatchRecheckStarted(properties?: {
  totalRegistrations?: number;
}): void {
  adapter.track("batch_recheck_started", properties);
}

/**
 * Track a CSV export event.
 */
export function trackCsvExported(properties?: {
  rowCount?: number;
}): void {
  adapter.track("csv_exported", properties);
}

/**
 * Track a Soroban mirror completion event.
 */
export function trackSorobanMirrorCompleted(properties?: {
  success?: boolean;
  txHash?: string;
  durationMs?: number;
}): void {
  adapter.track("soroban_mirror_completed", properties);
}

/**
 * Identify a user for analytics.
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  adapter.identify(userId, properties);
}

/**
 * Reset analytics state (e.g., on logout).
 */
export function resetAnalytics(): void {
  adapter.reset();
}
