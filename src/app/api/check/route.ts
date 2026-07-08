import { NextRequest } from "next/server";

import { jsonCheckError, jsonCheckResult } from "@/lib/check-api";
import { DEFAULT_ASSET } from "@/lib/constants";
import { checkStellarAddress } from "@/lib/horizon";
import type { CheckAddressPayload } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckAddressPayload;
    const address = body.address?.trim();

    if (!address) {
      return jsonCheckError(["Address is required"], 400);
    }

    const result = await checkStellarAddress(
      address,
      body.asset_code ?? DEFAULT_ASSET.code,
      body.asset_issuer ?? DEFAULT_ASSET.issuer
    );

    return jsonCheckResult(result);
  } catch {
    return jsonCheckError(["Failed to check address"], 500);
  }
}
