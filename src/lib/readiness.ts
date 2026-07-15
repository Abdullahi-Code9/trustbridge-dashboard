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

export function computeReadiness(
  funded: boolean,
  trustline: boolean,
  xlm_balance: string,
  minimumBalance = MIN_XLM_BALANCE
): ReadinessStatus {
  const balance = parseXlmBalance(xlm_balance);

  if (funded && trustline && balance < minimumBalance) {
    return "low_reserve";
  }
  if (funded && trustline) return "ready";
  if (funded && !trustline) return "not_ready";

  return "not_ready";
}

export function buildCheckResult(
  funded: boolean,
  trustline: boolean,
  xlm_balance: string,
  errors: string[] = []
): HorizonCheckResult {
  return {
    funded,
    trustline,
    xlm_balance: String(xlm_balance ?? "0"),
    errors,
    readiness: computeReadiness(funded, trustline, String(xlm_balance ?? "0")),
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
