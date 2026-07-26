import { describe, it, expect, vi, beforeEach } from "vitest";
import { StructuredLogger, createRequestLogger } from "@/lib/logger";

describe("StructuredLogger", () => {
  let consoleSpy: any;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("formats info logs with correct structure", () => {
    const logger = new StructuredLogger("test-context");
    logger.info("test message", { key: "value" });

    expect(consoleSpy).toHaveBeenCalledOnce();
    const call = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(call);

    expect(parsed).toMatchObject({
      level: "info",
      context: "test-context",
      message: "test message",
      details: { key: "value" },
    });
    expect(parsed.timestamp).toBeDefined();
  });

  it("logs without details when not provided", () => {
    const logger = new StructuredLogger("test-context");
    logger.info("simple message");

    const call = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(call);

    expect(parsed.details).toBeUndefined();
    expect(parsed.message).toBe("simple message");
  });

  it("respects different log levels", () => {
    const logger = new StructuredLogger("test-context");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.info("info message");
    logger.warn("warn message");
    logger.error("error message");

    const infoLog = JSON.parse(consoleSpy.mock.calls[0][0]);
    const warnLog = JSON.parse(warnSpy.mock.calls[0][0]);
    const errorLog = JSON.parse(errorSpy.mock.calls[0][0]);

    expect(infoLog.level).toBe("info");
    expect(warnLog.level).toBe("warn");
    expect(errorLog.level).toBe("error");

    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it("logs debug messages only when DEBUG env var is set", () => {
    const originalDebug = process.env.DEBUG;
    process.env.DEBUG = "false";

    const logger = new StructuredLogger("test-context");
    logger.debug("debug message");

    expect(consoleSpy).not.toHaveBeenCalled();

    process.env.DEBUG = "true";
    logger.debug("debug message 2");

    expect(consoleSpy).toHaveBeenCalledOnce();

    if (originalDebug === undefined) {
      delete process.env.DEBUG;
    } else {
      process.env.DEBUG = originalDebug;
    }
  });
});

describe("createRequestLogger", () => {
  it("returns a function that logs request details", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const logger = createRequestLogger("api");

    const mockRequest = {
      method: "POST",
      nextUrl: {
        pathname: "/api/check",
        searchParams: new URLSearchParams(),
      },
      headers: new Map([
        ["user-agent", "test-agent"],
        ["origin", "http://localhost:3000"],
      ]),
    };

    logger(mockRequest as any);

    expect(consoleSpy).toHaveBeenCalled();
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);

    expect(parsed.message).toBe("incoming_request");
    expect(parsed.details).toMatchObject({
      method: "POST",
      pathname: "/api/check",
      userAgent: "test-agent",
      origin: "http://localhost:3000",
    });

    consoleSpy.mockRestore();
  });
});
