import type { HorizonCheckResult } from "@/types";

/** Pure helpers — safe for client and server; no stellar-sdk. */

export type WizardAction =
  | "fund_account"
  | "add_trustline"
  | "increase_reserve"
  | "none";

export interface ActionLookupResult extends HorizonCheckResult {
  nextAction: WizardAction;
}

export const WIZARD_ACTION_COPY: Record<WizardAction, string> = {
  fund_account:
    "Fund your Stellar account with at least 1 XLM to create it on-network.",
  add_trustline:
    "Add a USDC trustline — your account can't receive Wave payouts without it.",
  increase_reserve:
    "Add more XLM. Your balance is below the configured minimum reserve.",
  none: "You're ready for Wave payouts.",
};

export function computeNextAction(
  result: Pick<HorizonCheckResult, "funded" | "trustline" | "readiness">
): WizardAction {
  if (!result.funded) return "fund_account";
  if (!result.trustline) return "add_trustline";
  if (result.readiness === "low_reserve") return "increase_reserve";
  return "none";
}

export function buildActionLookupResult(
  result: HorizonCheckResult
): ActionLookupResult {
  return {
    ...result,
    nextAction: computeNextAction(result),
  };
}
