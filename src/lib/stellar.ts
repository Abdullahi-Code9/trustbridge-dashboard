import { StrKey } from "stellar-sdk";

import { MIN_XLM_BALANCE } from "@/lib/constants";
import type { HorizonCheckResult, ReadinessStatus } from "@/types";

export function normalizeStellarAddress(address: string): string {
  return address.trim();
}

export function isValidStellarAddress(address: string): boolean {
  try {
    return StrKey.isValidEd25519PublicKey(normalizeStellarAddress(address));
  } catch {
    return false;
  }
}

export function parseXlmBalance(xlmBalance: string): number {
  const parsed = Number.parseFloat(xlmBalance ?? "0");
  return Number.isFinite(parsed) ? parsed : 0;
}

export function buildCheckResult(
  funded: boolean,
  trustline: boolean,
  xlm_balance: string,
  errors: string[] = []
): HorizonCheckResult {
  let readiness: ReadinessStatus = "not_ready";

  readiness = computeReadiness(funded, trustline, String(xlm_balance ?? "0"));

  return {
    funded,
    trustline,
    xlm_balance: String(xlm_balance ?? "0"),
    errors,
    readiness,
  };
}

export function computeReadiness(
  funded: boolean,
  trustline: boolean,
  xlm_balance: string,
  minimumBalance = MIN_XLM_BALANCE
): ReadinessStatus {
  const balance = parseXlmBalance(xlm_balance);

  if (funded && trustline && !Number.isNaN(balance) && balance < minimumBalance) {
    return "low_reserve";
  }
  if (funded && trustline) return "ready";
  if (funded && !trustline) return "not_ready";

  return "not_ready";
}
