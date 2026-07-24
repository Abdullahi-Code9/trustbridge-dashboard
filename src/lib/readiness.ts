import { MIN_XLM_BALANCE } from "@/lib/constants";
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

export interface ReadinessOptions {
  minimumBalance?: number;
  /**
   * Whether the trustline is authorized by the asset issuer. A trustline that
   * is present but unauthorized cannot receive the asset, so it is treated as
   * not ready. Defaults to `true` for callers that do not track authorization.
   */
  authorized?: boolean;
}

export function computeReadiness(
  funded: boolean,
  trustline: boolean,
  xlm_balance: string,
  options: ReadinessOptions = {}
): ReadinessStatus {
  const { minimumBalance = MIN_XLM_BALANCE, authorized = true } = options;
  const balance = parseXlmBalance(xlm_balance);

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
  trustlineAuthorized: boolean = trustline
): HorizonCheckResult {
  const balance = String(xlm_balance ?? "0");
  return {
    funded,
    trustline,
    trustline_authorized: trustlineAuthorized,
    verified: computeVerified(funded, trustline, trustlineAuthorized),
    xlm_balance: balance,
    errors,
    readiness: computeReadiness(funded, trustline, balance, {
      authorized: trustlineAuthorized,
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
