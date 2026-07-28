import { BASE_RESERVE_XLM, MIN_XLM_BALANCE } from "@/lib/constants";
import type { HorizonCheckResult, ReadinessStatus } from "@/types";

export interface ReadinessDisplayConfig {
  label: string;
  variant: "ready" | "warning" | "danger";
  icon: string;
  description: string;
}

/** Pure helpers — safe for client and server; no stellar-sdk. */

export function parseXlmBalance(xlmBalance: string): number {
  const parsed = Number.parseFloat(xlmBalance ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

export interface SpendableBalanceOptions {
  /** XLM reserved per subentry/sponsorship unit. Defaults to `BASE_RESERVE_XLM`. */
  baseReserve?: number;
  subentryCount?: number;
  numSponsoring?: number;
  numSponsored?: number;
  /** Native balance line's `selling_liabilities`, if any (not spendable). */
  sellingLiabilities?: string;
}

/**
 * Every Stellar account must keep a minimum reserve of
 * `baseReserve * (2 + subentries + sponsoring - sponsored)` locked up, and
 * any XLM committed to open sell offers (`selling_liabilities`) is likewise
 * unavailable for payments. The raw native balance therefore overstates what
 * an account can actually spend — this computes the true spendable amount.
 */
export function computeSpendableXlmBalance(
  rawBalance: string,
  opts: SpendableBalanceOptions = {}
): string {
  const {
    baseReserve = BASE_RESERVE_XLM,
    subentryCount = 0,
    numSponsoring = 0,
    numSponsored = 0,
    sellingLiabilities = "0",
  } = opts;

  const raw = parseXlmBalance(rawBalance);
  const liabilities = parseXlmBalance(sellingLiabilities);
  const reserveUnits = 2 + subentryCount + numSponsoring - numSponsored;
  const reserve = baseReserve * Math.max(0, reserveUnits);

  const spendable = raw - reserve - liabilities;
  return Math.max(0, spendable).toFixed(7);
}

export interface ReadinessOptions {
  minimumBalance?: number;
  /**
   * Whether the trustline is authorized by the asset issuer. A trustline that
   * is present but unauthorized cannot receive the asset, so it is treated as
   * not ready. Defaults to `true` for callers that do not track authorization.
   */
  authorized?: boolean;
  /**
   * Spendable XLM balance (raw balance minus reserve and liabilities). When
   * provided, this is used for the reserve check instead of the raw balance.
   */
  spendableBalance?: string;
}

export function computeReadiness(
  funded: boolean,
  trustline: boolean,
  xlm_balance: string,
  options: ReadinessOptions = {}
): ReadinessStatus {
  const { minimumBalance = MIN_XLM_BALANCE, authorized = true, spendableBalance } = options;
  const balance = parseXlmBalance(
    spendableBalance !== undefined ? spendableBalance : xlm_balance
  );

  // A present-but-unauthorized trustline still fails payments.
  if (funded && trustline && !authorized) return "not_ready";

  if (funded && trustline && balance < minimumBalance) {
    return "low_reserve";
  }
  if (funded && trustline) return "ready";

  return "not_ready";
}

/** On-chain verified: funded, trustline present, and issuer-authorized. */
export function computeVerified(
  funded: boolean,
  trustline: boolean,
  authorized: boolean
): boolean {
  return funded && trustline && authorized;
}

export function buildCheckResult(
  funded: boolean,
  trustline: boolean,
  xlm_balance: string,
  errors: string[] = [],
  trustlineAuthorized: boolean = trustline,
  spendableXlmBalance?: string,
  usdcBalance?: string,
  horizonLatencyMs?: number
): HorizonCheckResult {
  const balance = String(xlm_balance ?? "0");
  const spendableBalance =
    spendableXlmBalance !== undefined ? String(spendableXlmBalance) : balance;
  const assetBalance = String(usdcBalance ?? "0");
  return {
    funded,
    trustline,
    trustline_authorized: trustlineAuthorized,
    verified: computeVerified(funded, trustline, trustlineAuthorized),
    xlm_balance: balance,
    spendable_xlm_balance: spendableBalance,
    usdc_balance: assetBalance,
    horizon_latency_ms: horizonLatencyMs,
    errors,
    readiness: computeReadiness(funded, trustline, balance, {
      authorized: trustlineAuthorized,
      spendableBalance,
    }),
  };
}

export function getReadinessTone(
  status: ReadinessStatus
): "success" | "warning" | "danger" {
  if (status === "ready") return "success";
  if (status === "low_reserve") return "warning";
  return "danger";
}

export function getHorizonErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown Horizon error";
}

export function isAccountNotFoundError(message: string): boolean {
  const normalized = message.toLowerCase();
  return message.includes("404") || normalized.includes("not found");
}

export function buildNotFoundCheckResult(): HorizonCheckResult {
  return buildCheckResult(false, false, "0", [
    "Account not found on the Stellar network (not funded)",
  ]);
}

export const READINESS_CONFIG: Record<ReadinessStatus, ReadinessDisplayConfig> = {
  ready: {
    label: "Ready",
    variant: "ready",
    icon: "✅",
    description: "Funded, trustline present, and reserve met",
  },
  low_reserve: {
    label: "Low Reserve",
    variant: "warning",
    icon: "⚠️",
    description: "Trustline ready but XLM reserve is below the minimum",
  },
  not_ready: {
    label: "Not Ready",
    variant: "danger",
    icon: "❌",
    description: "Missing funding and/or required trustline",
  },
};

export function getReadinessConfig(status: ReadinessStatus): ReadinessDisplayConfig {
  return READINESS_CONFIG[status];
}

export function getRowAccent(status: ReadinessStatus): string {
  switch (status) {
    case "ready":
      return "border-l-4 border-l-emerald-500";
    case "low_reserve":
      return "border-l-4 border-l-amber-500";
    case "not_ready":
      return "border-l-4 border-l-red-500";
  }
}

export function describeReadiness(status: ReadinessStatus): string {
  return getReadinessConfig(status).description;
}
