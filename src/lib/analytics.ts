/**
 * Analytics tracking for TrustBridge Dashboard.
 * Tracks user interactions, feature usage, and error rates.
 */

export type EventType =
  | 'user_registered'
  | 'verification_checked'
  | 'csv_exported'
  | 'batch_verified'
  | 'error_occurred'
  | 'page_viewed'
  | 'feature_used';

export interface AnalyticsEvent {
  type: EventType;
  timestamp: Date;
  userId?: string;
  metadata?: Record<string, unknown>;
  duration?: number; // milliseconds
}

export interface AnalyticsSession {
  sessionId: string;
  startedAt: Date;
  userId?: string;
  events: AnalyticsEvent[];
}

/**
 * Analytics tracker for dashboard metrics.
 */
export class AnalyticsTracker {
  private events: AnalyticsEvent[] = [];
  private currentSession?: AnalyticsSession;
  private readonly maxEvents: number;
  private eventCounters: Map<EventType, number> = new Map();

  constructor(maxEvents: number = 1000) {
    this.maxEvents = maxEvents;
  }

  /**
   * Start a new analytics session.
   */
  startSession(userId?: string): AnalyticsSession {
    this.currentSession = {
      sessionId: this.generateSessionId(),
      startedAt: new Date(),
      userId,
      events: [],
    };
    return this.currentSession;
  }

  /**
   * Track an event.
   */
  trackEvent(
    type: EventType,
    metadata?: Record<string, unknown>,
    duration?: number,
  ): AnalyticsEvent {
    const event: AnalyticsEvent = {
      type,
      timestamp: new Date(),
      userId: this.currentSession?.userId,
      metadata,
      duration,
    };

    this.events.push(event);
    if (this.currentSession) {
      this.currentSession.events.push(event);
    }

    // Increment counter
    const count = this.eventCounters.get(type) || 0;
    this.eventCounters.set(type, count + 1);

    // Keep only recent events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    return event;
  }

  /**
   * Get event count for a specific type.
   */
  getEventCount(type: EventType): number {
    return this.eventCounters.get(type) || 0;
  }

  /**
   * Get all events.
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Get events of a specific type.
   */
  getEventsByType(type: EventType): AnalyticsEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Get events from a time range.
   */
  getEventsSince(minutesAgo: number): AnalyticsEvent[] {
    const cutoff = Date.now() - minutesAgo * 60 * 1000;
    return this.events.filter((e) => e.timestamp.getTime() > cutoff);
  }

  /**
   * Calculate average duration for events.
   */
  getAverageDuration(type: EventType): number | null {
    const events = this.getEventsByType(type).filter((e) => e.duration !== undefined);
    if (events.length === 0) return null;

    const total = events.reduce((sum, e) => sum + (e.duration || 0), 0);
    return total / events.length;
  }

  /**
   * Get session summary.
   */
  getSessionSummary(): AnalyticsSession | null {
    return this.currentSession || null;
  }

  /**
   * Get analytics summary.
   */
  getSummary(): {
    totalEvents: number;
    eventCounts: Record<string, number>;
    recentEvents: number;
    averageDurations: Record<string, number>;
  } {
    const averageDurations: Record<string, number> = {};
    const eventTypes: EventType[] = Array.from(this.eventCounters.keys());

    for (const type of eventTypes) {
      const avg = this.getAverageDuration(type);
      if (avg !== null) {
        averageDurations[type] = Math.round(avg);
      }
    }

    return {
      totalEvents: this.events.length,
      eventCounts: Object.fromEntries(this.eventCounters),
      recentEvents: this.getEventsSince(5).length,
      averageDurations,
    };
  }

  /**
   * Export analytics as JSON.
   */
  toJSON(): string {
    return JSON.stringify(
      {
        summary: this.getSummary(),
        session: this.currentSession,
      },
      null,
      2,
    );
  }

  /**
   * Clear all analytics data.
   */
  clear(): void {
    this.events = [];
    this.eventCounters.clear();
    this.currentSession = undefined;
  }

  /**
   * Generate a unique session ID.
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}

/**
 * Global analytics tracker instance.
 */
export const analyticsTracker = new AnalyticsTracker();

/**
 * Helper to track page views.
 */
export function trackPageView(page: string): void {
  analyticsTracker.trackEvent('page_viewed', { page });
}

/**
 * Helper to track feature usage.
 */
export function trackFeatureUsage(feature: string, metadata?: Record<string, unknown>): void {
  analyticsTracker.trackEvent('feature_used', { feature, ...metadata });
}

/**
 * Helper to track errors.
 */
export function trackError(
  error: Error,
  context?: string,
): void {
  analyticsTracker.trackEvent('error_occurred', {
    error: error.message,
    context,
    stack: error.stack,
  });
}
