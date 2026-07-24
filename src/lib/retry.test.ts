import { describe, expect, it, vi } from "vitest";

import { withRetry } from "@/lib/retry";

const noSleep = () => Promise.resolve();

describe("withRetry", () => {
  it("returns immediately on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    await expect(withRetry(fn, { sleep: noSleep })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures then succeeds", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValue("ok");

    await expect(
      withRetry(fn, { attempts: 3, sleep: noSleep })
    ).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("throws the last error after exhausting attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always"));
    await expect(
      withRetry(fn, { attempts: 2, sleep: noSleep })
    ).rejects.toThrow("always");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("fails fast when shouldRetry returns false", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("404 not found"));
    await expect(
      withRetry(fn, {
        attempts: 5,
        sleep: noSleep,
        shouldRetry: (e) => !String(e).includes("404"),
      })
    ).rejects.toThrow("404");
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
