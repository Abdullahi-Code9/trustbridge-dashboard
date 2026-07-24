import { describe, expect, it } from "vitest";

import {
  buildCheckResult,
  computeReadiness,
  computeSpendableXlmBalance,
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

  it("falls back to the raw balance when spendableBalance is omitted", () => {
    expect(computeReadiness(true, true, "5", opts)).toBe("ready");
    expect(computeReadiness(true, true, "0.5", opts)).toBe("low_reserve");
  });

  it("is low_reserve when raw balance clears the minimum but spendable balance does not (reserve bug fix)", () => {
    // A contributor can hold plenty of raw XLM while their trustlines/offers
    // eat almost all of it via the Stellar minimum reserve — readiness must
    // key off the spendable amount, not the raw balance.
    const status = computeReadiness(true, true, "5", {
      ...opts,
      authorized: true,
      spendableBalance: "0.1",
    });
    expect(status).toBe("low_reserve");
    expect(status).not.toBe("ready");
  });

  it("is ready when spendable balance meets the minimum even if provided separately from raw balance", () => {
    expect(
      computeReadiness(true, true, "100", {
        ...opts,
        spendableBalance: "5",
      })
    ).toBe("ready");
  });
});

describe("computeSpendableXlmBalance", () => {
  it("subtracts the base account reserve (2x) when there are no subentries", () => {
    // A fresh account with no trustlines/offers/signers still locks up
    // baseReserve * 2 (the two "implicit" reserve units every account pays).
    expect(computeSpendableXlmBalance("10", { baseReserve: 0.5 })).toBe(
      "9.0000000"
    );
  });

  it("reduces spendable balance as subentries increase", () => {
    const noSubentries = computeSpendableXlmBalance("10", {
      baseReserve: 0.5,
      subentryCount: 0,
    });
    const withSubentries = computeSpendableXlmBalance("10", {
      baseReserve: 0.5,
      subentryCount: 5,
    });
    expect(Number(withSubentries)).toBeLessThan(Number(noSubentries));
    expect(withSubentries).toBe("6.5000000");
  });

  it("offsets subentries with sponsored reserves", () => {
    // Sponsored subentries don't cost the account its own reserve.
    const sponsored = computeSpendableXlmBalance("10", {
      baseReserve: 0.5,
      subentryCount: 4,
      numSponsored: 4,
    });
    expect(sponsored).toBe(computeSpendableXlmBalance("10", { baseReserve: 0.5 }));
  });

  it("floors at zero when the reserve exceeds the raw balance", () => {
    expect(
      computeSpendableXlmBalance("1", { baseReserve: 0.5, subentryCount: 10 })
    ).toBe("0.0000000");
  });

  it("subtracts selling liabilities from the spendable amount", () => {
    const withoutLiabilities = computeSpendableXlmBalance("10", {
      baseReserve: 0.5,
    });
    const withLiabilities = computeSpendableXlmBalance("10", {
      baseReserve: 0.5,
      sellingLiabilities: "3",
    });
    expect(withLiabilities).toBe("6.0000000");
    expect(Number(withLiabilities)).toBeLessThan(Number(withoutLiabilities));
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

  it("defaults spendable balance to the raw balance when not provided", () => {
    const result = buildCheckResult(true, true, "10", [], true);
    expect(result.spendable_xlm_balance).toBe("10");
  });

  it("uses the provided spendable balance for both the field and readiness", () => {
    const result = buildCheckResult(true, true, "10", [], true, "0.2");
    expect(result.spendable_xlm_balance).toBe("0.2");
    expect(result.readiness).toBe("low_reserve");
  });
});
