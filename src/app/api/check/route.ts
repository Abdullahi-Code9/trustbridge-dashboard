import { NextRequest, NextResponse } from "next/server";

import { DEFAULT_ASSET } from "@/lib/constants";
import { checkStellarAddress } from "@/lib/horizon";
import type { CheckAddressPayload } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as CheckAddressPayload;
    const address = body.address?.trim();

    if (!address) {
      return NextResponse.json(
        {
          funded: false,
          trustline: false,
          xlm_balance: "0",
          errors: ["Address is required"],
          readiness: "not_ready",
        },
        { status: 400 }
      );
    }

    const result = await checkStellarAddress(
      address,
      body.asset_code ?? DEFAULT_ASSET.code,
      body.asset_issuer ?? DEFAULT_ASSET.issuer
    );

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      {
        funded: false,
        trustline: false,
        xlm_balance: "0",
        errors: ["Failed to check address"],
        readiness: "not_ready",
      },
      { status: 500 }
    );
  }
}
