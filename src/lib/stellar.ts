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

export function buildCheckResult(
  funded: boolean,
  trustline: boolean,
  xlm_balance: string,
  errors: string[] = []
): HorizonCheckResult {
  const balance = parseFloat(xlm_balance ?? "0");

  let readiness: ReadinessStatus = "not_ready";

  if (funded && trustline) {
    readiness = "ready";
  } else if (funded && !trustline) {
    // If account is funded but has less than 1 XLM, suggest low reserve.
    if (!Number.isNaN(balance) && balance < 1) {
      readiness = "low_reserve";
    } else {
      readiness = "not_ready";
    }
  } else {
    readiness = "not_ready";
  }

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
  xlm_balance: string
): ReadinessStatus {
  const balance = parseFloat(xlm_balance ?? "0");

  if (funded && trustline) return "ready";
  if (funded && !trustline) {
    if (!Number.isNaN(balance) && balance < 1) return "low_reserve";
    return "not_ready";
  }

  return "not_ready";
}
