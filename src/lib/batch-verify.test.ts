import { describe, expect, it } from "vitest";

import {
  batchVerify,
  calculateVerificationSummary,
  filterByStatus,
  sortByReadiness,
  type VerificationCheckResult,
} from "@/lib/batch-verify";

function result(
  status: VerificationCheckResult["status"],
  username: string = status
): VerificationCheckResult {
  return {
    username,
    stellar_address: `G_${username}`,
    status,
    checks: { funded: true, trustline: true, reserve: true },
  };
}

describe("calculateVerificationSummary", () => {
  it("aggregates counts and percentages", () => {
    const summary = calculateVerificationSummary([
      result("ready"),
      result("ready"),
      result("low_reserve"),
      result("error"),
    ]);
    expect(summary.total).toBe(4);
    expect(summary.ready).toBe(2);
    expect(summary.readyPercentage).toBe(50);
    expect(summary.succeededPercentage).toBe(75);
  });

  it("avoids divide-by-zero for empty input", () => {
    expect(calculateVerificationSummary([]).readyPercentage).toBe(0);
  });
});

describe("sortByReadiness / filterByStatus", () => {
  it("orders ready first and errors last", () => {
    const sorted = sortByReadiness([
      result("error"),
      result("ready"),
      result("not_ready"),
    ]);
    expect(sorted.map((r) => r.status)).toEqual([
      "ready",
      "not_ready",
      "error",
    ]);
  });

  it("filters by a single status", () => {
    const filtered = filterByStatus(
      [result("ready"), result("error")],
      "error"
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].status).toBe("error");
  });
});

describe("batchVerify", () => {
  it("runs all verifications and captures thrown errors", async () => {
    const results = await batchVerify(
      [
        { username: "a", stellar_address: "G_a" },
        { username: "b", stellar_address: "G_b" },
      ],
      async (address) => {
        if (address === "G_b") throw new Error("horizon down");
        return result("ready", "a");
      },
      { concurrency: 2 }
    );

    expect(results).toHaveLength(2);
    const b = results.find((r) => r.username === "b");
    expect(b?.status).toBe("error");
    expect(b?.error_message).toBe("horizon down");
  });
});
