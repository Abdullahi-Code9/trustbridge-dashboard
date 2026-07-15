import "server-only";

import { Horizon } from "stellar-sdk";

import { DEFAULT_ASSET, DEFAULT_HORIZON_URL } from "@/lib/constants";
import {
  buildCheckResult,
  buildNotFoundCheckResult,
  getHorizonErrorMessage,
  isAccountNotFoundError,
} from "@/lib/readiness";
import {
  isValidStellarAddress,
  normalizeStellarAddress,
} from "@/lib/stellar";
import type { HorizonCheckResult } from "@/types";

function getHorizonServer(): Horizon.Server {
  const url =
    process.env.NEXT_PUBLIC_HORIZON_URL?.trim() || DEFAULT_HORIZON_URL;
  return new Horizon.Server(url);
}

export async function checkStellarAddress(
  address: string,
  assetCode: string = DEFAULT_ASSET.code,
  assetIssuer: string = DEFAULT_ASSET.issuer
): Promise<HorizonCheckResult> {
  const trimmed = normalizeStellarAddress(address);

  if (!trimmed) {
    return buildCheckResult(false, false, "0", ["Address is required"]);
  }

  if (!isValidStellarAddress(trimmed)) {
    return buildCheckResult(false, false, "0", [
      "Invalid Stellar public key (must be a valid G-address)",
    ]);
  }

  const server = getHorizonServer();
  const errors: string[] = [];

  try {
    const account = await server.loadAccount(trimmed);
    const xlmBalance =
      account.balances.find((b) => b.asset_type === "native")?.balance ??
      "0";

    const trustline = account.balances.some((balance) => {
      if (balance.asset_type === "native") return false;
      if (balance.asset_type === "liquidity_pool_shares") return false;
      return (
        "asset_code" in balance &&
        balance.asset_code === assetCode &&
        "asset_issuer" in balance &&
        balance.asset_issuer === assetIssuer
      );
    });

    return buildCheckResult(true, trustline, xlmBalance, errors);
  } catch (error) {
    const message = getHorizonErrorMessage(error);

    if (isAccountNotFoundError(message)) {
      return buildNotFoundCheckResult();
    }

    errors.push(`Horizon error: ${message}`);
    return buildCheckResult(false, false, "0", errors);
  }
}
