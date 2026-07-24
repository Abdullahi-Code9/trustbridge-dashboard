import { describe, expect, it } from "vitest";

import {
  buildCheckResult,
  computeReadiness,
  computeVerified,
} from "@/lib/readiness";

describe("computeReadiness", () => {
  const opts = { minimumBalance: 1 };

  it("is ready when funded, authorized trustline, and reserve met", () => {
    expect(
      computeReadiness(true, true, "5", { ...opts, authorized: true })
    ).toBe("ready");
  });

  it("is low_reserve when balance is below the minimum", () => {
    expect(
      computeReadiness(true, true, "0.5", { ...opts, authorized: true })
    ).toBe("low_reserve");
  });

  it("is not_ready when the trustline is present but unauthorized", () => {
    expect(
      computeReadiness(true, true, "5", { ...opts, authorized: false })
    ).toBe("not_ready");
  });

  it("is not_ready when unfunded or missing a trustline", () => {
    expect(computeReadiness(false, false, "0", opts)).toBe("not_ready");
    expect(computeReadiness(true, false, "5", opts)).toBe("not_ready");
  });

  it("assumes authorized when not specified (backward compatible)", () => {
    expect(computeReadiness(true, true, "5", opts)).toBe("ready");
  });
});

describe("computeVerified", () => {
  it("is true only when funded, trustline present, and authorized", () => {
    expect(computeVerified(true, true, true)).toBe(true);
    expect(computeVerified(true, true, false)).toBe(false);
    expect(computeVerified(true, false, true)).toBe(false);
    expect(computeVerified(false, true, true)).toBe(false);
  });
});

describe("buildCheckResult", () => {
  it("populates authorization and verified for a healthy account", () => {
    const result = buildCheckResult(true, true, "10", [], true);
    expect(result.trustline_authorized).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.readiness).toBe("ready");
  });

  it("marks an unauthorized trustline as unverified and not_ready", () => {
    const result = buildCheckResult(true, true, "10", [], false);
    expect(result.trustline_authorized).toBe(false);
    expect(result.verified).toBe(false);
    expect(result.readiness).toBe("not_ready");
  });

  it("defaults authorization to the trustline presence", () => {
    expect(buildCheckResult(false, false, "0").trustline_authorized).toBe(false);
  });
});
