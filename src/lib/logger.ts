import { NextRequest, NextResponse } from "next/server";

export interface StructuredLog {
  timestamp: string;
  level: "info" | "warn" | "error" | "debug";
  context: string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Structured logging utility for request/response tracking and debugging.
 * Logs are emitted to stdout in JSON format for aggregation and analysis.
 */
export class StructuredLogger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatLog(
    level: StructuredLog["level"],
    message: string,
    details?: Record<string, unknown>
  ): StructuredLog {
    return {
      timestamp: new Date().toISOString(),
      level,
      context: this.context,
      message,
      details,
    };
  }

  info(message: string, details?: Record<string, unknown>) {
    const log = this.formatLog("info", message, details);
    console.log(JSON.stringify(log));
  }

  warn(message: string, details?: Record<string, unknown>) {
    const log = this.formatLog("warn", message, details);
    console.warn(JSON.stringify(log));
  }

  error(message: string, details?: Record<string, unknown>) {
    const log = this.formatLog("error", message, details);
    console.error(JSON.stringify(log));
  }

  debug(message: string, details?: Record<string, unknown>) {
    const log = this.formatLog("debug", message, details);
    const debugFlag = process.env.DEBUG?.trim().toLowerCase();
    // Treat unset / empty / explicit falsey values as off; only truthy flags enable debug.
    if (debugFlag && debugFlag !== "0" && debugFlag !== "false" && debugFlag !== "off") {
      console.log(JSON.stringify(log));
    }
  }
}

/**
 * Middleware for logging incoming requests with structured format.
 * Logs method, path, origin, and user agent.
 */
export function createRequestLogger(context: string) {
  const logger = new StructuredLogger(context);

  return function logRequest(request: NextRequest) {
    const method = request.method;
    const pathname = request.nextUrl.pathname;
    const searchParams = request.nextUrl.searchParams.toString();
    const userAgent = request.headers.get("user-agent") ?? "unknown";
    const origin = request.headers.get("origin") ?? "unknown";

    logger.info("incoming_request", {
      method,
      pathname,
      searchParams: searchParams ? searchParams : undefined,
      userAgent,
      origin,
    });
  };
}

/**
 * Log API response with status, duration, and optional error details.
 */
export function logResponse(
  logger: StructuredLogger,
  response: NextResponse,
  duration: number,
  details?: Record<string, unknown>
) {
  logger.info("outgoing_response", {
    status: response.status,
    duration: `${duration}ms`,
    ...details,
  });
}

/**
 * Log Horizon API call with request/response details.
 */
export function logHorizonCall(
  logger: StructuredLogger,
  method: string,
  endpoint: string,
  duration: number,
  success: boolean,
  error?: string
) {
  if (success) {
    logger.info("horizon_request_success", {
      method,
      endpoint,
      duration: `${duration}ms`,
    });
  } else {
    logger.error("horizon_request_failed", {
      method,
      endpoint,
      duration: `${duration}ms`,
      error,
    });
  }
}

/**
 * Log database query with operation type and duration.
 */
export function logDatabaseQuery(
  logger: StructuredLogger,
  operation: string,
  duration: number,
  rowsAffected?: number
) {
  logger.debug("database_query", {
    operation,
    duration: `${duration}ms`,
    rowsAffected,
  });
}
