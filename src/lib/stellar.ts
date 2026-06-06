import { StrKey } from "stellar-sdk";

import { MIN_XLM_BALANCE } from "@/lib/constants";
import type { HorizonCheckResult, ReadinessStatus } from "@/types";

export function isValidStellarAddress(address: string): boolean {
  const trimmed = address.trim();
  if (!trimmed.startsWith("G")) return false;
  try {
    return StrKey.isValidEd25519PublicKey(trimmed);
  } catch {
    return false;
  }
}

export function computeReadiness(
  funded: boolean,
  trustline: boolean,
  xlmBalance: string
): ReadinessStatus {
  if (!funded || !trustline) return "not_ready";
  const balance = parseFloat(xlmBalance);
  if (Number.isNaN(balance) || balance < MIN_XLM_BALANCE) {
    return "low_reserve";
  }
  return "ready";
}

export function buildCheckResult(
  funded: boolean,
  trustline: boolean,
  xlmBalance: string,
  errors: string[] = []
): HorizonCheckResult {
  return {
    funded,
    trustline,
    xlm_balance: xlmBalance,
    errors,
    readiness: computeReadiness(funded, trustline, xlmBalance),
  };
}
